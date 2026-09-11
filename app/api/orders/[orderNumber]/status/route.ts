import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/orders/[orderNumber]/status
 *
 * Lightweight polling endpoint for the order confirmation page.
 * Returns current order status so the frontend can detect when
 * the webhook has confirmed payment.
 *
 * No auth required — the orderNumber itself is the access key.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;

    const { data, error } = await supabaseAdmin
      .from("Order")
      .select("status, paymentStatus, orderNumber, shiprocketAwb, courierName")
      .eq("orderNumber", orderNumber)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const awb = data.shiprocketAwb && !data.shiprocketAwb.startsWith("KM-") && data.shiprocketAwb !== data.orderNumber ? data.shiprocketAwb : null;

    return NextResponse.json({
      status: data.status,
      paymentStatus: data.paymentStatus,
      orderNumber: data.orderNumber,
      shiprocketAwb: awb,
      courierName: awb ? (data.courierName || "Delhivery Express") : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch order status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
