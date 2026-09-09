import { NextResponse } from "next/server";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";

/**
 * POST /api/payments/verify
 *
 * Client-side payment callback verification.
 * After Razorpay Checkout popup closes successfully, the client sends:
 *   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * This endpoint verifies the signature is authentic using HMAC-SHA256.
 * It does NOT mark the order as PAID — the webhook is the source of truth.
 * This just tells the client "yes, the payment callback is legitimate".
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment verification fields" },
        { status: 400 }
      );
    }

    const isValid = verifyRazorpayPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.warn(
        `[Razorpay Verify] Invalid payment signature for order ${razorpay_order_id}`
      );
      return NextResponse.json(
        { error: "Payment signature verification failed" },
        { status: 401 }
      );
    }

    return NextResponse.json({ verified: true });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    console.error("[Razorpay Verify] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
