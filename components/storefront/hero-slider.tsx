"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Bus, Pause, Play, Truck } from "lucide-react";

type Theme = "light" | "dark"; // text colour on the coloured box

interface Sticker {
  big: string;
  small: string;
  className: string;
}

interface ProductSlide {
  id: string;
  tab: { label: string; hint: string };
  field: string; // the box colour, full width
  theme: Theme;
  kicker: string;
  title: [string, string];
  titleAccent?: string; // colour class for the second line
  body: string;
  cta: { label: string; href: string; className: string };
  secondary: { label: string; href: string };
  images: { src: string; alt: string; className: string }[];
  sticker?: Sticker;
  caption?: string;
}

const CLOUDINARY = "https://res.cloudinary.com/tj31l4q8/image/upload/f_auto,q_auto,w_900/kushals-mart/products";

// Each banner reads like a toy box: the brand colour is the box, the real catalogue photo sits in a light
// display window, and the scale is the sticker on the window's corner.
// No prices on the banners, so they can't go out of date.
const SLIDES: ProductSlide[] = [
  {
    id: "rc",
    tab: { label: "RC cars", hint: "Off-road 4×4s" },
    field: "bg-[#D3150F]",
    theme: "light",
    kicker: "Off-road and on-road RC cars",
    title: ["Off-road ready.", "Remote in hand."],
    body: "Crawlers, monster trucks and 4×4s with 2.4 GHz remotes and rechargeable batteries.",
    cta: { label: "Shop RC cars", href: "/category/rc-cars", className: "bg-white text-[#111625] hover:bg-gray-100" },
    secondary: { label: "View off-road", href: "/category/rc-cars?sub=off-road" },
    images: [{ src: "/products/thar-rox-yellow-1.webp", alt: "Thar Rox 1:18 RC car", className: "w-[86%]" }],
    sticker: { big: "1:18", small: "scale RC", className: "bg-[#111625] text-[#FFC21A] -rotate-6" },
    caption: "Thar Rox, full metal body, 15 km/h",
  },
  {
    id: "drift",
    tab: { label: "Drift", hint: "On-road and rally" },
    field: "bg-[#111625]",
    theme: "light",
    kicker: "Drift and on-road RC",
    title: ["Built to slide.", "Made to race."],
    titleAccent: "text-[#FFC21A]",
    body: "Drift cars, rally racers and supercars for the desk, the floor or the track.",
    cta: { label: "Shop drift cars", href: "/category/rc-cars?sub=on-road", className: "bg-[#FFC21A] text-[#111625] hover:bg-yellow-300" },
    secondary: { label: "All RC cars", href: "/category/rc-cars" },
    images: [{ src: "/products/polo-drift-red-1.webp", alt: "1/24 Polo RC drift car", className: "w-[90%]" }],
    sticker: { big: "4WD", small: "1/24 scale", className: "bg-[#FFC21A] text-[#111625] rotate-6" },
    caption: "1/24 Polo RC drift, 4WD",
  },
  {
    id: "diecast",
    tab: { label: "Diecast", hint: "1/34 and 1/36 scale" },
    field: "bg-[#FFC21A]",
    theme: "dark",
    kicker: "Diecast metal collectibles",
    title: ["Metal you", "can collect."],
    body: "Opening doors, pull-back action, lights and sound. Scale replicas for the shelf and the playroom.",
    cta: { label: "Shop diecast", href: "/category/diecast-metal-cars", className: "bg-[#111625] text-white hover:bg-black" },
    secondary: { label: "See 1/34 & 1/36", href: "/category/diecast-metal-cars?sub=1-34-1-36-scale" },
    images: [
      // Side by side, never overlapping: the Urus a little lower and larger in front, the BMW behind it on the right
      { src: `${CLOUDINARY}/ay6eya5puefjxvndgpu6`, alt: "1/36 Lamborghini Urus diecast model", className: "w-[50%] translate-y-[10%]" },
      { src: `${CLOUDINARY}/zht6jisxzh9e7wupkhpq`, alt: "1/36 BMW XM diecast model", className: "w-[44%] -translate-y-[10%]" },
    ],
    sticker: { big: "1/34 & 1/36", small: "new scale", className: "bg-[#D3150F] text-white -rotate-3" },
  },
];

const DELIVERY_TAB = { label: "Delivery", hint: "24–48 hrs in AP & TS" };
const TABS = [...SLIDES.map((s) => s.tab), DELIVERY_TAB];
const SLIDE_COUNT = TABS.length;

const TEXT = {
  light: { kicker: "text-white/75", body: "text-white/80", heading: "text-white", ghost: "border-white/45 text-white hover:bg-white/10" },
  dark: { kicker: "text-[#111625]/70", body: "text-[#3A3320]", heading: "text-[#111625]", ghost: "border-[#111625]/70 text-[#111625] hover:bg-black/5" },
};

const CTA_BASE = "inline-flex min-h-[52px] items-center justify-center whitespace-nowrap rounded-2xl px-5 text-sm font-extrabold transition-colors sm:px-6 sm:text-[15px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--focus)";

