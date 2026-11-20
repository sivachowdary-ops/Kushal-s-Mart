// What the customer picks at checkout: home delivery, or collect from an APSRTC pickup point.
// Saved inside the order's shippingAddress JSON (delivery / pickupArea / pickupPoint keys),
// so no database change is needed. Used by checkout, the order API and the admin.

export type DeliveryChoice = "home" | "apsrtc_pickup";

export const DELIVERY_CHOICES: Record<DeliveryChoice, { label: string; eta: string; detail: string }> = {
  home: { label: "Home delivery", eta: "4–7 days", detail: "Courier to your address" },
  apsrtc_pickup: { label: "APSRTC pickup", eta: "24 hours", detail: "Collect from an APSRTC point near you" },
};

/**
 * Pickup points by area, from APSRTC's cargo booking-counter list (selected towns, not every counter).
 * Each town appears once: the order stores the town name, so a name can't be in two areas.
 */
export const PICKUP_AREAS: { area: string; state: string; points: string[] }[] = [
  {
    area: "Hyderabad",
    state: "Telangana",
    points: ["Miyapur", "JNTU", "KPHB", "Kukatpally", "SR Nagar", "Dilsukhnagar", "ECIL"],
  },
  { area: "North AP", state: "Andhra Pradesh", points: ["Srikakulam", "Palasa", "Tekkali", "Vizianagaram", "Bobbili", "Parvathipuram", "Saluru", "Rajam"] },
  { area: "Visakhapatnam", state: "Andhra Pradesh", points: ["Visakhapatnam", "Gajuwaka", "Anakapalle", "Chodavaram", "Narsipatnam", "Yellamanchili", "Paderu", "Araku"] },
  { area: "East Godavari", state: "Andhra Pradesh", points: ["Rajahmundry", "Kakinada", "Pithapuram", "Peddapuram", "Tuni", "Eleswaram", "Jaggampeta", "Kovvur", "Nidadavole"] },
  { area: "Konaseema", state: "Andhra Pradesh", points: ["Amalapuram", "Razole", "Ravulapalem", "Mandapeta", "Ramachandrapuram", "Kothapeta"] },
  { area: "West Godavari", state: "Andhra Pradesh", points: ["Bhimavaram", "Tanuku", "Palakollu", "Narasapuram", "Tadepalligudem"] },
  { area: "Krishna & NTR", state: "Andhra Pradesh", points: ["Vijayawada", "Gudivada", "Machilipatnam", "Gannavaram", "Avanigadda", "Jaggayyapeta", "Nandigama"] },
  { area: "Guntur & Palnadu", state: "Andhra Pradesh", points: ["Guntur", "Tenali", "Mangalagiri", "Ponnur", "Narasaraopet", "Chilakaluripet", "Piduguralla", "Sattenapalle"] },
  { area: "Prakasam", state: "Andhra Pradesh", points: ["Ongole", "Chirala", "Bapatla", "Addanki", "Markapur", "Kanigiri", "Podili", "Giddalur"] },
  { area: "Nellore", state: "Andhra Pradesh", points: ["Nellore", "Kavali", "Kandukur", "Atmakur", "Udayagiri", "Rapur"] },
  {
    area: "Rayalaseema",
    state: "Andhra Pradesh",
    points: ["Kadapa", "Proddatur", "Pulivendula", "Kurnool", "Nandyal", "Adoni", "Anantapur", "Guntakal", "Dharmavaram", "Hindupur", "Tirupati", "Chittoor", "Madanapalle"],
  },
];

export function isDeliveryChoice(value: unknown): value is DeliveryChoice {
  return value === "home" || value === "apsrtc_pickup";
}

/** The pickup point's area, or null if the point isn't on the list. */
export function findPickupPoint(point: string): { area: string; state: string; point: string } | null {
  for (const a of PICKUP_AREAS) {
    const match = a.points.find((p) => p === point);
    if (match) return { area: a.area, state: a.state, point: match };
  }
  return null;
}

export interface OrderDelivery {
  choice: DeliveryChoice;
  pickupPoint?: string;
  pickupArea?: string;
}

/** The customer's choice on an order. Null for orders placed before checkout asked. */
export function orderDeliveryOf(address: unknown): OrderDelivery | null {
  if (!address || typeof address !== "object") return null;
  const a = address as Record<string, unknown>;
  if (!isDeliveryChoice(a.delivery)) return null;
  return {
    choice: a.delivery,
    pickupPoint: typeof a.pickupPoint === "string" ? a.pickupPoint : undefined,
    pickupArea: typeof a.pickupArea === "string" ? a.pickupArea : undefined,
  };
}

/** "APSRTC pickup · Miyapur, Hyderabad" or "Home delivery" */
export function orderDeliveryLabel(d: OrderDelivery): string {
  if (d.choice === "home") return DELIVERY_CHOICES.home.label;
  const where = [d.pickupPoint, d.pickupArea].filter(Boolean).join(", ");
  return where ? `${DELIVERY_CHOICES.apsrtc_pickup.label} · ${where}` : DELIVERY_CHOICES.apsrtc_pickup.label;
}
