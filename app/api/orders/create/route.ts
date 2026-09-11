import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createRazorpayOrder } from "@/lib/razorpay";

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

/**
 * POST /api/orders/create
 *
 * Creates an Order with status PENDING_PAYMENT for the Razorpay checkout flow.
 * Online payment only — no COD.
 *
 * Stock is NOT decremented here — that happens in the webhook handler
 * after Razorpay confirms payment. Stock IS validated here to prevent
 * orders for out-of-stock items.
 *
 * Shiprocket/Delhivery dispatch is NOT triggered here — that also
 * happens in the webhook handler after payment confirmation.
 */
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
    const { customer_name, customer_phone, customer_email, shipping_address, items } = body;
    const channel = "ONLINE"; // Always ONLINE for public API — OFFLINE only via POS/admin

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (!customer_name || !customer_phone) {
      return NextResponse.json({ error: "Customer name and phone are required" }, { status: 400 });
    }

    if (!shipping_address?.address || !shipping_address?.city || !shipping_address?.pincode) {
      return NextResponse.json({ error: "Complete shipping address is required" }, { status: 400 });
    }

    // Fetch products and variants for server-side price calculation
    const productIds = items.map((item: Record<string, unknown>) => item.product_id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from("Product")
      .select("id, name, sellingPrice, costPrice, ProductVariant ( id, name, stock, sellingPriceOverride )")
      .in("id", productIds);

    if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 });

    const productMap: Record<string, Record<string, unknown>> = {};
    (products || []).forEach((p: Record<string, unknown>) => {
      productMap[p.id as string] = p;
    });

    // ── Stock validation — check before creating order ──────────────────────
    for (const item of items as Record<string, unknown>[]) {
      const product = productMap[item.product_id as string];
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.product_id}` },
          { status: 400 }
        );
      }

      const variants = (product.ProductVariant as Record<string, unknown>[]) || [];
      const matchedVariant = variants.find((v) => v.id === item.variant_id);

      if (matchedVariant) {
        const availableStock = (matchedVariant.stock as number) || 0;
        const requestedQty = item.quantity as number;

        if (availableStock < requestedQty) {
          return NextResponse.json(
            {
              error: `"${product.name}" (${matchedVariant.name}) is out of stock. Only ${availableStock} available.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // ── Server-side price calculation ───────────────────────────────────────
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
        productId: item.product_id as string,
        variantId: matchedVariant ? (matchedVariant.id as string) : (item.variant_id as string || "default"),
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

    // ── Create Order with PENDING_PAYMENT status ────────────────────────────
    const { data: order, error: orderError } = await supabaseAdmin
      .from("Order")
      .insert([{
        id: orderId,
        orderNumber,
        channel,
        status: "PENDING_PAYMENT",
        customerName: customer_name,
        customerPhone: customer_phone,
        customerEmail: customer_email || null,
        shippingAddress: shipping_address,
        subtotal,
        discount: 0,
        total: subtotal,
        paymentStatus: "PENDING",
        paymentMode: "prepaid",
        updatedAt: now,
      }])
      .select()
      .single();

    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

    // ── Insert OrderItems with explicit IDs ─────────────────────────────────
    const itemsData = orderItems.map((item, idx) => ({
      id: `item-${order.id}-${idx}`,
      ...item,
      orderId: order.id,
    }));
    const { error: itemsError } = await supabaseAdmin.from("OrderItem").insert(itemsData);

    if (itemsError) {
      // Rollback: delete the Order if items fail
      await supabaseAdmin.from("Order").delete().eq("id", order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // NOTE: Stock decrement and shipment creation are NOT done here.
    // They happen in POST /api/webhooks/razorpay after payment is confirmed.

    // ── Pre-create Razorpay order in the same request for instant checkout ─
    let razorpayOrderId: string | null = null;
    const keyId: string =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID ||
      "";

    try {
      const rzpOrder = await createRazorpayOrder({
        amountPaise: subtotal,
        receipt: orderNumber,
        notes: {
          order_id: order.id,
          order_number: orderNumber,
          customer_name: customer_name,
        },
      });

      razorpayOrderId = rzpOrder.id;

      // Link order immediately
      await supabaseAdmin
        .from("Order")
        .update({ razorpayOrderId: rzpOrder.id })
        .eq("id", order.id);

      // Audit payments table
      try {
        await supabaseAdmin.from("payments").insert([{
          order_id: order.id,
          razorpay_order_id: rzpOrder.id,
          razorpay_payment_id: null,
          amount: subtotal,
          currency: "INR",
          status: "created",
        }]);
      } catch {
        // non-blocking
      }
    } catch (rzpErr) {
      console.warn("[orders/create] Razorpay instant order creation note:", rzpErr);
    }

    return NextResponse.json(
      {
        success: true,
        order_number: orderNumber,
        order_id: order.id,
        razorpay_order_id: razorpayOrderId,
        amount: subtotal,
        currency: "INR",
        key_id: keyId,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
