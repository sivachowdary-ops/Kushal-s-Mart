"use client";

import { useSyncExternalStore } from "react";
import { DIWALI_OFFER, isDiwaliOfferActive } from "@/lib/offers";

const MAX_TIMEOUT_MS = 2_147_483_647; // setTimeout's limit, about 24 days

/** Calls back at the offer's next start or end, and when the visitor returns to the tab (phones pause timers). */
function subscribe(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    const next = [DIWALI_OFFER.startsAt, DIWALI_OFFER.endsAt].find((t) => t > Date.now());
    if (next === undefined) return;
    timer = setTimeout(() => {
      onChange();
      schedule();
    }, Math.min(next - Date.now(), MAX_TIMEOUT_MS));
  };
  schedule();
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/**
 * True while the Diwali offer runs, and flips by itself at 12am for someone already on the page.
 * `serverActive` is what the server rendered, so the first paint matches and the banner doesn't flash.
 */
export function useDiwaliOffer(serverActive = false): boolean {
  return useSyncExternalStore(subscribe, () => isDiwaliOfferActive(), () => serverActive);
}
