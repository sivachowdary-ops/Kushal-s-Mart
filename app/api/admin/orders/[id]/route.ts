import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeOrder } from "@/lib/db-normalize";
import { verifyAdmin, verifyAdminOrStaff } from "@/lib/admin-auth";

/** Every status the app uses. Anything else is rejected instead of being saved as free text. */
const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_FAILED",
  "PENDING",
  "PAID",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

/** Trimmed text up to maxLength; "" or null clears the field; undefined means invalid input. */
function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return undefined;
  return trimmed || null;
}

function badField(field: string) {
  return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
}

// CHANGED: "orders"→"Order", "order_items"→"OrderItem", camelCase columns
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminOrStaff(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("Order")
    .select(`*, OrderItem ( * )`)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/orders/:id] Query failed:", error.message);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
  // POS cashiers may only open counter sales, and never see cost prices
  if (!data || (user.role !== "admin" && data.channel !== "OFFLINE")) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const order = normalizeOrder(data);
  if (user.role !== "admin") {
    order.order_items = order.order_items.map((item) => ({ ...item, cost_price: 0 }));
  }
  return NextResponse.json(order);
}

// CHANGED: table names + column names updated. Incoming body uses snake_case,
// mapped to camelCase before writing to DB.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { status, shiprocket_awb, courier_name, ...otherData } = body as Record<string, unknown>;

    // Build update object — ONLY columns that exist in the Prisma Order model
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      if (typeof status !== "string" || !ORDER_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Use one of: ${ORDER_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.status = status;
    }
    if (shiprocket_awb !== undefined) {
      const awb = optionalText(shiprocket_awb, 60);
      if (awb === undefined) return badField("shiprocket_awb");
      updateData.shiprocketAwb = awb;
    }
    if (courier_name !== undefined) {
      const courier = optionalText(courier_name, 80);
      if (courier === undefined) return badField("courier_name");
      updateData.courierName = courier;
    }

    // Customer details an admin may correct. payment_status is deliberately not editable here —
    // only verified Razorpay webhooks and the refund flow change it.
    if (otherData.customer_name !== undefined) {
      const name = optionalText(otherData.customer_name, 100);
      if (!name) return badField("customer_name");
      updateData.customerName = name;
    }
    if (otherData.customer_phone !== undefined) {
      const phone = typeof otherData.customer_phone === "string" ? otherData.customer_phone.replace(/\D/g, "").slice(-10) : "";
      if (!/^[6-9]\d{9}$/.test(phone)) return badField("customer_phone");
      updateData.customerPhone = phone;
    }
    if (otherData.customer_email !== undefined) {
      const email = optionalText(otherData.customer_email, 200);
      if (email === undefined || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return badField("customer_email");
      updateData.customerEmail = email;
    }
    if (otherData.shipping_address !== undefined) {
      const a = otherData.shipping_address as Record<string, unknown> | null;
      const address = a && typeof a === "object"
        ? {
            address: optionalText(a.address, 500),
            city: optionalText(a.city, 100),
            state: optionalText(a.state, 100),
            pincode: typeof a.pincode === "string" ? a.pincode.replace(/\D/g, "") : "",
          }
        : null;
      if (!address || !address.address || !address.city || !/^\d{6}$/.test(address.pincode)) {
        return badField("shipping_address");
      }
      updateData.shippingAddress = address;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    updateData.updatedAt = new Date().toISOString();

    // NOTE: 'paymentMode' and 'timeline' columns do NOT exist in the Order schema
    // Do not write them to the database

    const { data, error } = await supabaseAdmin
      .from("Order")
      .update(updateData)
      .eq("id", id)
      .select(`*, OrderItem ( * )`)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(normalizeOrder(data));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

