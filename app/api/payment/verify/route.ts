import { NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { supabaseAdmin } from "@/lib/supabase-admin";

function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `KM-${dateStr}-${randomStr}`;
}

// POST /api/payment/verify
// 1. Verifies Razorpay payment signature
// 2. Creates the Order + OrderItems in DB
// 3. Triggers Shiprocket
export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || keyId.includes("XXXX") || !keySecret || keySecret.includes("XXXX")) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // Order details passed from frontend
      customer_name,
      customer_phone,
      customer_email,
      shipping_address,
      items,
    } = body;

    // ── 1. Verify HMAC signature ──────────────────────────────────────────────
    const expectedSig = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature — possible fraud attempt" }, { status: 400 });
    }

    // ── 2. Fetch prices from DB and recalculate total ────────────────────────
    // SECURITY: we never trust the item prices from the client.
    // We recalculate the expected total from our own DB.
    const productKeys = items.map((i: Record<string, unknown>) => i.product_id);
    
    // Support matching by either id or slug
    const { data: productsById } = await supabaseAdmin
      .from("Product")
      .select("id, slug, name, sellingPrice, costPrice, ProductVariant ( id, name, sellingPriceOverride )")
      .in("id", productKeys);

    let allProducts = productsById || [];
    if (allProducts.length < productKeys.length) {
      const { data: productsBySlug } = await supabaseAdmin
        .from("Product")
        .select("id, slug, name, sellingPrice, costPrice, ProductVariant ( id, name, sellingPriceOverride )")
        .in("slug", productKeys);
      if (productsBySlug) {
        allProducts = [...allProducts, ...productsBySlug];
      }
    }

    interface DBProduct {
      id: string;
      slug: string;
      name: string;
      sellingPrice: number;
      costPrice: number;
      ProductVariant: { id: string; name: string; sellingPriceOverride: number | null }[];
    }

    const productMap: Record<string, DBProduct> = {};
    (allProducts as unknown as DBProduct[]).forEach((p) => {
      productMap[p.id] = p;
      if (p.slug) productMap[p.slug] = p;
    });

    let expectedTotal = 0;
    const orderItems: Record<string, unknown>[] = items.map((item: Record<string, unknown>) => {
      const product = productMap[item.product_id as string];
      if (!product) throw new Error(`Product ${item.product_id} not found`);

      // Resolve valid variantId for Foreign Key constraint
      const variants = product.ProductVariant || [];
      let matchedVariant = variants.find((v) => v.id === item.variant_id);
      if (!matchedVariant && variants.length > 0) {
        matchedVariant = variants[0];
      }

      const unitPrice = (matchedVariant?.sellingPriceOverride != null) ? matchedVariant.sellingPriceOverride : product.sellingPrice;
      const costPrice = product.costPrice || 0;
      const lineTotal = unitPrice * (item.quantity as number);
      expectedTotal += lineTotal;

      return {
        productId: product.id,
        variantId: matchedVariant ? matchedVariant.id : (item.variant_id || "default"),
        productName: product.name,
        variantName: matchedVariant?.name || (item.variant_name as string) || "Standard",
        unitPrice,
        costPrice,
        quantity: item.quantity as number,
        lineTotal,
        image: (item.image as string) || null,
      };
    });

    // ── 3. Cross-check: confirm Razorpay actually charged the right amount ───
    // Fetch the actual Razorpay order to see what amount was authorised.
    // This prevents: pay ₹1 via Razorpay → submit ₹10,000 order.
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
    const razorpayChargedPaise = Number(rzpOrder.amount);

    // Allow ₹1 tolerance for floating point / rounding
    if (Math.abs(razorpayChargedPaise - expectedTotal) > 100) {
      console.error(`[payment/verify] Amount mismatch! Razorpay charged ${razorpayChargedPaise} paise, DB total is ${expectedTotal} paise`);
      return NextResponse.json(
        { error: "Payment amount mismatch. Order rejected for security. Please contact support." },
        { status: 400 }
      );
    }

    // ── 3. Create Order in DB ────────────────────────────────────────────────
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    const orderId = `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: order, error: orderError } = await supabaseAdmin
      .from("Order")
      .insert([{
        id: orderId,
        orderNumber,
        channel: "ONLINE",
        status: "CONFIRMED", // payment verified → confirmed immediately
        customerName: customer_name,
        customerPhone: customer_phone,
        customerEmail: customer_email || null,
        shippingAddress: shipping_address,
        subtotal: expectedTotal,
        discount: 0,
        total: expectedTotal,
        paymentStatus: "PAID",
        paymentMode: "prepaid",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        updatedAt: now,
        timeline: [
          { status: "PENDING", timestamp: now, note: "Order placed by customer" },
          { status: "CONFIRMED", timestamp: now, note: `Payment verified — Razorpay ID: ${razorpay_payment_id}` },
        ],
      }])
      .select()
      .single();

    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

    // ── 4. Insert Order Items ────────────────────────────────────────────────
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

    // ── 5. Trigger Shiprocket (best-effort) ──────────────────────────────────
    try {
      const { createDirectShiprocketOrder } = await import("@/lib/shiprocket");
      const result = await createDirectShiprocketOrder({
        order_id: orderNumber,
        order_date: now.slice(0, 19).replace("T", " "),
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
        billing_customer_name: customer_name,
        billing_address: shipping_address?.address || "",
        billing_city: shipping_address?.city || "",
        billing_pincode: shipping_address?.pincode || "",
        billing_state: shipping_address?.state || "",
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
        payment_method: "Prepaid",
        sub_total: Math.round(expectedTotal / 100),
        length: 15, breadth: 10, height: 10, weight: 0.5,
      });
      if (result?.awb_code) {
        await supabaseAdmin.from("Order").update({
          shiprocketAwb: result.awb_code,
          courierName: result.courier_name || "Shiprocket Express",
          status: "PACKED",
        }).eq("id", order.id);
      }
    } catch (srErr) {
      console.warn("Shiprocket skipped:", srErr);
    }

    return NextResponse.json({ success: true, order_number: orderNumber, order_id: order.id }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Payment verification failed";
    console.error("[payment/verify]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
