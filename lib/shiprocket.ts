/**
 * Shiprocket Direct Integration Helper — Kushal's Mart
 * 
 * Provides automated creation of shipping orders, AWB generation, and tracking lookup.
 * Uses environment variables SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.
 */

const SHIPROCKET_API_BASE = "https://apiv2.shiprocket.in/v1/external";

export interface ShiprocketOrderPayload {
  order_id: string; // e.g. "KM-20260828-0001"
  order_date: string; // e.g. "2026-08-28 14:30"
  pickup_location: string; // Registered warehouse name in Shiprocket dashboard (default: "Primary")
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  order_items: {
    name: string;
    sku: string;
    units: number;
    selling_price: number; // in Rupees
  }[];
  payment_method: "Prepaid" | "COD";
  sub_total: number; // in Rupees
  length: number; // cm
  breadth: number; // cm
  height: number; // cm
  weight: number; // kg
}

export interface ShiprocketOrderResponse {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  onboarding_completed_now: number;
  awb_code?: string;
  courier_company_id?: string;
  courier_name?: string;
}

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Authenticate with Shiprocket API and return a JWT access token.
 */
export async function getShiprocketToken(): Promise<string | null> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    console.warn("Shiprocket credentials (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD) not configured in environment variables.");
    return null;
  }

  // Return cached token if valid (valid for 9 days)
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const res = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Shiprocket Auth Failed:", errText);
      return null;
    }

    const data = await res.json();
    if (data.token) {
      cachedToken = data.token;
      // Cache token for 9 days (expires in 10 days)
      tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
      return cachedToken;
    }
    return null;
  } catch (error) {
    console.error("Error authenticating with Shiprocket:", error);
    return null;
  }
}

/**
 * Directly create an order in Shiprocket for automated fulfillment.
 */
export async function createDirectShiprocketOrder(
  payload: ShiprocketOrderPayload
): Promise<ShiprocketOrderResponse | null> {
  const token = await getShiprocketToken();
  if (!token) {
    console.warn("Unable to get Shiprocket token. Skipping automatic order push.");
    return null;
  }

  try {
    const res = await fetch(`${SHIPROCKET_API_BASE}/orders/create/adhoc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.order_id) {
      return data as ShiprocketOrderResponse;
    } else {
      console.error("Shiprocket Order Creation Error:", data);
      return null;
    }
  } catch (error) {
    console.error("Error pushing order to Shiprocket:", error);
    return null;
  }
}
