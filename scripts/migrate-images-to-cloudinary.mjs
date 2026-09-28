/**
 * Migration Script: Supabase Storage -> Cloudinary CDN
 *
 * Usage:
 *   node scripts/migrate-images-to-cloudinary.mjs --dry-run   (preview changes)
 *   node scripts/migrate-images-to-cloudinary.mjs             (execute migration)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env.local if present
const envLocalPath = path.join(rootDir, ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const isDryRun = process.argv.includes("--dry-run");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log("\n=======================================================");
console.log("   Supabase Storage -> Cloudinary Migration Script    ");
console.log("=======================================================\n");

if (!cloudName || !apiKey || !apiSecret) {
  console.error("❌ Missing Cloudinary environment variables!");
  console.error("Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local");
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables!");
  console.error("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Cache uploaded URLs to prevent duplicate uploads
const urlMap = new Map();

async function uploadUrlToCloudinary(sourceUrl, folder = "products") {
  if (urlMap.has(sourceUrl)) {
    return urlMap.get(sourceUrl);
  }

  if (isDryRun) {
    const mockUrl = `https://res.cloudinary.com/${cloudName}/image/upload/kushals-mart/${folder}/migrated-${Date.now()}.webp`;
    urlMap.set(sourceUrl, mockUrl);
    return mockUrl;
  }

  console.log(`  ⬇️  Downloading: ${sourceUrl}`);
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch source image (${res.status} ${res.statusText})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log(`  ⬆️  Uploading to Cloudinary folder kushals-mart/${folder}...`);
  const uploaded = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `kushals-mart/${folder}`,
        asset_folder: `kushals-mart/${folder}`,
        use_asset_folder_as_public_id_prefix: true,
        format: "webp",
        quality: "auto",
        resource_type: "image",
      },
      (err, result) => {
        if (err || !result) reject(err || new Error("No upload result"));
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

  console.log(`  ✅ Uploaded: ${uploaded.secure_url}`);
  urlMap.set(sourceUrl, uploaded.secure_url);
  return uploaded.secure_url;
}

async function runMigration() {
  if (isDryRun) {
    console.log("🔍 MODE: DRY RUN (No database or Cloudinary updates will be executed)\n");
  } else {
    console.log("🚀 MODE: LIVE EXECUTION\n");
  }

  let totalMigrated = 0;

  // 1. Migrate Product table
  console.log("📦 Checking Product table...");
  const { data: products, error: prodErr } = await supabaseAdmin
    .from("Product")
    .select("id, name, images");

  if (prodErr) {
    console.error("Failed to query Product table:", prodErr.message);
  } else if (products) {
    for (const prod of products) {
      const images = Array.isArray(prod.images) ? prod.images : [];
      let changed = false;
      const updatedImages = [];

      for (const imgUrl of images) {
        if (typeof imgUrl === "string" && imgUrl.includes("supabase.co/storage")) {
          try {
            const newUrl = await uploadUrlToCloudinary(imgUrl, "products");
            updatedImages.push(newUrl);
            changed = true;
            totalMigrated++;
          } catch (e) {
            console.error(`  ⚠️  Failed to migrate ${imgUrl}:`, e.message);
            updatedImages.push(imgUrl);
          }
        } else {
          updatedImages.push(imgUrl);
        }
      }

      if (changed) {
        console.log(`  Updating product "${prod.name}" (${prod.id}) with ${updatedImages.length} images`);
        if (!isDryRun) {
          await supabaseAdmin
            .from("Product")
            .update({ images: updatedImages })
            .eq("id", prod.id);
        }
      }
    }
  }

  // 2. Migrate ProductVariant table
  console.log("\n🎨 Checking ProductVariant table...");
  const { data: variants, error: varErr } = await supabaseAdmin
    .from("ProductVariant")
    .select("id, name, images");

  if (varErr) {
    console.error("Failed to query ProductVariant table:", varErr.message);
  } else if (variants) {
    for (const v of variants) {
      const images = Array.isArray(v.images) ? v.images : [];
      let changed = false;
      const updatedImages = [];

      for (const imgUrl of images) {
        if (typeof imgUrl === "string" && imgUrl.includes("supabase.co/storage")) {
          try {
            const newUrl = await uploadUrlToCloudinary(imgUrl, "products");
            updatedImages.push(newUrl);
            changed = true;
            totalMigrated++;
          } catch (e) {
            console.error(`  ⚠️  Failed to migrate ${imgUrl}:`, e.message);
            updatedImages.push(imgUrl);
          }
        } else {
          updatedImages.push(imgUrl);
        }
      }

      if (changed) {
        console.log(`  Updating variant "${v.name}" (${v.id})`);
        if (!isDryRun) {
          await supabaseAdmin
            .from("ProductVariant")
            .update({ images: updatedImages })
            .eq("id", v.id);
        }
      }
    }
  }

  // 3. Update lib/fallback-catalog.json if any migrated URLs are inside
  const fallbackCatalogPath = path.join(rootDir, "lib", "fallback-catalog.json");
  if (fs.existsSync(fallbackCatalogPath) && urlMap.size > 0) {
    console.log("\n📄 Updating lib/fallback-catalog.json...");
    let content = fs.readFileSync(fallbackCatalogPath, "utf-8");
    let replacedCount = 0;

    for (const [oldUrl, newUrl] of urlMap.entries()) {
      if (content.includes(oldUrl)) {
        content = content.replaceAll(oldUrl, newUrl);
        replacedCount++;
      }
    }

    if (replacedCount > 0 && !isDryRun) {
      fs.writeFileSync(fallbackCatalogPath, content, "utf-8");
      console.log(`  Updated ${replacedCount} URLs in fallback-catalog.json`);
    } else if (isDryRun) {
      console.log(`  [DRY RUN] Would update ${replacedCount} URLs in fallback-catalog.json`);
    }
  }

  console.log("\n=======================================================");
  console.log(`✨ Migration complete! Total image instances processed: ${totalMigrated}`);
  console.log(`✨ Unique image files migrated to Cloudinary: ${urlMap.size}`);
  console.log("=======================================================\n");
}

runMigration().catch((err) => {
  console.error("Migration failed with unhandled error:", err);
  process.exit(1);
});
