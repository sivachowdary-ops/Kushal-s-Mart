import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeOrder } from "@/lib/db-normalize";
import { verifyAdmin, verifyAdminOrStaff } from "@/lib/admin-auth";

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
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalizeOrder(data));
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
    const body = await request.json();
    const { status, shiprocket_awb, courier_name, note, ...otherData } = body;

    // Build update object — ONLY columns that exist in the Prisma Order model
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) updateData.status = status;
    if (shiprocket_awb !== undefined) updateData.shiprocketAwb = shiprocket_awb;
    if (courier_name !== undefined) updateData.courierName = courier_name;

    // Pass through other known camelCase fields from otherData
    // payment_status deliberately excluded — only changeable via verified webhooks or explicit admin workflow
    const fieldMap: Record<string, string> = {
      shipping_address: "shippingAddress",
      customer_name: "customerName",
      customer_phone: "customerPhone",
      customer_email: "customerEmail",
    };
    for (const [snake, camel] of Object.entries(fieldMap)) {
      if (otherData[snake] !== undefined) updateData[camel] = otherData[snake];
    }

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

