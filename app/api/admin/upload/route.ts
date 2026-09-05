import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

// Cloudflare R2 client (S3-compatible)
function getR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey || accountId === "YOUR_ACCOUNT_ID") {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// POST /api/admin/upload — upload one image, returns { url, key }
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rl = checkRateLimit(`upload:${ip}`, RATE_LIMITS.upload);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many upload attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "products";

    if (!/^[a-zA-Z0-9_-]+$/.test(folder)) {
      return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Only accept images
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Generate unique filename — always save as .webp (browser sent us pre-converted WebP)
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const key = `${folder}/${timestamp}-${random}.webp`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const r2 = getR2Client();
    const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    // Use R2 if configured with non-placeholder credentials
    if (r2 && publicUrl && !publicUrl.includes("XXXX")) {
      const bucketName = process.env.R2_BUCKET_NAME || "kushals-mart-products";
      await r2.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
      const imageUrl = `${publicUrl}/${key}`;
      return NextResponse.json({ url: imageUrl, key });
    }

    // Fallback: Upload to Supabase Storage in 'products' bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from("products")
      .upload(key, buffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("products")
      .getPublicUrl(key);

    return NextResponse.json({ url: publicUrlData.publicUrl, key });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[upload] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/upload?key=products/xxx.webp — delete an image
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  try {
    const r2 = getR2Client();
    const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    if (r2 && publicUrl && !publicUrl.includes("XXXX")) {
      const bucketName = process.env.R2_BUCKET_NAME || "kushals-mart-products";
      await r2.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
      return NextResponse.json({ success: true });
    }

    // Delete from Supabase storage
    await supabaseAdmin.storage.from("products").remove([key]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
