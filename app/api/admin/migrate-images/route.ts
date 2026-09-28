import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { verifyAdmin } from "@/lib/admin-auth";

export const maxDuration = 60;

/**
 * POST /api/admin/migrate-images
 *
 * Migrates a batch of products/variants from Supabase Storage to Cloudinary.
 * Processes 3 products per call to avoid Vercel serverless execution timeouts.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary keys missing. Please verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Vercel settings." },
      { status: 500 }
    );
  }

  const urlMap = new Map<string, string>();
  let totalUploaded = 0;
  const errors: string[] = [];

  async function migrateUrl(sourceUrl: string, folder = "products"): Promise<string> {
    if (urlMap.has(sourceUrl)) {
      return urlMap.get(sourceUrl)!;
    }

    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploaded = await uploadToCloudinary(buffer, folder);
      urlMap.set(sourceUrl, uploaded.url);
      totalUploaded++;
      return uploaded.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      errors.push(`Failed to migrate ${sourceUrl}: ${msg}`);
      return sourceUrl; // Fallback to original
    }
  }

  try {
    // 1. Find all products with Supabase storage images
    const { data: allProducts, error: prodErr } = await supabaseAdmin
      .from("Product")
      .select("id, name, images");

    if (prodErr) throw new Error(prodErr.message);

    const pendingProducts = (allProducts || []).filter((p) =>
      Array.isArray(p.images) &&
      p.images.some((img: string) => typeof img === "string" && img.includes("supabase.co/storage"))
    );

    // Process a batch of up to 3 products
    const batch = pendingProducts.slice(0, 3);

    for (const prod of batch) {
      const images = Array.isArray(prod.images) ? (prod.images as string[]) : [];
      const newImages: string[] = [];
      let changed = false;

      for (const img of images) {
        if (typeof img === "string" && img.includes("supabase.co/storage")) {
          const cdnUrl = await migrateUrl(img, "products");
          newImages.push(cdnUrl);
          if (cdnUrl !== img) changed = true;
        } else {
          newImages.push(img);
        }
      }

      if (changed) {
        await supabaseAdmin
          .from("Product")
          .update({ images: newImages })
          .eq("id", prod.id);
      }
    }

    // 2. Also check variants for those migrated products
    for (const prod of batch) {
      const { data: variants } = await supabaseAdmin
        .from("ProductVariant")
        .select("id, name, images")
        .eq("productId", prod.id);

      if (variants) {
        for (const v of variants) {
          const vImages = Array.isArray(v.images) ? (v.images as string[]) : [];
          const newVImages: string[] = [];
          let changed = false;

          for (const img of vImages) {
            if (typeof img === "string" && img.includes("supabase.co/storage")) {
              const cdnUrl = await migrateUrl(img, "products");
              newVImages.push(cdnUrl);
              if (cdnUrl !== img) changed = true;
            } else {
              newVImages.push(img);
            }
          }

          if (changed) {
            await supabaseAdmin
              .from("ProductVariant")
              .update({ images: newVImages })
              .eq("id", v.id);
          }
        }
      }
    }

    const remainingCount = pendingProducts.length - batch.length;

    return NextResponse.json({
      success: true,
      batchMigrated: batch.length,
      imagesUploaded: totalUploaded,
      remainingProducts: Math.max(0, remainingCount),
      done: remainingCount <= 0,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Migration failed";
    console.error("[migrate-images] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
