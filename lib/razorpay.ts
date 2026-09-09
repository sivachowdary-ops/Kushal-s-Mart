/**
 * Razorpay Payments — Server-only
 * NEVER import this file from client components.
 *
 * Handles: order creation, payment signature verification,
 *          webhook signature verification, refunds.
 *
 * Security:
 *   - RAZORPAY_KEY_SECRET is never exposed to the client.
 *   - RAZORPAY_WEBHOOK_SECRET is separate from the API key secret.
 *   - All signature checks use crypto.timingSafeEqual (constant-time).
 *   - Webhook raw body is verified before JSON.parse.
 */
import crypto from "crypto";
import Razorpay from "razorpay";

// ─── Razorpay SDK Instance (lazy singleton) ────────────────────────────────────

let _instance: InstanceType<typeof Razorpay> | null = null;

function getRazorpay(): InstanceType<typeof Razorpay> {
  if (_instance) return _instance;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables must be set"
    );
  }

  _instance = new Razorpay({ key_id, key_secret });
  return _instance;
}

// ─── Order Creation ────────────────────────────────────────────────────────────

export interface RazorpayOrderParams {
  amountPaise: number;    // amount in paise (matches our DB)
  receipt: string;        // our orderNumber (e.g. KM-20260908-1234)
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;             // razorpay order_id (order_...)
  amount: number;         // in paise
  currency: string;
  receipt: string;
  status: string;
}

/**
 * Create an order on Razorpay's servers.
 * Amount is in paise — same as our DB, no conversion needed.
 */
export async function createRazorpayOrder(
  params: RazorpayOrderParams
): Promise<RazorpayOrderResponse> {
  const rzp = getRazorpay();

  const options = {
    amount: params.amountPaise,
    currency: "INR",
    receipt: params.receipt,
    notes: params.notes || {},
  };

  const order = await rzp.orders.create(options);
  return order as unknown as RazorpayOrderResponse;
}

// ─── Payment Signature Verification (Client Callback) ──────────────────────────

/**
 * Verify the payment signature returned by Razorpay Checkout to the client.
 * Formula: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
 *
 * This is used in /api/payments/verify to confirm the client callback is authentic.
 * The webhook is still the source of truth for marking orders as PAID.
 */
export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const payload = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison — never use === for signature checks
  try {
    const expected = Buffer.from(expectedSignature, "hex");
    const received = Buffer.from(razorpaySignature, "hex");
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

// ─── Webhook Signature Verification (Server-to-Server) ─────────────────────────

/**
 * Verify Razorpay webhook signature using HMAC-SHA256 + constant-time comparison.
 *
 * CRITICAL: `rawBody` MUST be the exact raw request text (via request.text()),
 * NOT a parsed-then-re-serialized JSON string.
 *
 * Formula: HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
 * Compare against x-razorpay-signature header.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  receivedSignature: string
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || !receivedSignature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison — never use === for signature checks
  try {
    const expected = Buffer.from(expectedSignature, "hex");
    const received = Buffer.from(receivedSignature, "hex");
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

// ─── Refunds ───────────────────────────────────────────────────────────────────

export interface RazorpayRefundParams {
  paymentId: string;      // razorpay payment_id (pay_...)
  amountPaise: number;    // refund amount in paise
  notes?: Record<string, string>;
  speed?: "normal" | "optimum";
}

/**
 * Create a refund on Razorpay.
 * Razorpay refunds are against the payment_id (not order_id).
 * Amount is in paise — same as our DB, no conversion needed.
 */
export async function createRazorpayRefund(
  params: RazorpayRefundParams
): Promise<Record<string, unknown>> {
  const rzp = getRazorpay();

  const refund = await rzp.payments.refund(params.paymentId, {
    amount: params.amountPaise,
    speed: params.speed || "normal",
    notes: params.notes || {},
  });

  return refund as unknown as Record<string, unknown>;
}
