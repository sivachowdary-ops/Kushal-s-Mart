"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ChevronRight, ShieldCheck, Truck, Check, Minus, Plus, MessageCircle, Package, ArrowRight, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { ColorSwatchSelector } from "@/components/storefront/color-swatch-selector";

interface Variant {
  id: string;
  name: string;
  sku: string;
  stock: number;
  selling_price_override: number | null;
  mrp_override: number | null;
  images: string[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  selling_price: number;
  mrp: number;
  images: string[];
  category_slug: string | null;
  category_name: string | null;
  discount_percent: number;
  in_stock: boolean;
  variants: Variant[];
}

export default function ProductDetailPage() {
  const router = useRouter();
  const urlParams = useParams();
  const slug = (urlParams?.slug as string) || "";
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [pincode, setPincode] = useState<string>("");
  const [deliveryResult, setDeliveryResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"desc" | "shipping">("desc");
  const [addedToCartToast, setAddedToCartToast] = useState<boolean>(false);

  // Fetch real product from Supabase via public API
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/storefront/products?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.product) {
          setProduct(d.product);
          setSelectedVariantId(d.product.variants[0]?.id || "");
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [slug]);

  const currentVariant = product?.variants.find((v) => v.id === selectedVariantId) || product?.variants[0];

  // Effective price: variant override takes priority over product price
  const activePrice = currentVariant?.selling_price_override ?? product?.selling_price ?? 0;
  const activeMrp = currentVariant?.mrp_override ?? product?.mrp ?? 0;
  const discountPercent = activeMrp > activePrice
    ? Math.round(((activeMrp - activePrice) / activeMrp) * 100)
    : 0;

  // Show variant-specific images if available, otherwise fall back to product images
  const activeImages = (currentVariant?.images?.length ?? 0) > 0
    ? (currentVariant?.images ?? [])
    : (product?.images ?? []);

  // Reset gallery to first image whenever the selected variant changes
  useEffect(() => {
    setSelectedImage(0);
  }, [selectedVariantId]);

  const whatsappMsg = product
    ? encodeURIComponent(`Hi Kushal's Mart, I want to order this product:\n\nProduct: ${product.name}\nVariant: ${currentVariant?.name || ""}\nPrice: ${formatPrice(activePrice)}`)
    : "";

  const handleAddToCart = () => {
    if (!product || !currentVariant) return;
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantId: currentVariant.id,
      variantName: currentVariant.name,
      price: activePrice,
      image: activeImages[0] || product.images[0] || "",
      quantity,
    });
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 3500);
  };

  const handleBuyNow = () => {
    if (!product || !currentVariant) return;
    // Express checkout shortcut: proceeds directly with just this single item without modifying persistent cart
    const params = new URLSearchParams({
      buyNow: "1",
      productId: product.id,
      variantId: currentVariant.id,
      variantName: currentVariant.name,
      productName: product.name,
      price: String(activePrice),
      image: activeImages[0] || product.images[0] || "",
      qty: String(quantity),
    });
    router.push(`/checkout?${params.toString()}`);
  };

  const checkPincode = () => {
    if (pincode.length === 6) {
      setDeliveryResult("Estimated Delivery in 3-5 Business Days across India.");
    } else {
      setDeliveryResult("Please enter a valid 6-digit Indian PIN code.");
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-[#F4F5F7] min-h-screen pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 h-96 bg-white rounded-3xl animate-pulse" />
            <div className="lg:col-span-5 space-y-4">
              <div className="h-8 bg-gray-200 rounded-xl animate-pulse w-3/4" />
              <div className="h-6 bg-gray-200 rounded-xl animate-pulse w-1/2" />
              <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-12 bg-red-100 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="bg-[#F4F5F7] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-sm text-gray-500 mb-6">This product may have been removed or is not available.</p>
          <Link href="/shop" className="rounded-full bg-black px-6 py-3 text-xs font-bold text-white uppercase tracking-wider hover:bg-red-600 transition-colors">
            Shop All Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F5F7] min-h-screen pb-28 lg:pb-16">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200/80 py-4 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Link href="/" className="hover:text-red-600">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/shop" className="hover:text-red-600">Shop</Link>
            {product.category_slug && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link href={`/category/${product.category_slug}`} className="hover:text-red-600">
                  {product.category_name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 truncate max-w-xs">{product.name}</span>
          </div>
        </div>
      </div>

      {/* Main PDP Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left: Image Gallery */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm lg:sticky lg:top-24">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 flex items-center justify-center p-4">
              {discountPercent > 0 && (
                <div className="absolute top-4 left-4 z-10 rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase text-white shadow">
                  {discountPercent}% OFF
                </div>
              )}
              {activeImages.length > 0 ? (
                <img
                  src={activeImages[selectedImage] || activeImages[0]}
                  alt={product.name}
                  className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-300">
                  <Package className="h-20 w-20" />
                  <span className="text-sm font-medium">Image coming soon</span>
                </div>
              )}
            </div>
            {activeImages.length > 1 && (
              <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none touch-pan-x snap-x">
                {activeImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`h-20 w-20 min-h-[44px] min-w-[44px] shrink-0 overflow-hidden rounded-2xl border-2 p-1 transition-all snap-start ${
                      selectedImage === idx ? "border-red-600 shadow-md ring-2 ring-red-100" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info & Actions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-sm space-y-5">

              {/* Brand & Stock */}
              <div className="flex items-center justify-between gap-2">
                {product.brand && (
                  <span className="text-xs font-black uppercase tracking-widest text-red-600">
                    {product.brand}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                  product.in_stock
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-orange-50 text-orange-700 border-orange-200"
                }`}>
                  <Check className="h-3.5 w-3.5" />
                  {product.in_stock ? "In Stock" : "Check Availability"}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-extrabold text-2xl sm:text-3xl text-gray-900 leading-tight">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 pt-1 border-t border-gray-100">
                <span className="font-extrabold text-3xl sm:text-4xl text-gray-900">
                  {formatPrice(activePrice)}
                </span>
                {activeMrp > activePrice && (
                  <span className="text-base font-semibold text-gray-400 line-through">
                    {formatPrice(activeMrp)}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="rounded-md bg-black px-2.5 py-1 text-xs font-black text-white uppercase tracking-wider">
                    Save {discountPercent}%
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Inclusive of all taxes. Free express shipping across India.
              </p>

              {/* Variant Selector — Circular Color Swatches matching Image 2 */}
              {product.variants.length > 1 && (
                <div className="pt-3 border-t border-gray-100">
                  <ColorSwatchSelector
                    variants={product.variants}
                    selectedVariantId={selectedVariantId}
                    onSelectVariant={setSelectedVariantId}
                    mode="interactive"
                  />
                </div>
              )}

              {/* Quantity Stepper */}
              <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Quantity:</label>
                <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm hover:bg-gray-100 active:scale-95 transition-all"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-extrabold text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm hover:bg-gray-100 active:scale-95 transition-all"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                {addedToCartToast && (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 text-xs font-bold animate-fade-in">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Added to cart! You can keep browsing or checkout from top cart.</span>
                  </div>
                )}
                <button
                  onClick={handleBuyNow}
                  className="w-full min-h-[48px] rounded-2xl bg-red-600 py-4 text-xs font-black uppercase tracking-wider text-white shadow-xl transition-all duration-300 hover:bg-red-700 hover:scale-[1.01] active:scale-95"
                >
                  BUY IT NOW (EXPRESS CHECKOUT)
                </button>
                <button
                  onClick={handleAddToCart}
                  className="w-full min-h-[48px] rounded-2xl bg-[#111625] py-4 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all duration-300 hover:bg-black active:scale-95"
                >
                  ADD TO CART
                </button>
                <a
                  href={`https://wa.me/917288907757?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md transition-all hover:bg-emerald-600 active:scale-95"
                >
                  <MessageCircle className="h-4 w-4 fill-white" />
                  <span>ORDER ON WHATSAPP</span>
                </a>
              </div>

              {/* Pincode Check */}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                  Check Delivery Pincode:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-900 focus:border-black focus:outline-none"
                  />
                  <button
                    onClick={checkPincode}
                    className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white uppercase"
                  >
                    Check
                  </button>
                </div>
                {deliveryResult && (
                  <p className="text-xs font-semibold text-emerald-700 mt-1">{deliveryResult}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product Info Tabs */}
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4 mb-6">
            <button
              onClick={() => setActiveTab("desc")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-colors ${
                activeTab === "desc" ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Description &amp; Highlights
            </button>
            <button
              onClick={() => setActiveTab("shipping")}
              className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-colors ${
                activeTab === "shipping" ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Shipping &amp; Guarantee
            </button>
          </div>

          {activeTab === "desc" && (
            <div className="prose max-w-none text-sm text-gray-700 leading-relaxed">
              {product.description ? (
                <p className="font-medium whitespace-pre-line">{product.description}</p>
              ) : (
                <p className="text-gray-400 italic">Full product description coming soon.</p>
              )}
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="space-y-4 text-xs font-medium text-gray-700">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-900">Free Express Delivery Across India</h4>
                  <p className="text-gray-500">Orders are packed in protective shockproof boxes and dispatched within 24 hours.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-900">100% Authentic Hobby Guarantee</h4>
                  <p className="text-gray-500">All products are genuine imported models inspected before dispatch.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar (Fixed on screens < lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase truncate">
              {currentVariant?.name || "Standard"}
            </div>
            <div className="text-lg font-black text-gray-900 leading-tight">
              {formatPrice(activePrice)}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAddToCart}
              className="min-h-[44px] rounded-2xl border-2 border-black bg-white px-3.5 py-2 text-xs font-black uppercase text-black hover:bg-gray-50 active:scale-95 transition-all"
            >
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              className="min-h-[44px] rounded-2xl bg-red-600 px-4 py-2 text-xs font-black uppercase text-white shadow-md hover:bg-red-700 active:scale-95 transition-all"
            >
              Buy It Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
