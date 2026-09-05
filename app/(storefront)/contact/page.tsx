import { Phone, Mail, MapPin, Clock, MessageCircle, ExternalLink } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-red-600 block mb-1">
            GET IN TOUCH
          </span>
          <h1 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
            Contact Kushal&apos;s Mart
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium max-w-2xl">
            Have questions about an RC vehicle, spare parts compatibility, or your order? Reach out to our hobby experts anytime.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Contact Cards */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-sm space-y-6">
            <h2 className="font-extrabold text-xl text-gray-900 border-b border-gray-100 pb-3">
              Direct Contact Details
            </h2>

            <div className="space-y-5">
              <a
                href="tel:+917288907757"
                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 transition-colors hover:border-red-500 hover:text-red-600"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase block">Phone Support</span>
                  <span className="font-extrabold text-base text-gray-900">+91 72889 07757</span>
                </div>
              </a>

              <a
                href="mailto:jogabetha@gmail.com"
                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 transition-colors hover:border-red-500 hover:text-red-600"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase block">Email Support</span>
                  <span className="font-extrabold text-base text-gray-900">jogabetha@gmail.com</span>
                </div>
              </a>

              <a
                href="https://wa.me/917288907757"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 transition-colors hover:bg-emerald-100"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shrink-0 shadow">
                  <MessageCircle className="h-6 w-6 fill-white" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase block">Instant Live Support</span>
                  <span className="font-extrabold text-base text-emerald-950">Chat on WhatsApp</span>
                </div>
              </a>
            </div>
          </div>

          {/* Store Location */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <h2 className="font-extrabold text-xl text-gray-900 border-b border-gray-100 pb-3">
                Visit Our Offline Store
              </h2>

              <div className="space-y-4 text-xs font-medium text-gray-700 mt-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Kushal&apos;s Mart Physical Store</h3>
                    <p className="text-gray-500 mt-0.5">Prathipadu, Kakinada District, Andhra Pradesh — 533432, India</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">17°14&apos;03.1&quot;N 82°11&apos;26.8&quot;E</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Store Hours</h3>
                    <p className="text-gray-500 mt-0.5">Monday – Saturday: 10:00 AM – 8:00 PM IST</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                  Store GSTIN: 37BAOPJ6159C2ZH
                </div>
              </div>
            </div>

            {/* Google Maps Button */}
            <a
              href="https://www.google.com/maps?q=17.234193801879883,82.19078063964844&z=17&hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center justify-center gap-2.5 w-full py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all shadow hover:shadow-md group"
            >
              <MapPin className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
              <span>Open in Google Maps</span>
              <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-white transition-colors" />
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
