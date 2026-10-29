import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeOrder } from "@/lib/db-normalize";
import { verifyAdminOrStaff } from "@/lib/admin-auth";
import { generateOrderNumber, isOrderNumberClash } from "@/lib/order-number";

const POS_PAYMENT_MODES = ["CASH", "UPI", "CARD"];
const MAX_POS_QTY = 999;

/**
 * POS cashiers see counter (OFFLINE) sales only — not online customers' addresses — and never the
 * shop's cost prices. Admins see everything.
 */
function forStaff(order: ReturnType<typeof normalizeOrder>) {
  return {
    ...order,
    order_items: order.order_items.map((item) => ({ ...item, cost_price: 0 })),
  };
}

// CHANGED: table "orders"→"Order", join "order_items"→"OrderItem", column "created_at"→"createdAt"
export async function GET(request: Request) {
  const user = await verifyAdminOrStaff(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const includePending = searchParams.get("include_pending") === "true";
  const isStaff = user.role !== "admin";

  let query = supabaseAdmin
    .from("Order")
    .select(`*, OrderItem ( * )`)
    .order("createdAt", { ascending: false });

  if (isStaff) {
    query = query.eq("channel", "OFFLINE");
  } else if (!includePending) {
    query = query.not("status", "in", "(PENDING_PAYMENT,PAYMENT_FAILED)");
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/orders] Query failed:", error.message);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
  const orders = (data || []).map(normalizeOrder);
  return NextResponse.json(isStaff ? orders.map(forStaff) : orders);
}

interface VariantRow {
  id: string;
  productId: string;
  name: string;
  sellingPriceOverride: number | null;
}

interface ProductRow {
  id: string;
  name: string;
  sellingPrice: number;
  costPrice: number | null;
}

/**
 * POST /api/admin/orders — records a counter (POS) sale.
 *
 * Prices, totals and names always come from the database: the client only chooses product,
 * variant and quantity. Every sale is OFFLINE, COMPLETED and PAID with a real payment mode,
 * so a cashier can't record a free, unpaid or fake "online" order.
 */
export async function POST(request: Request) {
  const user = await verifyAdminOrStaff(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Invalid request body");
    const { items } = body as { items?: unknown };

    // ── Customer & payment ────────────────────────────────────────────────
    const customerName =
      (typeof body.customer_name === "string" && body.customer_name.trim().slice(0, 100)) || "Walk-in Customer";
    const customerPhone =
      typeof body.customer_phone === "string" ? body.customer_phone.replace(/\D/g, "").slice(-10) : "";
    if (!/^[6-9]\d{9}$/.test(customerPhone)) return badRequest("Please enter the customer's 10-digit mobile number");
    const paymentMode = typeof body.payment_mode === "string" ? body.payment_mode.toUpperCase() : "";
    if (!POS_PAYMENT_MODES.includes(paymentMode)) return badRequest(`Payment mode must be one of ${POS_PAYMENT_MODES.join(", ")}`);

    // ── Lines — validate before creating anything ─────────────────────────
    if (!Array.isArray(items) || items.length === 0) return badRequest("Add at least one item");
    const lines: { productId: string; variantId: string; quantity: number }[] = [];
    for (const raw of items as Record<string, unknown>[]) {
      const productId = typeof raw?.product_id === "string" ? raw.product_id : "";
      const variantId = typeof raw?.variant_id === "string" ? raw.variant_id : "";
      const quantity = raw?.quantity;
      if (!productId) return badRequest("Invalid item");
      if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_POS_QTY) {
        return badRequest("Each item needs a whole-number quantity of at least 1");
      }
      lines.push({ productId, variantId, quantity });
    }

    const productIds = [...new Set(lines.map((l) => l.productId))];
    const [{ data: products, error: productErr }, { data: variants, error: variantErr }] = await Promise.all([
      supabaseAdmin.from("Product").select("id, name, sellingPrice, costPrice").in("id", productIds),
      supabaseAdmin.from("ProductVariant").select("id, productId, name, sellingPriceOverride").in("productId", productIds),
    ]);
    if (productErr || variantErr) {
      console.error("[admin/orders] Catalogue lookup failed:", productErr?.message || variantErr?.message);
      return NextResponse.json({ error: "Could not load products. Please try again." }, { status: 500 });
    }
    const productMap = new Map((products as ProductRow[] || []).map((p) => [p.id, p]));

    const priced: {
      productId: string; variantId: string; productName: string; variantName: string;
      unitPrice: number; costPrice: number; quantity: number; lineTotal: number;
    }[] = [];
    for (const line of lines) {
      const product = productMap.get(line.productId);
      const productVariants = (variants as VariantRow[] || []).filter((v) => v.productId === line.productId);
      // The variant must belong to this product; with no variant chosen, use the product's first
      const variant = line.variantId
        ? productVariants.find((v) => v.id === line.variantId)
        : productVariants[0];
      if (!product || !variant) return badRequest("One of the items is not available — refresh the product list");

      const unitPrice = variant.sellingPriceOverride ?? product.sellingPrice;
      priced.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name || "Default",
        unitPrice,
        costPrice: product.costPrice || 0,
        quantity: line.quantity,
        lineTotal: unitPrice * line.quantity,
      });
    }
    const subtotal = priced.reduce((sum, p) => sum + p.lineTotal, 0);

    // ── Create the order ──────────────────────────────────────────────────
    const now = new Date().toISOString();
    const orderId = `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const dbOrder = {
      id: orderId,
      orderNumber: generateOrderNumber(),
      channel: "OFFLINE",
      status: "COMPLETED",
      customerName,
      customerPhone,
      customerEmail: null,
      shippingAddress: null,
      subtotal,
      discount: 0,
      total: subtotal,
      paymentStatus: "PAID",
      paymentMode,
      updatedAt: now,
    };

    // Retry with a fresh order number on the (very unlikely) chance it's already taken
    let insert = await supabaseAdmin.from("Order").insert([dbOrder]).select().single();
    for (let attempt = 1; attempt < 3 && isOrderNumberClash(insert.error); attempt++) {
      dbOrder.orderNumber = generateOrderNumber();
      insert = await supabaseAdmin.from("Order").insert([dbOrder]).select().single();
    }
    const { data: order, error: orderError } = insert;
    if (orderError || !order) {
      console.error("[admin/orders] Order insert failed:", orderError?.message);
      return NextResponse.json({ error: "Could not save the sale. Please try again." }, { status: 500 });
    }

    const itemsData = priced.map((item, idx) => ({ id: `item-${order.id}-${idx}`, orderId: order.id, ...item }));
    const { error: itemsError } = await supabaseAdmin.from("OrderItem").insert(itemsData);
    if (itemsError) {
      await supabaseAdmin.from("Order").delete().eq("id", order.id);
      console.error("[admin/orders] OrderItem insert failed:", itemsError.message);
      return NextResponse.json({ error: "Could not save the sale. Please try again." }, { status: 500 });
    }

    // Deduct stock for POS sales — atomic RPC, so a simultaneous online sale can't be lost
    for (const oi of itemsData) {
      try {
        const { data: decremented, error: rpcErr } = await supabaseAdmin.rpc("decrement_stock", {
          p_variant_id: oi.variantId,
          p_qty: oi.quantity,
        });
        if (rpcErr) throw rpcErr;
        if (decremented === false) {
          // The item was physically sold, so the recorded stock was wrong — floor it at zero
          console.warn(`[POS] Stock for ${oi.variantId} was below ${oi.quantity}; setting to 0`);
          await supabaseAdmin.from("ProductVariant").update({ stock: 0 }).eq("id", oi.variantId);
        }

        await supabaseAdmin.from("StockLedgerEntry").insert([{
          id: `stk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          variantId: oi.variantId,
          change: -oi.quantity,
          reason: "OFFLINE_SALE",
          orderId: order.id,
          note: `POS sale ${dbOrder.orderNumber}`,
          createdAt: now,
        }]);
      } catch (stkErr) {
        console.warn("Stock decrement warning for POS sale", oi.variantId, stkErr);
      }
    }

    const { data: fullOrder } = await supabaseAdmin
      .from("Order")
      .select(`*, OrderItem ( * )`)
      .eq("id", order.id)
      .single();

    const normalized = normalizeOrder(fullOrder);
    return NextResponse.json(user.role === "admin" ? normalized : forStaff(normalized), { status: 201 });
  } catch (err: unknown) {
    console.error("[admin/orders] Unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to record the sale" }, { status: 500 });
  }
}
