// Delivery method helpers, shared by the admin, the customer tracking page and the courier sync.
//
// No extra database columns: an APSRTC order keeps its LR number in the tracking-number field
// (shiprocketAwb) and "APSRTC | <RTC number>" in courierName. Anything else with a tracking
// number is a Delhivery shipment, as before.

export const RTC_COURIER = "APSRTC";
const RTC_SEPARATOR = " | ";

/** APSRTC's cargo portal, linked from apsrtconline.in → Logistics. Customers track by LR number there. */
export const RTC_PORTAL_URL = "https://cargo.apsrtconline.in/";

export type DeliveryMethod = "DELHIVERY" | "APSRTC";

export function isRtcCourier(courierName?: string | null): boolean {
  return (courierName || "").trim().toUpperCase().startsWith(RTC_COURIER);
}

/** Which service is carrying the order, or null when nothing has been booked yet. */
export function deliveryMethodOf(order: { courier_name?: string | null; shiprocket_awb?: string | null }): DeliveryMethod | null {
  if (isRtcCourier(order.courier_name)) return "APSRTC";
  if (order.shiprocket_awb || (order.courier_name || "").toLowerCase().includes("delhivery")) return "DELHIVERY";
  return null;
}

/** courierName to save for an APSRTC booking */
export function rtcCourierName(rtcNumber: string): string {
  const number = rtcNumber.trim();
  return number ? `${RTC_COURIER}${RTC_SEPARATOR}${number}` : RTC_COURIER;
}

/** The RTC number saved with an APSRTC booking ("" if none) */
export function rtcNumberOf(courierName?: string | null): string {
  if (!isRtcCourier(courierName)) return "";
  const at = (courierName || "").indexOf(RTC_SEPARATOR.trim());
  return at >= 0 ? (courierName || "").slice(at + 1).trim() : "";
}

/** Digits of an RTC number when it looks like a phone number, for a tap-to-call link */
export function rtcPhoneHref(rtcNumber: string): string | null {
  const digits = rtcNumber.replace(/\D/g, "");
  return /^(0\d{9,10}|[6-9]\d{9}|91[6-9]\d{9})$/.test(digits) ? `tel:${digits.length === 12 ? `+${digits}` : digits}` : null;
}
