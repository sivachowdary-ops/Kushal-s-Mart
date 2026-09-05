"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, ArrowRight, Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  selling_price: number;
  mrp: number;
  image_url: string | null;
  images: string[];
  category_name: string | null;
  brand: string | null;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/storefront/products?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
        }
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectProduct = (slug: string) => {
    onClose();
    router.push(`/product/${slug}`);
  };

  const handleViewAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onClose();
      router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[32px] bg-white p-5 sm:p-7 shadow-2xl border border-gray-100 animate-scale-in">
        
        {/* Search Input Bar (Matching user screenshot) */}
        <form onSubmit={handleViewAll} className="relative flex items-center rounded-2xl bg-gray-50/90 border border-gray-200/80 px-4 py-3.5 focus-within:bg-white focus-within:border-black transition-all">
          <Search className="h-5 w-5 text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search RC cars, Mini GT, Hot Wheels..."
            className="w-full bg-transparent text-sm sm:text-base font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Content Box (Matching user screenshot) */}
        <div className="mt-4">
          {/* State 1: Query is empty */}
          {!query.trim() && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xs text-gray-400">
                <Search className="h-7 w-7 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                Start typing to search products
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Search by name, scale (1/24, 1/18, 1/64), brand or category
              </p>
            </div>
          )}

          {/* State 2: Loading indicator */}
          {query.trim() && isLoading && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-red-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-500">Searching products...</p>
            </div>
          )}

          {/* State 3: Results Found */}
          {query.trim() && !isLoading && results.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <span>Products ({results.length})</span>
                <button
                  onClick={handleViewAll}
                  className="text-red-600 hover:underline inline-flex items-center gap-1 font-bold"
                >
                  View all in Shop <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {results.map((product) => {
                  const displayImg = product.image_url || (product.images && product.images[0]) || "";
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product.slug)}
                      className="group flex w-full items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-3 text-left transition-all hover:border-red-200 hover:bg-red-50/30 hover:shadow-sm"
                    >
                      {/* Thumbnail */}
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 border border-gray-100 p-1">
                        {displayImg ? (
                          <img
                            src={displayImg}
                            alt={product.name}
                            className="h-full w-full object-contain transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-gray-300" />
                        )}
                      </div>

                      {/* Product Information */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-red-600 transition-colors truncate">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 font-medium">
                          {product.category_name && <span>{product.category_name}</span>}
                          {product.category_name && product.brand && <span>•</span>}
                          {product.brand && <span>{product.brand}</span>}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-sm text-gray-900 block">
                          {formatPrice(product.selling_price)}
                        </span>
                        {product.mrp > product.selling_price && (
                          <span className="text-[11px] font-medium text-gray-400 line-through">
                            {formatPrice(product.mrp)}
                          </span>
                        )}
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-red-600 transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* State 4: No Results */}
          {query.trim() && !isLoading && results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center space-y-2">
              <Package className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-900">
                No products found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Check your spelling or try searching for general terms like &ldquo;crawlers&rdquo;, &ldquo;drift&rdquo;, or &ldquo;1/64&rdquo;.
              </p>
              <Link
                href="/shop"
                onClick={onClose}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline uppercase tracking-wider"
              >
                Browse All Products <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium px-1">
          <span>Press <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">ESC</kbd> to close</span>
          <span>Click anywhere outside to exit</span>
        </div>

      </div>
    </div>
  );
}
