"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Bus, ChevronLeft, ChevronRight, Truck } from "lucide-react";

type Theme = "light" | "dark"; // text colour on the coloured block

interface PosterSlide {
  id: string;
  field: string; // background colour of the text block
  theme: Theme;
  kicker: string;
  kickerClass: string;
  title: [string, string];
  titleAccent?: string; // colour class for the second line
  body: string;
  cta: { label: string; href: string; className: string };
  secondary: { label: string; href: string };
  images: { src: string; alt: string; className: string }[];
  badge?: { big: string; small: string; className: string };
  caption?: string;
}

const CLOUDINARY = "https://res.cloudinary.com/tj31l4q8/image/upload/f_auto,q_auto,w_900/kushals-mart/products";

// Real catalogue photos on a light "showroom" panel, a bold colour block for the message.
// No prices on the banners, so they can't go out of date.
const SLIDES: PosterSlide[] = [
  {
    id: "rc",
    field: "bg-[#D3150F]",
    theme: "light",
    kicker: "RC CARS · OFF-ROAD & ON-ROAD",
    kickerClass: "bg-white/15 text-white",
    title: ["Off-road ready.", "Remote in hand."],
    body: "Crawlers, monster trucks and 4×4s with 2.4 GHz remotes and rechargeable batteries.",
    cta: { label: "Shop RC cars", href: "/category/rc-cars", className: "bg-white text-[#111625] hover:bg-gray-100" },
    secondary: { label: "View off-road", href: "/category/rc-cars?sub=off-road" },
    images: [{ src: "/products/thar-rox-yellow-1.webp", alt: "Thar Rox 1:18 RC car", className: "w-[92%] lg:w-[88%]" }],
    badge: { big: "1:18", small: "SCALE RC", className: "bg-[#111625] text-[#FFC21A] -rotate-6" },
    caption: "Thar Rox · Full metal body · 15 km/h",
  },
  {
    id: "drift",
    field: "bg-[#111625]",
    theme: "light",
    kicker: "DRIFT & ON-ROAD RC",
    kickerClass: "bg-[#FFC21A] text-[#111625]",
    title: ["Built to slide.", "Made to race."],
    titleAccent: "text-[#FFC21A]",
    body: "Drift cars, rally racers and supercars — for the desk, the floor or the track.",
    cta: { label: "Shop drift cars", href: "/category/rc-cars?sub=on-road", className: "bg-[#FFC21A] text-[#111625] hover:bg-yellow-300" },
    secondary: { label: "All RC cars", href: "/category/rc-cars" },
    images: [{ src: "/products/polo-drift-red-1.webp", alt: "1/24 Polo RC drift car", className: "w-[95%] lg:w-[92%]" }],
    badge: { big: "4WD", small: "1/24 SCALE", className: "bg-[#FFC21A] text-[#111625] rotate-6" },
    caption: "1/24 Polo RC Drift · 4WD",
  },
  {
    id: "diecast",
    field: "bg-[#FFC21A]",
    theme: "dark",
    kicker: "DIECAST METAL COLLECTIBLES",
    kickerClass: "bg-[#111625] text-[#FFC21A]",
    title: ["Metal you", "can collect."],
    body: "Opening doors, pull-back action, lights and sound — scale replicas for the shelf and the playroom.",
    cta: { label: "Shop diecast", href: "/category/diecast-metal-cars", className: "bg-[#111625] text-white hover:bg-black" },
    secondary: { label: "See 1/34 & 1/36", href: "/category/diecast-metal-cars?sub=1-34-1-36-scale" },
    images: [
      { src: `${CLOUDINARY}/zht6jisxzh9e7wupkhpq`, alt: "1/36 BMW XM diecast model", className: "absolute right-[2%] top-[4%] w-[52%]" },
      { src: `${CLOUDINARY}/ay6eya5puefjxvndgpu6`, alt: "1/36 Lamborghini Urus diecast model", className: "relative mt-[14%] mr-[24%] w-[68%]" },
    ],
    badge: { big: "1/34 & 1/36", small: "NEW SCALE", className: "bg-[#D3150F] text-white -rotate-3" },
  },
];

const TEXT = {
  light: { body: "text-white/80", heading: "text-white", ghost: "border-white/50 text-white hover:bg-white/10" },
  dark: { body: "text-[#3A3320]", heading: "text-[#111625]", ghost: "border-[#111625] text-[#111625] hover:bg-black/5" },
};

