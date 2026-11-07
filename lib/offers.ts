// Festival offer dates. The banner and pop-up switch on and off by themselves at these exact
// moments (India time), wherever the visitor's device is. Change only these two lines to move them.
// The discount itself is set up in the Razorpay dashboard: keep its dates the same as these.
export const DIWALI_OFFER = {
  startsAt: Date.parse("2026-11-08T00:00:00+05:30"),
  endsAt: Date.parse("2026-11-09T00:00:00+05:30"),
};

export function isDiwaliOfferActive(now: number = Date.now()): boolean {
  return now >= DIWALI_OFFER.startsAt && now < DIWALI_OFFER.endsAt;
}
