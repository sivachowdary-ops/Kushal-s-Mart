/**
 * Cashfree Payments API Client — Server-only
 * NEVER import this file from client components.
 *
 * Handles: order creation, webhook signature verification, refunds.
 * Auth: static API key headers (x-client-id + x-client-secret) on every request.
 * Webhook verification: HMAC-SHA256 with constant-time comparison.
 */
import crypto from "crypto";

// Confirmed current version from Cashfree docs — hardcoded in one place
export const CASHFREE_API_VERSION = "2026-01-01";

/** Returns sandbox or production base URL based on CASHFREE_ENV */
function getBaseUrl(): string {
  const env = process.env.CASHFREE_ENV || "sandbox";
  return env === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

/** Builds authenticated headers for Cashfree API calls */
function getHeaders(): Record<string, string> {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET environment variables must be set"
    );
  }

  return {
    "Content-Type": "application/json",
    "x-api-version": CASHFREE_API_VERSION,
    "x-client-id": clientId,
    "x-client-secret": clientSecret,
  };
}

// ─── Webhook Signature Verification ────────────────────────────────────────────

/**
 * Verify Cashfree webhook signature using HMAC-SHA256 + constant-time comparison.
 *
 * CRITICAL: `rawBody` MUST be the exact raw request text (via request.text()),
 * NOT a parsed-then-re-serialized JSON string. Cashfree's docs explicitly warn
 * that re-serialization changes key ordering/whitespace, breaking verification.
 *
 * Signature formula: base64(HMAC-SHA256(timestamp + rawBody, CASHFREE_CLIENT_SECRET))
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string,
  receivedSignature: string
): boolean {
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  if (!clientSecret || !timestamp || !receivedSignature) return false;

  const signedPayload = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac("sha256", clientSecret)
    .update(signedPayload)
    .digest("base64");

  // Constant-time comparison — never use === for signature checks
  try {
    const expected = Buffer.from(expectedSignature, "utf8");
    const received = Buffer.from(receivedSignature, "utf8");
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

// ─── Order Creation ────────────────────────────────────────────────────────────

export interface CashfreeOrderParams {
  orderId: string;       // our orderNumber (e.g. KM-20260908-1234)
  amount: number;        // rupees with up to 2 decimals — NOT paise
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl: string;     // where Cashfree redirects after payment
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  payment_session_id: string;
  order_status: string;
}

/**
 * Create an order on Cashfree's servers.
 * Returns payment_session_id needed by the frontend Drop-in Checkout SDK.
 */
export async function createCashfreeOrder(
  params: CashfreeOrderParams
): Promise<CashfreeOrderResponse> {
  const url = `${getBaseUrl()}/orders`;

  const body: Record<string, unknown> = {
    order_id: params.orderId,
    order_amount: params.amount,
    order_currency: "INR",
    customer_details: {
      customer_id: params.orderId, // no real customer accounts — use orderNumber
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      ...(params.customerEmail && { customer_email: params.customerEmail }),
    },
    order_meta: {
      return_url: params.returnUrl,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[Cashfree] Create Order failed:", JSON.stringify(data));
    throw new Error(
      data.message || `Cashfree API error (${res.status}): ${JSON.stringify(data)}`
    );
  }

  return data as CashfreeOrderResponse;
}

// ─── Refunds ───────────────────────────────────────────────────────────────────

export interface CashfreeRefundParams {
  cashfreeOrderId: string;  // the order_id we sent to Cashfree (our orderNumber)
  refundAmount: number;     // rupees with up to 2 decimals — NOT paise
  refundId: string;         // unique per refund attempt
  refundNote: string;
}

/**
 * Create a refund on Cashfree.
 * Supports both full and partial refunds (admin enters amount, capped at paid amount).
 */
export async function createCashfreeRefund(
  params: CashfreeRefundParams
): Promise<Record<string, unknown>> {
  const url = `${getBaseUrl()}/orders/${params.cashfreeOrderId}/refunds`;

  const body = {
    refund_amount: params.refundAmount,
    refund_id: params.refundId,
    refund_note: params.refundNote,
    refund_speed: "STANDARD",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[Cashfree] Refund failed:", JSON.stringify(data));
    throw new Error(
      data.message || `Cashfree Refund API error (${res.status}): ${JSON.stringify(data)}`
    );
  }

  return data;
}
