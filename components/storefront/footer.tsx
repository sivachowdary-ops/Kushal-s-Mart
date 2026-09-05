import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, Camera } from "lucide-react";

/**
 * Footer — Exact YouCliq style matching Screenshot 1:
 * - Pure dark background (#0B0F19 / black)
 * - Brand description & phone/email dark rounded pill buttons
 * - Platform & Customer Care link columns
 * - Connect section with Instagram & Inquiries pill buttons
 * - Location info (Prathipadu, Kakinada, AP, India)
 * - Bottom legal strip ("© 2026 KUSHAL'S MART. REDEFINING THE HOBBY.")
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0B0F19] text-white pt-16 pb-8 border-t border-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main 4-Column Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-zinc-800/80">
          
          {/* Column 1: Brand & Contact Pills */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 rounded-2xl overflow-hidden shadow-md bg-white border border-zinc-700/50 flex items-center justify-center">
                <Image
                  src="/kushal_mart_logo.jpeg"
                  alt="Kushal's Mart Logo"
                  fill
                  sizes="44px"
                  className="object-contain"
                />
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white block">
                  KUSHAL&apos;S
                </span>
                <span className="font-bold text-[10px] uppercase tracking-widest block text-red-500 -mt-0.5">
                  MART
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-gray-400 font-medium max-w-sm">
              Elevating the hobby experience in India. From competitive RC racing to premium scale collectibles, we curate the finest engineering for enthusiasts.
            </p>

            {/* Phone Dark Pill Button */}
            <a
              href="tel:+917288907757"
              className="inline-flex items-center gap-2.5 rounded-full bg-zinc-900 border border-zinc-800 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-zinc-800 hover:border-zinc-700 shadow-sm"
            >
              <Phone className="h-4 w-4 text-gray-400" />
              <span>+91 72889 07757</span>
            </a>

            <br />

            {/* Email Dark Pill Button */}
            <a
              href="mailto:jogabetha@gmail.com"
              className="inline-flex items-center gap-2.5 rounded-full bg-zinc-900 border border-zinc-800 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-zinc-800 hover:border-zinc-700 shadow-sm"
            >
              <Mail className="h-4 w-4 text-gray-400" />
              <span>jogabetha@gmail.com</span>
            </a>
          </div>

          {/* Column 2: PLATFORM Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-6">
              PLATFORM
            </h3>
            <ul className="space-y-3 text-xs font-semibold text-gray-400">
              <li>
                <Link href="/shop" className="hover:text-white transition-colors">
                  All Collections
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">
                  Shop by Category
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: CUSTOMER CARE Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-6">
              CUSTOMER CARE
            </h3>
            <ul className="space-y-3 text-xs font-semibold text-gray-400">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/policies/terms" className="hover:text-white transition-colors">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link href="/policies/refund" className="hover:text-white transition-colors">
                  Refund and Return Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/shipping" className="hover:text-white transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: CONNECT */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-6">
              CONNECT
            </h3>

            {/* Instagram Pill Button */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl bg-zinc-900 border border-zinc-800 px-5 py-3 text-xs font-bold text-white transition-colors hover:bg-zinc-800"
            >
              <Camera className="h-4 w-4 text-gray-400" />
              <span>Instagram</span>
            </a>

            {/* Inquiries Pill Button */}
            <Link
              href="/contact"
              className="flex items-center gap-3 rounded-2xl bg-zinc-900 border border-zinc-800 px-5 py-3 text-xs font-bold text-white transition-colors hover:bg-zinc-800"
            >
              <Mail className="h-4 w-4 text-gray-400" />
              <span>Inquiries</span>
            </Link>

            {/* Location */}
            <a
              href="https://www.google.com/maps?q=17.234193801879883,82.19078063964844&z=17&hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-medium text-gray-400 pt-2 hover:text-white transition-colors group"
            >
              <MapPin className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform shrink-0" />
              <span>Prathipadu, Kakinada, AP, India</span>
            </a>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          <p>© {currentYear} KUSHAL&apos;S MART. REDEFINING THE HOBBY.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href="/policies/refund" className="hover:text-gray-300 transition-colors">
              REFUND & RETURN
            </Link>
            <Link href="/policies/shipping" className="hover:text-gray-300 transition-colors">
              SHIPPING POLICY
            </Link>
            <Link href="/policies/privacy" className="hover:text-gray-300 transition-colors">
              PRIVACY POLICY
            </Link>
            <Link href="/policies/terms" className="hover:text-gray-300 transition-colors">
              TERMS OF SERVICE
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
