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

interface VariantRow {
  id: string;
  name: string;
  stock: number | null;
  sellingPriceOverride: number | null;
  images: string[] | null;
}

interface ProductRow {
  id: string;
  name: string;
  sellingPrice: number;
  costPrice: number | null;
  isActive: boolean;
  images: string[] | null;
  ProductVariant: VariantRow[] | null;
}

const MAX_CART_LINES = 50;
const MAX_QTY_PER_LINE = 20;

function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `KM-${dateStr}-${randomStr}`;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/** Normalises Indian mobile numbers to 10 digits; returns "" if invalid. */
function normalizePhone(value: unknown): string {
  let digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
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
 *
 * Every price, name and image comes from the database; the client only
 * chooses product, variant and quantity.
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Invalid request body");

    const { items } = body as { items?: unknown };
    const channel = "ONLINE"; // Always ONLINE for public API — OFFLINE only via POS/admin

    // ── Customer & address validation ─────────────────────────────────────
    const customerName = cleanText(body.customer_name, 100);
    const customerPhone = normalizePhone(body.customer_phone);
    const customerEmail = cleanText(body.customer_email, 200) || null;
    const rawAddress = (body.shipping_address || {}) as Record<string, unknown>;
    const shippingAddress = {
      address: cleanText(rawAddress.address, 500),
      city: cleanText(rawAddress.city, 100),
      state: cleanText(rawAddress.state, 100),
      pincode: typeof rawAddress.pincode === "string" ? rawAddress.pincode.replace(/\D/g, "") : "",
    };

    if (!Array.isArray(items) || items.length === 0) return badRequest("Cart is empty");
    if (items.length > MAX_CART_LINES) return badRequest("Too many items in cart");
    if (!customerName) return badRequest("Customer name is required");
    if (!customerPhone) return badRequest("Please enter a valid 10-digit mobile number");
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return badRequest("Please enter a valid email address");
    }
    if (!shippingAddress.address || !shippingAddress.city || !/^\d{6}$/.test(shippingAddress.pincode)) {
      return badRequest("Complete shipping address with a valid 6-digit PIN code is required");
    }

    // ── Line validation — quantities must be positive whole numbers ───────
    const lines: { productId: string; variantId: string; quantity: number }[] = [];
    for (const raw of items as Record<string, unknown>[]) {
      const productId = typeof raw?.product_id === "string" ? raw.product_id : "";
      const variantId = typeof raw?.variant_id === "string" ? raw.variant_id : "";
      const quantity = raw?.quantity;
      if (!productId) return badRequest("Invalid cart item");
      if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
        return badRequest(`Quantity must be a whole number between 1 and ${MAX_QTY_PER_LINE}`);
      }
      lines.push({ productId, variantId, quantity });
    }

    // Fetch products and variants for server-side price calculation
    const productIds = [...new Set(lines.map((l) => l.productId))];
    const { data: products, error: productsError } = await supabaseAdmin
      .from("Product")
      .select("id, name, sellingPrice, costPrice, isActive, images, ProductVariant ( id, name, stock, sellingPriceOverride, images )")
      .in("id", productIds);

    if (productsError) {
      console.error("[orders/create] Product lookup failed:", productsError.message);
      return NextResponse.json({ error: "Could not load products. Please try again." }, { status: 500 });
    }

    const productMap = new Map<string, ProductRow>();
    for (const p of (products || []) as ProductRow[]) productMap.set(p.id, p);

    // ── Resolve each line to a real, active variant and merge duplicates ──
    const resolved = new Map<string, { product: ProductRow; variant: VariantRow; quantity: number }>();
    for (const line of lines) {
      const product = productMap.get(line.productId);
      if (!product || !product.isActive) {
        return badRequest("One of the products in your cart is no longer available");
      }

      const variants = product.ProductVariant || [];
      let variant = variants.find((v) => v.id === line.variantId);
      if (!variant && (!line.variantId || line.variantId === "default")) {
        variant = variants[0];
      }
      if (!variant) {
        return badRequest(`"${product.name}" is no longer available in the selected option`);
      }

      const existing = resolved.get(variant.id);
      if (existing) existing.quantity += line.quantity;
      else resolved.set(variant.id, { product, variant, quantity: line.quantity });
    }

    // ── Stock validation — on the merged quantity per variant ─────────────
    for (const { product, variant, quantity } of resolved.values()) {
      const availableStock = variant.stock || 0;
      if (availableStock < quantity) {
        return badRequest(
          availableStock > 0
            ? `"${product.name}" (${variant.name}) — only ${availableStock} left in stock.`
            : `"${product.name}" (${variant.name}) is out of stock.`
        );
      }
    }

    // ── Server-side price calculation ───────────────────────────────────────
    let subtotal = 0;
    const orderItems: OrderItemRecord[] = [];
    for (const { product, variant, quantity } of resolved.values()) {
      const unitPrice = variant.sellingPriceOverride != null ? variant.sellingPriceOverride : product.sellingPrice;
      if (!Number.isInteger(unitPrice) || unitPrice <= 0) {
        return badRequest(`"${product.name}" is not available for online purchase right now`);
      }
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name || "Standard",
        unitPrice,
        costPrice: product.costPrice || 0,
        quantity,
        lineTotal,
        image: variant.images?.[0] || product.images?.[0] || null,
      });
    }

    // Razorpay minimum is ₹1 (100 paise)
    if (subtotal < 100) return badRequest("Order total is too low");

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
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        subtotal,
        discount: 0,
        total: subtotal,
        paymentStatus: "PENDING",
        paymentMode: "prepaid",
        updatedAt: now,
      }])
      .select()
      .single();

    if (orderError) {
      console.error("[orders/create] Order insert failed:", orderError.message);
      return NextResponse.json({ error: "Could not create your order. Please try again." }, { status: 500 });
    }

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
      console.error("[orders/create] OrderItem insert failed:", itemsError.message);
      return NextResponse.json({ error: "Could not create your order. Please try again." }, { status: 500 });
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
          customer_name: customerName,
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
    console.error("[orders/create] Unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
