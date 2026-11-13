"use client";

import { useState } from "react";
import { Bus, Copy } from "lucide-react";
import { rtcNumberOf, rtcPhoneHref, RTC_PORTAL_URL } from "@/lib/shipping";

/** APSRTC bus parcel on the Track Order page: the LR number to track with, the RTC number, and APSRTC's portal */
export function RtcShipmentBox({ lr, courierName }: { lr: string; courierName?: string | null }) {
  const [copied, setCopied] = useState(false);
  const rtcNumber = rtcNumberOf(courierName);
  const phoneHref = rtcPhoneHref(rtcNumber);

  const copyLr = async () => {
    try {
      await navigator.clipboard.writeText(lr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3 text-xs">
      <p className="flex items-center gap-2 font-extrabold text-amber-900">
        <Bus className="h-4 w-4 shrink-0" /> Sent by APSRTC bus parcel
      </p>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 border border-amber-200">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase text-gray-400">LR number</span>
          <span className="font-mono text-sm font-extrabold text-gray-900 break-all">{lr}</span>
        </div>
        <button
          type="button"
          onClick={copyLr}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 font-bold text-gray-700 hover:bg-gray-50"
        >
          <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {rtcNumber && (
        <div className="rounded-xl bg-white px-3 py-2.5 border border-amber-200">
          <span className="block text-[10px] font-bold uppercase text-gray-400">RTC number</span>
          {phoneHref ? (
            <a href={phoneHref} className="text-sm font-extrabold text-red-700 hover:underline">{rtcNumber}</a>
          ) : (
            <span className="text-sm font-extrabold text-gray-900">{rtcNumber}</span>
          )}
        </div>
      )}
      <a
        href={RTC_PORTAL_URL}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#111625] font-bold text-white hover:bg-black"
      >
        Track on APSRTC ↗
      </a>
      <p className="text-[11px] text-amber-900/80">
        Enter your LR number on the APSRTC portal. The status above is updated by Kushal&apos;s Mart.
      </p>
    </div>
  );
}
