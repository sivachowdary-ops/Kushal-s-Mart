"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin-store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, Check, ImageIcon } from "lucide-react";
import { AdminProduct, AdminVariant } from "@/lib/admin-store";
import { ImageUploader } from "@/components/admin/image-uploader";

export default function NewProductPage() {
  const router = useRouter();
  const { categories, addProduct, isLoading } = useAdminStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [mrp, setMrp] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  // Dimensions & Weight — standard approved defaults (500g, 20x20x20cm), editable by admin
  const [weight, setWeight] = useState("500");
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("20");
  const [height, setHeight] = useState("20");
  
  // Media
  const [images, setImages] = useState<string[]>([]);

  // Automatically prune variant images whenever an image is removed/reordered from product images
  const handleImagesChange = (newImages: string[]) => {
    setImages(newImages);
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        images: (v.images || []).filter((url) => newImages.includes(url)),
      }))
    );
  };
  
  // Features
  const [badgeType, setBadgeType] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  
  // Array states
  const [whatsInTheBox, setWhatsInTheBox] = useState<string[]>([""]);
  const [specifications, setSpecifications] = useState<{key: string, value: string}[]>([{key: "", value: ""}]);
  const [variants, setVariants] = useState<Partial<AdminVariant>[]>([
    { name: "Default", sku: "", stock: 0, selling_price_override: null, mrp_override: null, low_stock_threshold: 5 }
  ]);
  const [isSaved, setIsSaved] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) {
      setSlug(newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const productData: Omit<AdminProduct, "id" | "created_at" | "updated_at"> = {
        name,
        slug,
        description,
        category_id: categoryId || null,
        brand,
        mrp: Math.round(parseFloat(mrp || "0") * 100),
        selling_price: Math.round(parseFloat(sellingPrice || "0") * 100),
        cost_price: Math.round(parseFloat(costPrice || "0") * 100),
        weight_grams: weight ? parseInt(weight) : 500,
        length_cm: length ? parseInt(length) : 20,
        width_cm: width ? parseInt(width) : 20,
        height_cm: height ? parseInt(height) : 20,
        images: images,
        specifications: specifications.filter(s => s.key).reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}),
        whats_in_the_box: whatsInTheBox.filter(Boolean),
        badge_type: badgeType || null,
        discount_percent: discountPercent ? parseInt(discountPercent) : null,
        is_active: isActive,
      };

      const sanitizedVariants = variants.map((v) => ({
        ...v,
        images: (v.images || []).filter((url) => images.includes(url)),
      }));

      const result = await addProduct(productData, sanitizedVariants as any);
      if (result) {
        setIsSaved(true);
        setTimeout(() => {
          router.push("/admin/products");
        }, 900);
      }
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Failed to add product";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sticky Top Action Bar */}
      <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-6 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur shadow-sm sm:rounded-2xl sm:mx-0 sm:mt-0">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Products</span>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate max-w-[280px] sm:max-w-md">
              {name || "Add New Product"}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">Fill product specifications, upload photos, and create variants</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSaved && (
            <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fade-in">
              <Check className="h-4 w-4 stroke-[3]" />
              Created!
            </span>
          )}
          <button
            type="submit"
            form="new-product-form"
            disabled={isSubmitting || isSaved}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition-all cursor-pointer ${
              isSaved
                ? "bg-emerald-600 ring-2 ring-emerald-300"
                : "bg-red-600 hover:bg-red-700 active:scale-95 shadow-red-600/25"
            } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Creating...</span>
              </>
            ) : isSaved ? (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Product Created!</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 stroke-[2.5]" />
                <span>Publish Product</span>
              </>
            )}
          </button>
        </div>
      </div>

      <form id="new-product-form" onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
                  <input required type="text" value={name} onChange={handleNameChange} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slug *</label>
                  <input required type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)+/g, "").replace(/-{2,}/g, "-"))} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">Select a category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                    <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Pricing (₹)</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price *</label>
                  <input required type="number" min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">MRP</label>
                  <input type="number" min="0" step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price</label>
                  <input type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Variants &amp; Stock</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage color/model variants and assign specific photos to each.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setVariants([...variants, { name: "", sku: "", stock: 0, selling_price_override: null, mrp_override: null, low_stock_threshold: 5, images: [] }])}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Variant
                </button>
              </div>

              <div className="space-y-4">
                {variants.map((v, i) => (
                  <div key={i} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-3">
                    <div className="flex flex-wrap md:flex-nowrap gap-4 items-end">
                      <div className="flex-1 min-w-[140px]">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Variant Name *</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Red, SUV Blue, Black"
                          value={v.name || ""}
                          onChange={(e) => setVariants(variants.map((varItem, idx) => idx === i ? { ...varItem, name: e.target.value } : varItem))}
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <label className="block text-xs font-bold text-slate-600 mb-1">SKU</label>
                        <input
                          type="text"
                          placeholder="e.g. RC-POLO-RED"
                          value={v.sku || ""}
                          onChange={(e) => setVariants(variants.map((varItem, idx) => idx === i ? { ...varItem, sku: e.target.value } : varItem))}
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Stock *</label>
                        <input
                          required
                          type="number"
                          min="0"
                          value={v.stock ?? 0}
                          onChange={(e) => setVariants(variants.map((varItem, idx) => idx === i ? { ...varItem, stock: parseInt(e.target.value, 10) || 0 } : varItem))}
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-36">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Price Override (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Default price"
                          value={v.selling_price_override != null ? v.selling_price_override / 100 : ""}
                          onChange={(e) => setVariants(variants.map((varItem, idx) => idx === i ? { ...varItem, selling_price_override: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null } : varItem))}
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                        disabled={variants.length === 1}
                        title="Delete Variant"
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Visual Variant Photo Picker */}
                    {images.length > 0 && (
                      <div className="pt-3 border-t border-slate-200/80">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                            <span>Select photos for <b>{v.name || "this variant"}</b>:</span>
                            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              {((v.images || []).filter((url) => images.includes(url)).length)} selected
                            </span>
                          </label>
                          <div className="flex items-center gap-2 text-[10px]">
                            <button
                              type="button"
                              onClick={() => {
                                setVariants(variants.map((varItem, idx) => idx === i ? { ...varItem, images: [...images] } : varItem));
                              }}
                              className="text-blue-600 hover:underline font-bold cursor-pointer"
                            >
                              Select All
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                setVariants(variants.map((varItem, idx) => idx === i ? { ...varItem, images: [] } : varItem));
                              }}
                              className="text-slate-500 hover:underline font-bold cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                          {images.map((imgUrl, imgIdx) => {
                            const isSelected = (v.images || []).includes(imgUrl);
                            return (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => {
                                  const currentImgs = (v.images || []).filter((url) => images.includes(url));
                                  const nextImgs = isSelected
                                    ? currentImgs.filter((url) => url !== imgUrl)
                                    : [...currentImgs, imgUrl];
                                  setVariants(variants.map((varItem, idx) => idx === i ? { ...varItem, images: nextImgs } : varItem));
                                }}
                                className={`relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-blue-600 ring-2 ring-blue-300 scale-105 shadow-sm"
                                    : "border-slate-200 opacity-40 hover:opacity-80"
                                }`}
                                title={isSelected ? "Click to remove photo from this variant" : "Click to assign photo to this variant"}
                              >
                                <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                                {isSelected && (
                                  <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5 shadow-sm">
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Quick Save below Variants */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/60 -mx-6 -mb-6 p-4 rounded-b-3xl">
                  <span className="text-xs text-slate-500 font-medium">
                    Finished picking photos for variants? Create the product:
                  </span>
                  <button
                    type="submit"
                    form="new-product-form"
                    disabled={isSubmitting || isSaved}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
                      isSaved ? "bg-emerald-600" : "bg-slate-900 hover:bg-slate-800"
                    } disabled:opacity-50`}
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSubmitting ? "Creating..." : isSaved ? "Created!" : "Save Product & Variants"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Status</h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  <div className={`block h-6 w-10 rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="font-medium text-slate-700">{isActive ? "Active (Visible)" : "Draft (Hidden)"}</span>
              </label>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Product Images</h2>
              <ImageUploader
                value={images}
                onChange={handleImagesChange}
                maxImages={20}
                folder="products"
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Shipping Specs</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Weight (g)</label>
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Length (cm)</label>
                  <input type="number" value={length} onChange={(e) => setLength(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Width (cm)</label>
                  <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm)</label>
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500" />
                </div>
              </div>
            </div>
            
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Promotions</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Badge Type</label>
                  <select value={badgeType} onChange={(e) => setBadgeType(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5">
                    <option value="">None</option>
                    <option value="NEW">New</option>
                    <option value="BESTSELLER">Bestseller</option>
                    <option value="SALE">Sale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Discount %</label>
                  <input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sticky Floating Bottom Bar */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            {isSaved ? (
              <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
                <Check className="h-4 w-4 stroke-[3]" />
                Product created successfully!
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                Make sure all required fields are filled before saving.
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || isSaved}
              className={`flex items-center gap-2 rounded-xl px-7 py-2.5 text-sm font-extrabold text-white shadow-lg transition-all cursor-pointer ${
                isSaved
                  ? "bg-emerald-600 ring-2 ring-emerald-300"
                  : "bg-red-600 hover:bg-red-700 shadow-red-600/30 active:scale-95"
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : isSaved ? (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Created!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 stroke-[2.5]" />
                  <span>Save Product</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
