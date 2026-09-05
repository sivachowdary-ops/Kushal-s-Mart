import Link from "next/link";
import { ShieldCheck, Truck, Store, Headset, ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-16">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200/80 py-8 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-red-600 block mb-1">
            REDEFINING THE HOBBY IN INDIA
          </span>
          <h1 className="font-extrabold text-3xl sm:text-4xl text-gray-900 tracking-tight">
            About Kushal&apos;s Mart
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200/80 shadow-sm space-y-6">
          <h2 className="font-extrabold text-2xl text-gray-900">
            India&apos;s Premier Destination for RC Vehicles & Scale Diecast Models
          </h2>

          <div className="prose max-w-none text-xs sm:text-sm text-gray-600 leading-relaxed space-y-4 font-medium">
            <p>
              At Kushal&apos;s Mart, we are passionate hobbyists dedicated to bringing world-class RC (radio-controlled) crawlers, drift cars, monster trucks, engineering vehicles, and collectible diecast scale models to enthusiasts across India.
            </p>
            <p>
              With both an online storefront and a physical retail store in India, we ensure that every model we sell undergoes rigorous quality testing and inspection. Whether you are a beginner looking for your first 1/16 scale desktop drift car or a seasoned rock crawler enthusiast upgrading to metal axle assemblies, our expert team is here to support you.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
            {[
              { icon: Truck, label: "All-India Shipping" },
              { icon: ShieldCheck, label: "100% Genuine" },
              { icon: Store, label: "Offline Store" },
              { icon: Headset, label: "Expert Support" },
            ].map((item) => (
              <div key={item.label} className="text-center p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <item.icon className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <span className="text-xs font-bold text-gray-900">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 text-center">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-black px-8 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-red-600 transition-colors shadow-md"
            >
              <span>Explore Our Collections</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
