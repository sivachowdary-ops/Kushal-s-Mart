"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useDiwaliOffer } from "@/lib/use-diwali-offer";

// Once per visit: sessionStorage clears when the visitor closes the site, so it shows again next time
const STORAGE_KEY = "km_diwali_popup_seen";

/** Once-per-visit Diwali offer announcement. Shows only while the offer runs (dates in lib/offers.ts). */
export function DiwaliPopup() {
  const active = useDiwaliOffer();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!active) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return; // storage blocked — skip the pop-up rather than show it on every page
    }
    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
  }

  if (!open || !active) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#111625]/60 backdrop-blur-xs" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="diwali-popup-title"
        className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl"
      >
        <div className="relative bg-[#4A0D4F] bg-[radial-gradient(circle,#FFC21A_3px,transparent_4px)] bg-[length:26px_16px] bg-[position:0_8px] bg-repeat-x px-7 pt-10 pb-7 text-white">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-sm font-bold text-white/80">Diwali offer</p>
          <h2 id="diwali-popup-title" className="mt-2">
            <span className="font-display flex items-end gap-2">
              <span className="text-7xl font-extrabold leading-[0.85] tracking-tighter text-[#FFC21A]">10%</span>
              <span className="pb-0.5 text-3xl font-extrabold">off</span>
            </span>
            <span className="font-display mt-3 block text-2xl font-bold leading-tight">on every product</span>
          </h2>
        </div>
        <div className="space-y-4 px-7 pt-6 pb-7">
          <p className="text-[15px] font-semibold leading-relaxed text-gray-700">
            Pick anything in the store. Your 10% comes off on the Razorpay payment page when you pay online.
          </p>
          <Link
            href="/shop"
            onClick={close}
            className="flex min-h-[52px] items-center justify-center rounded-2xl bg-[#D3150F] text-[15px] font-extrabold text-white hover:bg-red-700 transition-colors"
          >
            Shop the offer
          </Link>
        </div>
      </div>
    </div>
  );
}
