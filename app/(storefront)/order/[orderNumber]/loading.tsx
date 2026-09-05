"use client";

import { Loader2 } from "lucide-react";

export default function OrderLoading() {
  return (
    <div className="bg-[#F4F5F7] min-h-screen py-10 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200/80 shadow-sm text-center space-y-6 animate-pulse">
          
          {/* Header Skeleton */}
          <div className="space-y-3">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto shadow-xs border border-emerald-100">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-emerald-600" />
            </div>

            <div className="space-y-2">
              <div className="h-5 w-32 bg-emerald-100/60 rounded-full mx-auto" />
              <div className="h-8 w-64 bg-gray-200 rounded-2xl mx-auto" />
              <div className="h-4 w-48 bg-gray-100 rounded-xl mx-auto" />
            </div>

            <div className="h-4 w-80 bg-gray-100 rounded-xl mx-auto" />
          </div>

          {/* Timeline banner skeleton */}
          <div className="bg-gray-900 rounded-2xl p-5 h-16 w-full opacity-80" />

          {/* Items skeleton */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200/60 space-y-4">
            <div className="h-4 w-32 bg-gray-200 rounded-lg" />
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded-lg" />
                  <div className="h-3 w-24 bg-gray-200 rounded-lg" />
                </div>
                <div className="h-4 w-16 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
