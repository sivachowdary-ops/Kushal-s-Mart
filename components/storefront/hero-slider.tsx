"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Truck, 
  Settings, 
  Disc, 
  Lightbulb, 
  ThumbsUp, 
  Gauge, 
  Zap, 
  BatteryCharging, 
  Flag, 
  PackageCheck, 
  Sparkles, 
  ShieldCheck, 
  Trophy,
  type LucideIcon
} from "lucide-react";

export interface BannerFeature {
  icon: LucideIcon;
  label: string;
}

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  highlightTag?: string;
  priceTag?: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  features?: BannerFeature[];
}

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: "1",
    title: "1:16 SCALE 4WD RC CRAWLERS",
    subtitle: "EXPLORE OFF-ROAD ADVENTURES WITH HIGH TORQUE & PROPORTIONAL CONTROL",
    highlightTag: "BIG PRICE DROP",
    priceTag: "₹5,999",
    ctaText: "SHOP CRAWLERS NOW",
    ctaLink: "/category/rc-cars",
    imageUrl: "/banners/banner1.png",
    features: [
      { icon: Settings, label: "4X4 DRIVE" },
      { icon: Disc, label: "OFFROAD TIRES" },
      { icon: Lightbulb, label: "ROOF TOP LIGHT" },
      { icon: ThumbsUp, label: "BEGINNER FRIENDLY" },
    ],
  },
  {
    id: "2",
    title: "HIGH-SPEED DESKTOP DRIFT CARS",
    subtitle: "PRECISION STEERING & GYRO ASSIST FOR INDOOR & TRACK DRIFTING",
    highlightTag: "NEW ARRIVALS",
    priceTag: "₹1,499",
    ctaText: "EXPLORE DRIFT SERIES",
    ctaLink: "/category/rc-cars",
    imageUrl: "/banners/banner2.png",
    features: [
      { icon: Gauge, label: "GYRO ASSIST" },
      { icon: Zap, label: "2.4GHz CONTROL" },
      { icon: BatteryCharging, label: "RECHARGEABLE" },
      { icon: Flag, label: "EXTRA DRIFT TIRES" },
    ],
  },
  {
    id: "3",
    title: "1:64 SCALE DIECAST COLLECTIBLES",
    subtitle: "HOT WHEELS, TOMICA & MINI GT LIMITED EDITION MODEL CARS",
    highlightTag: "UP TO 70% OFF",
    priceTag: "₹499",
    ctaText: "VIEW COLLECTIBLES",
    ctaLink: "/category/diecast-metal-cars",
    imageUrl: "/banners/banner3.png",
    features: [
      { icon: PackageCheck, label: "MINT CONDITION" },
      { icon: Sparkles, label: "AUTHENTIC BRAND" },
      { icon: ShieldCheck, label: "SAFE PACKAGING" },
      { icon: Trophy, label: "COLLECTOR EDITION" },
    ],
  },
  {
    id: "4",
    title: "PREMIUM PRO SCALE MODELS & TRUCKS",
    subtitle: "HEAVY-DUTY DIECAST TRANSPORTERS, HYDRAULICS & PRO RACERS",
    highlightTag: "PREMIUM COLLECTION",
    priceTag: "₹9,999",
    ctaText: "SHOP PREMIUM MODELS",
    ctaLink: "/category/premium",
    imageUrl: "/banners/banner1.png",
    features: [
      { icon: Trophy, label: "PRO DIECAST" },
      { icon: ShieldCheck, label: "METAL CHASSIS" },
      { icon: Sparkles, label: "EXACT SCALE" },
      { icon: Truck, label: "FREE SHIPPING" },
    ],
  },
];

/**
 * HeroSlider — Real Car Banner Carousel matching YouCliq:
 * - High-definition dynamic vehicle banner images (/banners/banner1.png, etc.)
 * - Multi-banner slider with auto-play & manual controls (arrows + dots)
 * - Gradient overlay ensuring crisp typography on mobile & desktop
 * - Bottom feature bar strip
 */
export function HeroSlider({ slides = DEFAULT_SLIDES }: { slides?: BannerSlide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Fast auto-play timer (3 seconds optimal for e-commerce conversion)
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, [nextSlide, isHovered]);

  const activeSlide = slides[currentIndex];

  return (
    <div
      className="relative w-full overflow-hidden bg-black text-white select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slider Viewport Container */}
      <div className="relative min-h-[380px] sm:min-h-[460px] lg:min-h-[540px] w-full flex items-center">
        
        {/* Background Image with High-Res Fit */}
        <img
          src={activeSlide.imageUrl}
          alt={activeSlide.title}
          className="absolute inset-0 h-full w-full object-cover object-center transition-all duration-700 brightness-90"
        />

        {/* Dark Gradient Overlay for Crisp Text Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />

        {/* Banner Content Overlay Container */}
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-12 lg:px-16 w-full relative z-10">
          <div className="max-w-2xl">
            
            {/* Highlight Tag */}
            {activeSlide.highlightTag && (
              <div className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg mb-4 animate-fade-in">
                <Flame className="h-3.5 w-3.5 fill-white" />
                <span>{activeSlide.highlightTag}</span>
              </div>
            )}

            {/* Title */}
            <h1 className="font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-tight uppercase animate-fade-in drop-shadow-md">
              {activeSlide.title}
            </h1>

            {/* Subtitle */}
            <p className="mt-3 text-xs sm:text-base font-semibold text-gray-200 tracking-wide uppercase max-w-xl animate-fade-in drop-shadow">
              {activeSlide.subtitle}
            </p>

            {/* Price Tag */}
            {activeSlide.priceTag && (
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">STARTING AT</span>
                <span className="font-extrabold text-3xl sm:text-4xl text-yellow-400 drop-shadow">
                  {activeSlide.priceTag}
                </span>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={activeSlide.ctaLink}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-2xl transition-all duration-300 hover:bg-gray-100 hover:scale-105"
              >
                {activeSlide.ctaText} →
              </Link>
              <Link
                href="/track-order"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-xl transition-all duration-300 hover:bg-red-700 hover:scale-105"
              >
                <Truck className="h-4 w-4" />
                <span>TRACK ORDER</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Badges Strip */}
        {activeSlide.features && (
          <div className="absolute bottom-4 left-0 right-0 z-20 hidden md:block">
            <div className="mx-auto max-w-4xl bg-black/75 backdrop-blur-md rounded-2xl border border-white/10 px-6 py-2.5 flex items-center justify-between text-xs font-bold tracking-wider text-gray-100 shadow-xl">
              {activeSlide.features.map((feat, i) => {
                const IconComponent = feat.icon;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-red-500" />
                    <span>{feat.label}</span>
                    {i < activeSlide.features!.length - 1 && (
                      <span className="text-gray-600 ml-4">|</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Arrow Buttons (Left & Right) */}
      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white text-gray-900 shadow-2xl transition-all hover:scale-110 hover:bg-gray-100 focus:outline-none"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white text-gray-900 shadow-2xl transition-all hover:scale-110 hover:bg-gray-100 focus:outline-none"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? "w-8 bg-white"
                : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
