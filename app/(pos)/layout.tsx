"use client";

import { AdminStoreProvider } from "@/lib/admin-store";

export default function StandalonePOSLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminStoreProvider>
      <div className="min-h-screen bg-[#F4F5F7] flex flex-col antialiased selection:bg-red-500 selection:text-white">
        {/* Store Counter Terminal Header */}
        <header className="bg-[#1A1D29] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-md shrink-0 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white font-black text-sm shadow-md">
              KM
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight">
                Kushal&apos;s Mart
              </h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Store POS Terminal Register
              </p>
            </div>
          </div>
        </header>

        {/* Main Terminal Viewport */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-hidden max-w-full">
          {children}
        </main>
      </div>
    </AdminStoreProvider>
  );
}
