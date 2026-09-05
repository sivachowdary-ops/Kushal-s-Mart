"use client";

/**
 * Floating WhatsApp Support Widget — Exact YouCliq style matching Screenshots 1, 2 & 3:
 * - Dark navy pill container (#111625) with soft shadow
 * - Vibrant green WhatsApp icon with online pulse dot
 * - "LIVE SUPPORT" / "WHATSAPP" uppercase text
 */
export function WhatsAppButton() {
  const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "917288907757";
  const PREBUILT_MESSAGE = encodeURIComponent(
    "Hi Kushal's Mart, I need help with a product.\n\nProduct Link: "
  );

  return (
    <aside aria-label="Live Support" className="fixed bottom-6 right-6 z-50">
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${PREBUILT_MESSAGE}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Live Support on WhatsApp"
        className="group flex items-center gap-3 rounded-2xl bg-[#111625] p-2.5 pr-5 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-black active:scale-95 border border-gray-800"
      >
        {/* WhatsApp Icon Box with Online Indicator Dot */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow">
          {/* Green Online Pulse Dot */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300 border-2 border-[#111625]"></span>
          </span>

          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>

        {/* Text Details */}
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-tight">
            LIVE SUPPORT
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-white leading-tight">
            WHATSAPP
          </span>
        </div>
      </a>
    </aside>
  );
}
