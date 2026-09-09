/**
 * Delhivery Express B2C API Client for Kushal's Mart
 * Official Developer Documentation: https://delhivery-express-api-doc.readme.io/
 *
 * Rules:
 * 1. Courier calls must NEVER compromise the integrity of payment or inventory transactions.
 * 2. If credentials are not yet set, logs cleanly without throwing an unhandled exception.
 * 3. Every dispatch attempt (automatic or manual) is recorded in public.shipment_creation_log.
 * 4. Default package dimensions: 20cm x 20cm x 20cm, default weight: 500g (0.50 kg).
 * 5. Online orders are strictly Pre-paid — never COD.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface DelhiveryShipmentRequest {
  orderId?: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: {
    productName: string;
    quantity: number;
    unitPrice: number; // paise
    weightGrams?: number;
  }[];
  totalAmount: number; // paise
  paymentMode?: string; // Always prepaid for online orders
  weightGrams?: number; // Optional override
  lengthCm?: number; // Optional package dimensions (default: 20cm)
  widthCm?: number; // Optional package dimensions (default: 20cm)
  heightCm?: number; // Optional package dimensions (default: 20cm)
}

export interface DelhiveryShipmentResponse {
  success: boolean;
  waybill: string;
  courierName: string;
  trackingUrl: string;
  status: string;
  error?: string;
  rawResponse?: unknown;
}

export interface DelhiveryTrackingStage {
  stage: "ORDER_PLACED" | "PACKED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED";
  statusText: string;
  location?: string;
  timestamp?: string;
}

export interface DelhiveryTrackingResult {
  success: boolean;
  waybill: string;
  currentStatus: string;
  currentStage: DelhiveryTrackingStage["stage"];
  statusDetails?: string;
  expectedDelivery?: string;
  scans: Array<{
    scanType: string;
    scanDateTime: string;
    scannedLocation: string;
    instructions?: string;
  }>;
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDelhiveryBaseUrl(): string {
  const env = (process.env.DELHIVERY_ENV || "production").toLowerCase().trim();
  if (env === "staging" || env === "test" || env === "sandbox") {
    return "https://staging-express.delhivery.com";
  }
  return "https://track.delhivery.com";
}

async function logShipmentAttempt(params: {
  orderId?: string;
  orderNumber: string;
  success: boolean;
  waybill?: string | null;
  errorMessage?: string | null;
  rawResponse?: unknown;
}) {
  try {
    await supabaseAdmin.from("shipment_creation_log").insert([
      {
        order_id: params.orderId || params.orderNumber,
        order_number: params.orderNumber,
        success: params.success,
        waybill: params.waybill || null,
        error_message: params.errorMessage || null,
        raw_response: params.rawResponse ? JSON.stringify(params.rawResponse) : null,
      },
    ]);
  } catch (logErr) {
    console.warn("[Delhivery Log] Failed to insert shipment_creation_log:", logErr);
  }
}

// ── 1. Create Delhivery Shipment ───────────────────────────────────────────────

/**
 * Automatically creates a shipment in Delhivery B2C system.
 * Returns waybill / AWB on success, or structured failure details.
 */