function Poster({ slide }: { slide: PosterSlide }) {
  const t = TEXT[slide.theme];
  return (
    <div className="relative flex min-h-[620px] flex-col lg:min-h-[540px] lg:flex-row bg-[#EFEDE8]">
      {/* Message block (slanted edge on desktop) */}
      <div className={`relative z-10 ${slide.field} px-6 pt-10 pb-12 sm:px-12 lg:w-[57%] lg:px-16 lg:py-16 lg:[clip-path:polygon(0_0,100%_0,84%_100%,0_100%)]`}>
        <div className="max-w-[560px] space-y-5">
          <span className={`inline-block rounded-full px-3.5 py-1.5 text-[11px] sm:text-xs font-extrabold tracking-[0.12em] ${slide.kickerClass}`}>
            {slide.kicker}
          </span>
          <h2 className={`font-display text-[44px] sm:text-6xl lg:text-[76px] font-extrabold leading-[0.95] tracking-tight ${t.heading}`}>
            {slide.title[0]}
            <br />
            <span className={slide.titleAccent}>{slide.title[1]}</span>
          </h2>
          <p className={`max-w-[460px] text-base sm:text-lg font-semibold leading-relaxed ${t.body}`}>{slide.body}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={slide.cta.href}
              className={`inline-flex min-h-[52px] items-center gap-2 rounded-2xl px-6 text-sm font-extrabold tracking-wide shadow-lg transition-all hover:scale-[1.02] ${slide.cta.className}`}
            >
              {slide.cta.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={slide.secondary.href}
              className={`inline-flex min-h-[52px] items-center rounded-2xl border-2 px-5 text-sm font-bold transition-colors ${t.ghost}`}
            >
              {slide.secondary.label}
            </Link>
          </div>
        </div>
      </div>

      {/* Showroom: the real product photo (white background blends into the panel) */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-8 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[56%] lg:py-10">
        {slide.images.map((img) => (
          // eslint-disable-next-line @next/next/no-img-element -- remote product photos, blended with CSS
          <img key={img.src} src={img.src} alt={img.alt} className={`h-auto mix-blend-multiply ${img.className}`} loading="lazy" />
        ))}
        {slide.badge && (
          <div className={`absolute right-4 top-4 lg:right-12 lg:top-10 flex flex-col items-center justify-center rounded-2xl px-4 py-3 shadow-lg ${slide.badge.className}`}>
            <span className="font-display text-xl sm:text-3xl font-extrabold leading-none">{slide.badge.big}</span>
            <span className="mt-1 text-[10px] sm:text-[11px] font-extrabold tracking-[0.12em]">{slide.badge.small}</span>
          </div>
        )}
        {slide.caption && (
          <p className="absolute bottom-4 right-6 lg:bottom-8 lg:right-12 text-xs sm:text-sm font-bold text-[#3B4152]">{slide.caption}</p>
        )}
      </div>
    </div>
  );
}

function DeliveryPoster() {
  return (
    <div className="relative flex min-h-[620px] flex-col lg:min-h-[540px] lg:flex-row bg-[#EFEDE8]">
      <div className="relative z-10 bg-[#111625] px-6 pt-10 pb-12 text-white sm:px-12 lg:w-[57%] lg:px-16 lg:py-14 lg:[clip-path:polygon(0_0,100%_0,84%_100%,0_100%)]">
        <div className="max-w-[580px] space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FFC21A] px-3.5 py-1.5 text-[11px] sm:text-xs font-extrabold tracking-[0.12em] text-[#111625]">
            <Bus className="h-4 w-4" /> FAST DELIVERY BY APSRTC
          </span>
          <div className="flex items-end gap-3 font-display">
            <span className="text-[96px] sm:text-[136px] lg:text-[150px] font-extrabold leading-[0.82] tracking-tighter text-[#FFC21A]">24–48</span>
            <span className="pb-2 text-3xl sm:text-5xl font-extrabold">hours</span>
          </div>
          <h2 className="font-display text-2xl sm:text-4xl font-bold leading-tight">
            to your door across
            <br />
            Andhra Pradesh &amp; Telangana.
          </h2>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/shop" className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-white px-6 text-sm font-extrabold tracking-wide text-[#111625] shadow-lg hover:bg-gray-100 transition-colors">
              Start shopping <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/track-order" className="inline-flex min-h-[52px] items-center rounded-2xl border-2 border-white/40 px-5 text-sm font-bold text-white hover:bg-white/10 transition-colors">
              Track your order
            </Link>
          </div>
        </div>
      </div>
      <div className="relative flex flex-1 flex-col justify-center gap-4 px-6 py-8 sm:px-12 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[40%] lg:px-0 lg:pr-12">
        <div className="flex items-center gap-4 rounded-3xl border-[3px] border-[#D3150F] bg-white p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#D3150F] text-white"><Bus className="h-7 w-7" /></div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.12em] text-red-700">ANDHRA PRADESH &amp; TELANGANA</p>
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-[#111625]">24–48 hours</p>
            <p className="text-sm font-semibold text-gray-600">Delivered by APSRTC</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-3xl border-[3px] border-[#E0DCD3] bg-white p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111625] text-[#FFC21A]"><Truck className="h-7 w-7" /></div>
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.12em] text-gray-600">REST OF INDIA</p>
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-[#111625]">3–5 business days</p>
            <p className="text-sm font-semibold text-gray-600">Delivered by Delhivery</p>
          </div>
        </div>
        <p className="text-sm font-bold text-[#3B4152]">Free shipping on every order · Live tracking with your phone number</p>
      </div>
    </div>
  );
}

const SLIDE_COUNT = SLIDES.length + 1; // + the APSRTC delivery poster

/** Homepage hero carousel: three product posters plus the APSRTC delivery poster. */
export function HeroSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => setCurrentIndex((prev) => (prev + 1) % SLIDE_COUNT), []);
  const prevSlide = useCallback(() => setCurrentIndex((prev) => (prev - 1 + SLIDE_COUNT) % SLIDE_COUNT), []);

  // Long enough to read a poster
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [nextSlide, isPaused]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative w-full overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="animate-fade-in" key={currentIndex}>
        {currentIndex < SLIDES.length ? <Poster slide={SLIDES[currentIndex]} /> : <DeliveryPoster />}
      </div>

      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 z-30 hidden sm:flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-xl transition-all hover:scale-110 hover:bg-white"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-30 hidden sm:flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-xl transition-all hover:scale-110 hover:bg-white"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/25 px-3 py-2 backdrop-blur-sm">
        {Array.from({ length: SLIDE_COUNT }, (_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            aria-current={idx === currentIndex}
            className={`h-2.5 rounded-full transition-all duration-300 ${idx === currentIndex ? "w-8 bg-white" : "w-2.5 bg-white/60 hover:bg-white/90"}`}
          />
        ))}
      </div>
    </section>
  );
}
