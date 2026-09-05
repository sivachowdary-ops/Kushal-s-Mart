"use client";

import { useMemo } from "react";

// Mapping of variant color names to rich CSS hex values
export const COLOR_HEX_MAP: Record<string, string> = {
  // Compound / Model-specific
  "suv blue": "#2563EB",     // Bright Electric Blue
  "sedan blue": "#1E3A8A",   // Deep Navy Blue
  "suv orange": "#F97316",   // Bright Vivid Orange
  "sedan orange": "#C2410C", // Deep Burnt/Rust Orange
  "dark blue": "#1E3A8A",
  "light blue": "#38BDF8",
  "blue": "#2563EB",
  "sedan red": "#B91C1C",
  "red": "#DC2626",
  "black": "#111827",
  "yellow": "#FBBF24",
  "orange": "#F97316",
  "white": "#F9FAFB",
  "purple": "#7C3AED",
  "silver": "#94A3B8",
  "grey": "#6B7280",
  "gray": "#6B7280",
  "green": "#16A34A",
  "gold": "#EAB308",
};

/**
 * Returns a hex color for a given variant name or null if no color match
 */
export function getVariantColorHex(variantName: string): string | null {
  if (!variantName) return null;
  const normalized = variantName.toLowerCase().trim();
  const clean = normalized.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  // 1. Exact match on normalized or clean string
  if (COLOR_HEX_MAP[normalized]) return COLOR_HEX_MAP[normalized];
  if (COLOR_HEX_MAP[clean]) return COLOR_HEX_MAP[clean];

  // 2. Sort keys by length descending so "suv blue" matches before "blue"
  const sortedKeys = Object.keys(COLOR_HEX_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (clean.includes(key) || normalized.includes(key)) {
      return COLOR_HEX_MAP[key];
    }
  }

  return null;
}

export interface SwatchVariant {
  id: string;
  name: string;
  selling_price_override?: number | null;
  stock?: number;
}

interface ColorSwatchSelectorProps {
  variants: SwatchVariant[];
  selectedVariantId?: string;
  onSelectVariant?: (variantId: string) => void;
  mode?: "interactive" | "compact" | "gallery-bar"; // "interactive" for PDP, "compact" for product cards, "gallery-bar" for image overlay
}

export function ColorSwatchSelector({
  variants,
  selectedVariantId,
  onSelectVariant,
  mode = "interactive",
}: ColorSwatchSelectorProps) {
  const items = useMemo(() => {
    if (!variants || variants.length <= 1) return [];

    const seenHexes = new Set<string>();

    return variants.map((v, index) => {
      let hex = getVariantColorHex(v.name);
      if (!hex) {
        // Fallback attractive palette if no direct color keyword
        const fallbackColors = ["#111827", "#2563EB", "#DC2626", "#F97316", "#16A34A", "#7C3AED"];
        hex = fallbackColors[index % fallbackColors.length];
      }

      // If duplicate hex on the same product, slightly adjust shade so they never look identical
      if (seenHexes.has(hex)) {
        if (hex === "#2563EB") hex = "#1E40AF"; // alternate deep blue
        else if (hex === "#F97316") hex = "#C2410C"; // alternate deep orange
        else if (hex === "#DC2626") hex = "#991B1B"; // alternate deep red
        else if (hex === "#111827") hex = "#374151"; // alternate charcoal
      }
      seenHexes.add(hex);

      return {
        id: v.id,
        name: v.name,
        hex,
        stock: v.stock ?? 10,
      };
    });
  }, [variants]);

  if (items.length <= 1) return null;

  // Gallery Bar Mode: Frosted quick-picker directly on/under image
  if (mode === "gallery-bar") {
    const currentSelection = items.find((c) => c.id === selectedVariantId) || items[0];
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/95 backdrop-blur-md px-3.5 py-2 border border-gray-200/90 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">Color:</span>
          <span className="font-extrabold text-gray-900 text-xs">{currentSelection?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {items.map((item) => {
            const isSelected = (selectedVariantId || items[0]?.id) === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectVariant?.(item.id)}
                className={`group relative flex items-center justify-center rounded-full p-0.5 transition-all focus:outline-none cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-red-600 ring-offset-1 scale-110 shadow-sm"
                    : "hover:scale-105 ring-1 ring-gray-300 opacity-80 hover:opacity-100"
                }`}
                title={item.name}
                aria-label={`Select ${item.name}`}
              >
                <span
                  className="h-5 w-5 rounded-full border border-black/20 shadow-2xs block"
                  style={{ backgroundColor: item.hex }}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Compact Mode: for Product Cards (listing view) — deduplicated clean dots
  if (mode === "compact") {
    // Deduplicate by hex for listing preview
    const unique = Array.from(new Map(items.map((i) => [i.hex, i])).values());
    return (
      <div className="flex items-center gap-1.5 py-1" title={`${unique.length} options available`}>
        {unique.slice(0, 5).map((item) => (
          <span
            key={item.id}
            className="h-3 w-3 rounded-full border border-black/10 shadow-2xs transition-transform hover:scale-125"
            style={{ backgroundColor: item.hex }}
            title={item.name}
          />
        ))}
        {unique.length > 5 && (
          <span className="text-[10px] font-bold text-gray-400">
            +{unique.length - 5}
          </span>
        )}
      </div>
    );
  }

  // Interactive Mode: for Product Detail Page — MATCHES IMAGE 2 EXACTLY
  const currentSelection = items.find((c) => c.id === selectedVariantId) || items[0];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-wider text-gray-500">
          Color:{" "}
          <span className="text-gray-900 font-extrabold">
            {currentSelection?.name || "Select"}
          </span>
        </span>
        <span className="text-[11px] text-gray-400 font-medium">
          {items.length} options available
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {items.map((item) => {
          const isSelected = (selectedVariantId || items[0]?.id) === item.id;
          const isOutOfStock = item.stock <= 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectVariant?.(item.id)}
              className={`group relative flex items-center justify-center rounded-full p-1 transition-all focus:outline-none ${
                isSelected
                  ? "ring-2 ring-red-600 ring-offset-2 scale-110 shadow-sm"
                  : "hover:scale-105 ring-1 ring-gray-200 hover:ring-gray-300"
              } ${isOutOfStock ? "opacity-50" : ""}`}
              title={`${item.name} ${isOutOfStock ? "(Out of stock)" : ""}`}
              aria-label={item.name}
            >
              {/* Circular color dot */}
              <span
                className="h-7 w-7 rounded-full border border-black/15 shadow-inner transition-transform"
                style={{ backgroundColor: item.hex }}
              />

              {/* Discreet out-of-stock slash if actually out of stock */}
              {isOutOfStock && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="h-[1.5px] w-5 rotate-45 bg-gray-400/80" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