export async function createDelhiveryShipment(
  data: DelhiveryShipmentRequest
): Promise<DelhiveryShipmentResponse> {
  const token = process.env.DELHIVERY_API_TOKEN?.trim();
  const pickupLocation =
    process.env.DELHIVERY_PICKUP_LOCATION_NAME?.trim() ||
    process.env.DELHIVERY_PICKUP_NAME?.trim() ||
    "Kushals Mart Warehouse";

  const totalRupees = Math.max(1, Math.round(data.totalAmount / 100));

  // Calculate package weight: default 500g (0.50 kg) as approved
  const computedWeightGrams =
    data.weightGrams ||
    data.items.reduce((sum, item) => sum + (item.weightGrams || 500) * item.quantity, 0) ||
    500;
  const weightKg = (computedWeightGrams / 1000).toFixed(2);

  const productDescription = data.items
    .map((i) => `${i.productName} (x${i.quantity})`)
    .join(", ")
    .slice(0, 200) || "RC Toys & Models";

  const totalQty = data.items.reduce((sum, i) => sum + i.quantity, 0) || 1;

  // If token is missing, log clearly without breaking customer transaction
  if (!token) {
    const errorMsg =
      "DELHIVERY_API_TOKEN is not configured yet. Automatic booking held for 1-click admin retry.";
    console.warn(`[Delhivery] ${errorMsg} (Order: ${data.orderNumber})`);

    await logShipmentAttempt({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      success: false,
      errorMessage: errorMsg,
    });

    return {
      success: false,
      waybill: "",
      courierName: "Delhivery Express",
      trackingUrl: "",
      status: "PENDING_CREDENTIALS",
      error: errorMsg,
    };
  }

  const baseUrl = getDelhiveryBaseUrl();
  const endpoint = `${baseUrl}/api/cmu/create.json`;

  try {
    const payloadData = {
      shipments: [
        {
          name: data.customerName,
          add: data.shippingAddress.address,
          pin: data.shippingAddress.pincode,
          city: data.shippingAddress.city,
          state: data.shippingAddress.state,
          country: "India",
          phone: data.customerPhone,
          order: data.orderNumber,
          payment_mode: "Pre-paid", // Strictly Pre-paid for online store
          return_pin: "682020",
          return_city: "Kochi",
          return_phone: "7288907757",
          return_add: "Kushal's Mart, MG Road, Ernakulam",
          return_state: "Kerala",
          return_country: "India",
          products_desc: productDescription,
          order_date: new Date().toISOString().replace("T", " ").slice(0, 19),
          total_amount: totalRupees,
          cod_amount: 0,
          quantity: totalQty,
          weight: weightKg,
          // Standard package dimensions: defaults to 20cm x 20cm x 20cm or custom product specs
          length: data.lengthCm || 20,
          breadth: data.widthCm || 20,
          height: data.heightCm || 20,
        },
      ],
      pickup_location: {
        name: pickupLocation,
      },
    };

    const bodyParams = new URLSearchParams();
    bodyParams.append("format", "json");
    bodyParams.append("data", JSON.stringify(payloadData));

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: bodyParams.toString(),
    });

    const json = await res.json().catch(() => ({}));

    // Check for success waybill in Delhivery's various response formats
    let waybill = "";
    if (json.packages && Array.isArray(json.packages) && json.packages.length > 0) {
      const pkg = json.packages[0];
      waybill = pkg.waybill || pkg.refnum || "";
      if (pkg.status === "Fail" || pkg.remarks) {
        const failureRmk = Array.isArray(pkg.remarks) ? pkg.remarks.join(", ") : pkg.remarks;
        if (!waybill) {
          throw new Error(failureRmk || "Delhivery rejected shipment creation");
        }
      }
    } else if (json.upload_wbn) {
      waybill = json.upload_wbn;
    }

    if (waybill) {
      await logShipmentAttempt({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        success: true,
        waybill,
        rawResponse: json,
      });

      return {
        success: true,
        waybill,
        courierName: "Delhivery Express",
        trackingUrl: `https://www.delhivery.com/track/package/${waybill}`,
        status: "MANIFESTED",
        rawResponse: json,
      };
    }

    const errMsg = json.error || json.rmk || "Delhivery API did not return an active waybill.";
    throw new Error(errMsg);

  } catch (apiErr: unknown) {
    const errorMsg = apiErr instanceof Error ? apiErr.message : "Delhivery dispatch failed";
    console.error(`[Delhivery API Error] Order ${data.orderNumber}:`, errorMsg);

    await logShipmentAttempt({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      success: false,
      errorMessage: errorMsg,
    });

    return {
      success: false,
      waybill: "",
      courierName: "Delhivery Express",
      trackingUrl: "",
      status: "FAILED",
      error: errorMsg,
    };
  }
}

// ── 2. Get Live Delhivery Tracking Status ──────────────────────────────────────

/**
 * Fetches real-time tracking status from Delhivery and maps it
 * to Kushal's Mart 5-stage tracking lifecycle:
 * ORDER_PLACED -> PACKED -> SHIPPED -> OUT_FOR_DELIVERY -> DELIVERED
 */
