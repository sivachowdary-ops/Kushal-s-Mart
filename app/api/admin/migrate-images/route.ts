import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { verifyAdmin } from "@/lib/admin-auth";

export const maxDuration = 60; // Allow up to 60 seconds on Vercel

/**
 * POST /api/admin/migrate-images
 *
 * Migrates existing product and variant images from Supabase Storage to Cloudinary.
 * Runs directly on Vercel using the live environment variables.
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
      { error: "Cloudinary environment variables are missing on Vercel." },
      { status: 500 }
    );
  }

  const urlMap = new Map<string, string>();
  let totalProcessed = 0;
  let errors: string[] = [];

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
      totalProcessed++;
      return uploaded.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      errors.push(`Failed to migrate ${sourceUrl}: ${msg}`);
      return sourceUrl; // Fallback to original
    }
  }

  try {
    // 1. Migrate Products
    const { data: products } = await supabaseAdmin
      .from("Product")
      .select("id, name, images");

    if (products) {
      for (const prod of products) {
        const images = Array.isArray(prod.images) ? (prod.images as string[]) : [];
        let changed = false;
        const newImages: string[] = [];

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
    }

    // 2. Migrate Variants
    const { data: variants } = await supabaseAdmin
      .from("ProductVariant")
      .select("id, name, images");

    if (variants) {
      for (const v of variants) {
        const images = Array.isArray(v.images) ? (v.images as string[]) : [];
        let changed = false;
        const newImages: string[] = [];

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
            .from("ProductVariant")
            .update({ images: newImages })
            .eq("id", v.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${urlMap.size} unique images to Cloudinary!`,
      uniqueImagesMigrated: urlMap.size,
      totalInstancesUpdated: totalProcessed,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Migration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
