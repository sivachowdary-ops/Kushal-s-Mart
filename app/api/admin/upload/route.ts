import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary, deleteFromCloudinary, extractCloudinaryPublicId } from "@/lib/cloudinary";
import { verifyAdmin } from "@/lib/admin-auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

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

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, folder);

    return NextResponse.json({
      url: result.url,
      key: result.publicId,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[upload] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/upload?key=... — delete an image
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
    // key can be a Cloudinary public_id directly, or a full URL
    const publicId = key.includes("res.cloudinary.com")
      ? extractCloudinaryPublicId(key)
      : key;

    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