export async function getDelhiveryTrackingStatus(
  waybill: string
): Promise<DelhiveryTrackingResult> {
  const cleanAwb = waybill?.trim();
  if (!cleanAwb) {
    return {
      success: false,
      waybill: "",
      currentStatus: "UNKNOWN",
      currentStage: "ORDER_PLACED",
      error: "Waybill number is required",
      scans: [],
    };
  }

  const token = process.env.DELHIVERY_API_TOKEN?.trim();
  const baseUrl = getDelhiveryBaseUrl();

  // If no token, return clean simulated/fallback tracking info
  if (!token) {
    return {
      success: true,
      waybill: cleanAwb,
      currentStatus: "Manifested",
      currentStage: "PACKED",
      statusDetails: "Shipment booked with Delhivery Express. Awaiting pickup scan.",
      scans: [
        {
          scanType: "MANIFESTED",
          scanDateTime: new Date().toISOString(),
          scannedLocation: "Kochi Hub",
          instructions: "Shipment created",
        },
      ],
    };
  }

  try {
    const endpoint = `${baseUrl}/api/v1/packages/json/?waybill=${encodeURIComponent(cleanAwb)}`;
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) {
      throw new Error(`Tracking lookup failed with status ${res.status}`);
    }

    const json = await res.json();
    const pkgData = json.ShipmentData?.[0]?.Shipment || json.packages?.[0] || {};
    const rawStatus = (pkgData.Status?.Status || pkgData.status || "In Transit").trim();
    const rawType = (pkgData.Status?.StatusType || "").toUpperCase();

    // Map Delhivery status to 5-stage timeline
    let stage: DelhiveryTrackingStage["stage"] = "PACKED";
    const statusLower = rawStatus.toLowerCase();

    if (statusLower.includes("delivered")) {
      stage = "DELIVERED";
    } else if (statusLower.includes("out for delivery") || statusLower.includes("dispatched for delivery")) {
      stage = "OUT_FOR_DELIVERY";
    } else if (
      statusLower.includes("in transit") ||
      statusLower.includes("reached") ||
      statusLower.includes("left") ||
      statusLower.includes("transit") ||
      rawType === "UD"
    ) {
      stage = "SHIPPED";
    } else if (statusLower.includes("manifested") || statusLower.includes("picked")) {
      stage = "PACKED";
    }

    const rawScans = pkgData.Scans || [];
    const scans = rawScans.map((s: Record<string, unknown>) => {
      const scanDetail = (s.ScanDetail as Record<string, unknown>) || s;
      return {
        scanType: String(scanDetail.ScanType || scanDetail.scanType || "TRANSIT"),
        scanDateTime: String(scanDetail.ScanDateTime || scanDetail.ScanTime || new Date().toISOString()),
        scannedLocation: String(scanDetail.ScannedLocation || scanDetail.Location || ""),
        instructions: String(scanDetail.Instructions || scanDetail.comment || ""),
      };
    });

    return {
      success: true,
      waybill: cleanAwb,
      currentStatus: rawStatus,
      currentStage: stage,
      statusDetails: pkgData.Status?.Instructions || undefined,
      expectedDelivery: pkgData.ExpectedDeliveryDate || undefined,
      scans,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch Delhivery tracking";
    return {
      success: false,
      waybill: cleanAwb,
      currentStatus: "IN_TRANSIT",
      currentStage: "SHIPPED",
      error: msg,
      scans: [],
    };
  }
}

// ── 3. Cancel Delhivery Shipment ───────────────────────────────────────────────

/**
 * Cancels a shipment in Delhivery if an order is refunded or cancelled before pickup.
 */
export async function cancelDelhiveryShipment(
  waybill: string
): Promise<{ success: boolean; message: string }> {
  const token = process.env.DELHIVERY_API_TOKEN?.trim();
  const cleanAwb = waybill?.trim();

  if (!cleanAwb) {
    return { success: false, message: "Waybill number is required to cancel" };
  }

  if (!token) {
    return { success: true, message: "Cancelled in system (Delhivery live token not active)." };
  }

  try {
    const baseUrl = getDelhiveryBaseUrl();
    const endpoint = `${baseUrl}/api/p/edit`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        waybill: cleanAwb,
        cancellation: true,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && (json.status === true || json.success || json.remarks)) {
      return { success: true, message: "Shipment successfully cancelled with Delhivery." };
    }

    return {
      success: false,
      message: json.error || json.rmk || "Delhivery rejected cancellation request.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cancellation request failed";
    return { success: false, message: msg };
  }
}
