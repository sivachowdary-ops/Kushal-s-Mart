import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/payment/create-order
 *
 * SECURITY: The amount is NEVER trusted from the client.
 * We receive the cart item list, look up prices from our own DB,
 * calculate the total ourselves, then create the Razorpay order.
 *
 * This prevents a malicious user from sending amount=1 to pay ₹0.01
 * for a ₹10,000 order.
 */
export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || keyId.includes("XXXX") || !keySecret || keySecret.includes("XXXX")) {
    return NextResponse.json(
      { error: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { items } = body as {
      items: { product_id: string; variant_id?: string; quantity: number }[];
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // ── Look up prices from DB — never trust the client ──────────────────────
    const productKeys = items.map((i) => i.product_id);
    
    // Support matching by either id or slug
    const { data: productsById, error: productError } = await supabaseAdmin
      .from("Product")
      .select("id, slug, sellingPrice, ProductVariant ( id, sellingPriceOverride )")
      .in("id", productKeys)
      .eq("isActive", true);

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    let allProducts = productsById || [];
    if (allProducts.length < productKeys.length) {
      const { data: productsBySlug } = await supabaseAdmin
        .from("Product")
        .select("id, slug, sellingPrice, ProductVariant ( id, sellingPriceOverride )")
        .in("slug", productKeys)
        .eq("isActive", true);
      if (productsBySlug) {
        allProducts = [...allProducts, ...productsBySlug];
      }
    }

    const productMap: Record<string, { id: string; price: number; variants: { id: string; sellingPriceOverride: number | null }[] }> = {};
    allProducts.forEach((p) => {
      const pData = {
        id: p.id,
        price: p.sellingPrice,
        variants: (p.ProductVariant as { id: string; sellingPriceOverride: number | null }[]) || [],
      };
      productMap[p.id] = pData;
      if (p.slug) productMap[p.slug] = pData;
    });

    // Calculate total from DB prices
    let serverTotal = 0;
    for (const item of items) {
      const product = productMap[item.product_id];
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.product_id} not found or inactive` },
          { status: 400 }
        );
      }
      const matchedVariant = product.variants.find((v) => v.id === item.variant_id);
      const unitPrice = (matchedVariant?.sellingPriceOverride != null) ? matchedVariant.sellingPriceOverride : product.price;
      serverTotal += unitPrice * item.quantity;
    }

    if (serverTotal <= 0) {
      return NextResponse.json({ error: "Order total must be greater than ₹0" }, { status: 400 });
    }

    // ── Create Razorpay order with the server-calculated amount ──────────────
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: Math.round(serverTotal), // paise — server-calculated, not client-sent
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      payment_capture: true,
    });

    return NextResponse.json({
      razorpay_order_id: order.id,
      amount: order.amount,       // echo back what Razorpay was told
      server_total: serverTotal,  // for the frontend to display
      currency: order.currency,
      key: keyId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create payment";
    console.error("[payment/create-order]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
