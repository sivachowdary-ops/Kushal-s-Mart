import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeOrder } from "@/lib/db-normalize";
import { verifyAdminOrStaff } from "@/lib/admin-auth";

function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `KM-${dateStr}-${randomStr}`;
}

// CHANGED: table "orders"→"Order", join "order_items"→"OrderItem", column "created_at"→"createdAt"
export async function GET(request: Request) {
  const user = await verifyAdminOrStaff(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("Order")
    .select(`*, OrderItem ( * )`)
    .order("createdAt", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(normalizeOrder));
}

// CHANGED: table "orders"→"Order", "order_items"→"OrderItem", camelCase columns
// Also maps incoming snake_case body to camelCase for DB insert
export async function POST(request: Request) {
  const user = await verifyAdminOrStaff(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { items, ...orderBody } = body;

    const now = new Date().toISOString();
    const orderId = `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Only insert columns that exist in the Prisma Order model
    const dbOrder = {
      id: orderId,
      orderNumber: generateOrderNumber(),
      channel: orderBody.channel || "OFFLINE",
      status: orderBody.status || "COMPLETED",
      customerName: orderBody.customer_name,
      customerPhone: orderBody.customer_phone,
      customerEmail: orderBody.customer_email || null,
      shippingAddress: orderBody.shipping_address || null,
      subtotal: orderBody.subtotal || 0,
      discount: orderBody.discount || 0,
      total: orderBody.total || orderBody.subtotal || 0,
      paymentStatus: orderBody.payment_status || "PAID",
      paymentMode: orderBody.payment_mode || "cash",
      updatedAt: now,
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from("Order")
      .insert([dbOrder])
      .select()
      .single();

    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

    if (items && items.length > 0) {
      // Resolve valid variantIds for each item — the DB requires a real FK
      const productIds = [...new Set(items.map((i: Record<string, unknown>) => i.product_id as string))];
      const { data: variantsData } = await supabaseAdmin
        .from("ProductVariant")
        .select("id, productId")
        .in("productId", productIds);
      const variantsByProduct = new Map<string, string>();
      for (const v of variantsData || []) {
        if (!variantsByProduct.has(v.productId)) {
          variantsByProduct.set(v.productId, v.id);
        }
      }

      // Only insert columns that exist in the Prisma OrderItem model
      const itemsData = items.map((item: Record<string, unknown>, idx: number) => {
        const productId = item.product_id as string;
        // Use provided variant_id if valid, otherwise fall back to the product's first variant
        const resolvedVariantId = (item.variant_id as string) || variantsByProduct.get(productId) || "";

        return {
          id: `item-${order.id}-${idx}`,
          orderId: order.id,
          productId,
          variantId: resolvedVariantId,
          productName: item.product_name,
          variantName: item.variant_name || "Default",
          unitPrice: item.unit_price,
          quantity: item.quantity,
          lineTotal: (item.unit_price as number) * (item.quantity as number),
        };
      });

      // Verify all items have a valid variantId
      const missingVariant = itemsData.find((i: { variantId: string }) => !i.variantId);
      if (missingVariant) {
        // Clean up the order we just created
        await supabaseAdmin.from("Order").delete().eq("id", order.id);
        return NextResponse.json(
          { error: `No variant found for product "${(missingVariant as { productName: string }).productName}". Please ensure the product has at least one variant.` },
          { status: 400 }
        );
      }

      const { error: itemsError } = await supabaseAdmin.from("OrderItem").insert(itemsData);
      if (itemsError) {
        await supabaseAdmin.from("Order").delete().eq("id", order.id);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }

      // Deduct stock for POS sales
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
                reason: "POS_SALE",
                referenceId: dbOrder.orderNumber || order.order_number,
              }]);
            }
          } catch (stkErr) {
            console.warn("Stock decrement warning for POS sale", oi.variantId, stkErr);
          }
        }
      }
    }

    const { data: fullOrder } = await supabaseAdmin
      .from("Order")
      .select(`*, OrderItem ( * )`)
      .eq("id", order.id)
      .single();

    return NextResponse.json(normalizeOrder(fullOrder), { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

