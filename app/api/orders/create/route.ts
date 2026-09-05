import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface OrderItemRecord {
  id?: string;
  orderId?: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  lineTotal: number;
  image: string | null;
}

function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `KM-${dateStr}-${randomStr}`;
}

export async function POST(request: Request) {
  try {
    // Rate limit order creation to prevent stock depletion attacks
    const ip = getClientIp(request);
    const rl = checkRateLimit(`order-create:${ip}`, RATE_LIMITS.orderCreate);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many order attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { customer_name, customer_phone, customer_email, shipping_address, items, payment_mode } = body;
    const channel = "ONLINE"; // Always ONLINE for public API — OFFLINE only via POS/admin

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Allow COD / Pay on Delivery for customer convenience and testing
    const isCod = payment_mode?.toLowerCase() === "cod" || payment_mode?.toLowerCase() === "cash on delivery";

    const productIds = items.map((item: Record<string, unknown>) => item.product_id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from("Product")
      .select("id, name, sellingPrice, costPrice, ProductVariant ( id, name, sellingPriceOverride )")
      .in("id", productIds);

    if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 });

    const productMap: Record<string, Record<string, unknown>> = {};
    (products || []).forEach((p: Record<string, unknown>) => {
      productMap[p.id as string] = p;
    });

    let subtotal = 0;

    const orderItems: OrderItemRecord[] = items.map((item: Record<string, unknown>) => {
      const product = productMap[item.product_id as string];
      if (!product) throw new Error(`Product ${item.product_id} not found`);

      const variants = (product.ProductVariant as Record<string, unknown>[]) || [];
      let matchedVariant = variants.find((v) => v.id === item.variant_id);
      if (!matchedVariant && variants.length > 0) {
        matchedVariant = variants[0];
      }

      const unitPrice = (matchedVariant?.sellingPriceOverride != null)
        ? (matchedVariant.sellingPriceOverride as number)
        : (product.sellingPrice as number);
      const costPrice = (product.costPrice as number) || 0;
      const lineTotal = unitPrice * (item.quantity as number);

      subtotal += lineTotal;

      return {
        productId: item.product_id,
        variantId: matchedVariant ? matchedVariant.id : (item.variant_id || "default"),
        productName: product.name as string,
        variantName: (matchedVariant?.name as string) || (item.variant_name as string) || "Standard",
        unitPrice,
        costPrice,
        quantity: item.quantity as number,
        lineTotal,
        image: (item.image as string) || null,
      };
    });

    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();
    const orderId = `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // CHANGED: "orders"→"Order", all column names camelCase
    const { data: order, error: orderError } = await supabaseAdmin
      .from("Order")
      .insert([{
        id: orderId,
        orderNumber,
        channel,
        status: isCod ? "CONFIRMED" : "PENDING",
        customerName: customer_name,
        customerPhone: customer_phone,
        customerEmail: customer_email || null,
        shippingAddress: shipping_address,
        subtotal,
        discount: 0,
        total: subtotal,
        paymentStatus: isCod ? "PENDING" : "PENDING",
        paymentMode: isCod ? "cod" : (payment_mode || "prepaid"),
        updatedAt: now,
        timeline: [
          { status: "PENDING", timestamp: now, note: isCod ? "Order placed (Cash on Delivery)" : "Order placed by customer" }
        ],
      }])
      .select()
      .single();

    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

    // Insert OrderItems with explicit IDs
    const itemsData = orderItems.map((item, idx) => ({
      id: `item-${order.id}-${idx}`,
      ...item,
      orderId: order.id,
    }));
    const { error: itemsError } = await supabaseAdmin.from("OrderItem").insert(itemsData);

    if (itemsError) {
      await supabaseAdmin.from("Order").delete().eq("id", order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Deduct stock for each purchased item
    for (const oi of itemsData) {
      if (oi.variantId && oi.variantId !== "default") {
        try {
          const { data: v } = await supabaseAdmin
            .from("ProductVariant")
            .select("stock")
            .eq("id", oi.variantId)
            .single();
          if (v) {
            const newStock = Math.max(0, (v.stock || 0) - (oi.quantity as number));
            await supabaseAdmin
              .from("ProductVariant")
              .update({ stock: newStock })
              .eq("id", oi.variantId);

            await supabaseAdmin.from("StockLedgerEntry").insert([{
              id: `stk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              variantId: oi.variantId,
              change: -(oi.quantity as number),
              reason: "ONLINE_SALE",
              referenceId: orderNumber,
            }]);
          }
        } catch (stockErr) {
          console.warn("Stock decrement warning for variant", oi.variantId, stockErr);
        }
      }
    }

    // Attempt automatic push to Shiprocket if credentials are set up
    try {
      const { createDirectShiprocketOrder } = await import("@/lib/shiprocket");
      const shiprocketResult = await createDirectShiprocketOrder({
        order_id: orderNumber,
        order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
        billing_customer_name: customer_name,
        billing_address: shipping_address?.address || "Address",
        billing_city: shipping_address?.city || "Kochi",
        billing_pincode: shipping_address?.pincode || "682020",
        billing_state: shipping_address?.state || "Kerala",
        billing_country: "India",
        billing_email: customer_email || "customer@kushalsmart.com",
        billing_phone: customer_phone,
        shipping_is_billing: true,
        order_items: orderItems.map((oi) => ({
          name: oi.productName as string,
          sku: (oi.variantId as string) || (oi.productId as string),
          units: oi.quantity as number,
          selling_price: Math.round((oi.unitPrice as number) / 100),
        })),
        payment_method: payment_mode === "cod" ? "COD" : "Prepaid",
        sub_total: Math.round(subtotal / 100),
        length: 15,
        breadth: 10,
        height: 10,
        weight: 0.5,
      });

      if (shiprocketResult?.awb_code) {
        await supabaseAdmin
          .from("Order")
          .update({
            shiprocketAwb: shiprocketResult.awb_code,
            courierName: shiprocketResult.courier_name || "Shiprocket Express",
            status: "PACKED",
          })
          .eq("id", order.id);
      }
    } catch (srErr) {
      console.warn("Shiprocket auto-creation skipped or failed:", srErr);
    }

    return NextResponse.json({ success: true, order_number: orderNumber, order_id: order.id }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