/** Shared poster layout. Phones: copy, window, buttons in one column. Desktop: copy and buttons left, window right. */
function PosterFrame({
  field,
  theme,
  copy,
  actions,
  window: windowContent,
  sticker,
}: {
  field: string;
  theme: Theme;
  copy: ReactNode;
  actions: ReactNode;
  window: ReactNode;
  sticker?: Sticker;
}) {
  return (
    <div className={`${field} h-full`}>
      <div
        className={`mx-auto grid h-full max-w-7xl gap-x-12 gap-y-5 px-5 pt-7 pb-8 sm:px-6 sm:pt-10 sm:pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-rows-[1fr_auto_auto_1fr] lg:px-8 lg:py-12 ${theme === "light" ? "[--focus:white]" : "[--focus:#111625]"}`}
      >
        <div className="space-y-3 sm:space-y-4 lg:col-start-1 lg:row-start-2">{copy}</div>

        {/* The display window */}
        <div className="relative lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-center">
          <div className="relative flex h-[210px] items-center justify-center overflow-hidden rounded-[22px] bg-[#F2F0EB] ring-[5px] ring-inset ring-white/60 sm:h-[300px] lg:h-[400px] lg:rounded-[30px] xl:h-[420px]">
            {windowContent}
          </div>
          {sticker && (
            <div className={`absolute -right-1.5 -top-3 flex flex-col items-center rounded-2xl px-3.5 py-2.5 shadow-[0_6px_16px_rgba(0,0,0,0.25)] sm:-right-3 sm:-top-4 lg:px-5 lg:py-3.5 ${sticker.className}`}>
              <span className="font-display text-lg font-extrabold leading-none sm:text-2xl lg:text-3xl">{sticker.big}</span>
              <span className="mt-1 text-[10px] font-bold sm:text-xs">{sticker.small}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:col-start-1 lg:row-start-3 lg:pt-3">{actions}</div>
      </div>
    </div>
  );
}

function ProductPoster({ slide, priority }: { slide: ProductSlide; priority: boolean }) {
  const t = TEXT[slide.theme];
  return (
    <PosterFrame
      field={slide.field}
      theme={slide.theme}
      sticker={slide.sticker}
      copy={
        <>
          <p className={`text-sm font-bold sm:text-base ${t.kicker}`}>{slide.kicker}</p>
          <h2 className={`text-[36px] font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-[52px] xl:text-[68px] ${t.heading}`}>
            <span className="font-display block lg:whitespace-nowrap">{slide.title[0]}</span>
            <span className={`font-display block lg:whitespace-nowrap ${slide.titleAccent ?? ""}`}>{slide.title[1]}</span>
          </h2>
          <p className={`hidden max-w-[460px] text-lg font-semibold leading-relaxed sm:block ${t.body}`}>{slide.body}</p>
        </>
      }
      actions={
        <>
          <Link href={slide.cta.href} className={`${CTA_BASE} flex-1 shadow-lg sm:flex-none ${slide.cta.className}`}>
            {slide.cta.label}
          </Link>
          <Link href={slide.secondary.href} className={`${CTA_BASE} border-2 font-bold ${t.ghost}`}>
            {slide.secondary.label}
          </Link>
        </>
      }
      window={
        <>
          {slide.images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element -- remote product photos, white background blended into the window
            <img
              key={img.src}
              src={img.src}
              alt={img.alt}
              className={`h-auto max-h-[92%] object-contain mix-blend-multiply ${img.className}`}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          ))}
          {slide.caption && (
            <p className="absolute bottom-3 left-4 hidden text-sm font-bold text-[#3B4152] sm:block lg:bottom-5 lg:left-6">{slide.caption}</p>
          )}
        </>
      }
    />
  );
}

