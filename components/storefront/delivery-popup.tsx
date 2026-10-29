"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "km_apsrtc_popup_seen";
const SHOW_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // once a week per visitor

/** One-time announcement: 24–48 hour APSRTC delivery in Andhra Pradesh & Telangana. */
export function DeliveryPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seenAt = 0;
    try {
      seenAt = Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
      return; // storage blocked — skip the pop-up rather than show it on every page
    }
    if (Date.now() - seenAt < SHOW_AGAIN_AFTER_MS) return;
    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#111625]/60 backdrop-blur-xs" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apsrtc-popup-title"
        className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl animate-scale-in"
      >
        <div className="relative bg-[#111625] px-7 pt-7 pb-6 text-white">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="inline-block rounded-full bg-[#FFC21A] px-3 py-1 text-[11px] font-extrabold tracking-[0.12em] text-[#111625]">
            NOW DELIVERING FASTER
          </span>
          <div className="mt-3 flex items-end gap-2 font-display">
            <span className="text-7xl font-extrabold leading-[0.85] tracking-tighter text-[#FFC21A]">24–48</span>
            <span className="pb-1 text-2xl font-extrabold">hours</span>
          </div>
          <h2 id="apsrtc-popup-title" className="mt-3 font-display text-2xl font-bold leading-tight">
            Delivery across Andhra Pradesh &amp; Telangana by APSRTC
          </h2>
        </div>
        <div className="space-y-3 px-7 pt-6 pb-7">
          <div className="flex items-center justify-between rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3">
            <span className="text-sm font-bold text-gray-900">Andhra Pradesh &amp; Telangana</span>
            <span className="text-sm font-extrabold text-red-700">24–48 hours</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-sm font-bold text-gray-900">Rest of India</span>
            <span className="text-sm font-extrabold text-gray-600">3–5 business days</span>
          </div>
          <Link
            href="/shop"
            onClick={close}
            className="mt-2 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-red-600 text-sm font-extrabold tracking-wide text-white hover:bg-red-700 transition-colors"
          >
            Start shopping <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-center text-xs font-semibold text-gray-500">Free shipping on every order</p>
        </div>
      </div>
    </div>
  );
}