function DeliveryPoster() {
  return (
    <PosterFrame
      field="bg-[#111625]"
      theme="light"
      copy={
        <>
          <p className="flex items-center gap-2 text-sm font-bold text-[#FFC21A] sm:text-base">
            <Bus className="h-5 w-5" /> Fast delivery by APSRTC
          </p>
          <h2 className="text-white">
            <span className="font-display flex items-end gap-3">
              <span className="whitespace-nowrap text-[76px] font-extrabold leading-[0.82] tracking-tighter text-[#FFC21A] sm:text-[120px] lg:text-[96px] xl:text-[124px]">24–48</span>
              <span className="pb-1 text-3xl font-extrabold sm:text-5xl lg:text-4xl xl:text-5xl">hours</span>
            </span>
            <span className="font-display mt-3 block text-xl font-bold leading-tight sm:text-3xl xl:text-4xl">
              to your door across Andhra Pradesh &amp; Telangana.
            </span>
          </h2>
        </>
      }
      actions={
        <>
          <Link href="/shop" className={`${CTA_BASE} flex-1 bg-white text-[#111625] shadow-lg hover:bg-gray-100 sm:flex-none`}>
            Start shopping
          </Link>
          <Link href="/track-order" className={`${CTA_BASE} border-2 border-white/45 font-bold text-white hover:bg-white/10`}>
            Track your order
          </Link>
        </>
      }
      window={
        <div className="flex w-full flex-col gap-2.5 p-4 sm:gap-4 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3 rounded-2xl border-[3px] border-[#D3150F] bg-white p-3 sm:gap-4 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D3150F] text-white sm:h-14 sm:w-14 sm:rounded-2xl"><Bus className="h-6 w-6 sm:h-7 sm:w-7" /></div>
            <div>
              <p className="text-xs font-bold text-red-700 sm:text-sm">Andhra Pradesh &amp; Telangana</p>
              <p className="font-display text-xl font-extrabold text-[#111625] sm:text-3xl">24–48 hours</p>
              <p className="hidden text-sm font-semibold text-gray-600 sm:block">Delivered by APSRTC</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border-[3px] border-[#E0DCD3] bg-white p-3 sm:gap-4 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111625] text-[#FFC21A] sm:h-14 sm:w-14 sm:rounded-2xl"><Truck className="h-6 w-6 sm:h-7 sm:w-7" /></div>
            <div>
              <p className="text-xs font-bold text-gray-600 sm:text-sm">Rest of India</p>
              <p className="font-display text-xl font-extrabold text-[#111625] sm:text-3xl">3–5 business days</p>
              <p className="hidden text-sm font-semibold text-gray-600 sm:block">Delivered by Delhivery</p>
            </div>
          </div>
          <p className="hidden text-sm font-bold text-[#3B4152] sm:block">Free shipping on every order, with live tracking by phone number.</p>
        </div>
      }
    />
  );
}

/** Homepage hero carousel: three product posters plus the APSRTC delivery poster, with a labelled tab strip. */
export function HeroSlider() {
  // The previous slide stays shown under the new one while it fades in, so the page never shows through
  const [{ current: currentIndex, previous: previousIndex }, setSlide] = useState({ current: 0, previous: -1 });
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback(
    (idx: number) => setSlide((s) => ({ current: (idx + SLIDE_COUNT) % SLIDE_COUNT, previous: s.current })),
    []
  );
  const nextSlide = useCallback(() => setSlide((s) => ({ current: (s.current + 1) % SLIDE_COUNT, previous: s.current })), []);
  const prevSlide = useCallback(() => setSlide((s) => ({ current: (s.current - 1 + SLIDE_COUNT) % SLIDE_COUNT, previous: s.current })), []);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // The timer is the active tab's progress bar (see .hero-progress): it runs while nothing pauses it.
  const running = !userPaused && !hovered && !keyboardFocus && !pageHidden;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) nextSlide();
      else prevSlide();
    }
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative w-full"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocus={(e) => setKeyboardFocus(e.target.matches(":focus-visible"))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeyboardFocus(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") nextSlide();
        if (e.key === "ArrowLeft") prevSlide();
      }}
    >
      {/* All slides share one grid cell, so the banner keeps the height of the tallest one and never jumps */}
      <div className="grid touch-pan-y overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {Array.from({ length: SLIDE_COUNT }, (_, idx) => {
          const active = idx === currentIndex;
          return (
            <div
              key={idx}
              id={`hero-slide-${idx}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} of ${SLIDE_COUNT}: ${TABS[idx].label}`}
              inert={!active}
              className={`[grid-area:1/1] transition-opacity duration-500 motion-reduce:transition-none ${active ? "z-10 opacity-100" : idx === previousIndex ? "opacity-100" : "invisible opacity-0"}`}
            >
              {idx < SLIDES.length ? <ProductPoster slide={SLIDES[idx]} priority={idx === 0} /> : <DeliveryPoster />}
            </div>
          );
        })}
      </div>

      {/* Tab strip: names every slide, shows which one is on and how long until the next */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-stretch px-2 sm:px-4 lg:px-6">
          <div className="grid flex-1 grid-cols-4">
            {TABS.map((tab, idx) => {
              const active = idx === currentIndex;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => goTo(idx)}
                  aria-controls={`hero-slide-${idx}`}
                  aria-current={active}
                  className="group flex min-h-[52px] flex-col justify-center gap-1.5 px-2 pt-3 pb-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#111625] sm:px-3"
                >
                  <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-gray-200">
                    {active && (
                      <span
                        key={currentIndex}
                        className="hero-progress absolute inset-0 origin-left rounded-full bg-[#D3150F]"
                        style={{ animationPlayState: running ? "running" : "paused" }}
                        onAnimationEnd={nextSlide}
                      />
                    )}
                  </span>
                  <span className={`text-[13px] font-bold sm:text-sm ${active ? "text-[#111625]" : "text-gray-500 group-hover:text-[#111625]"}`}>{tab.label}</span>
                  <span className="hidden text-xs font-medium text-gray-500 lg:block">{tab.hint}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
            className="my-auto ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-[#111625] focus-visible:outline-2 focus-visible:outline-[#111625]"
          >
            {userPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </section>
  );
}
