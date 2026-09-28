import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary once on first import
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload an image buffer to Cloudinary.
 * Returns the secure CDN URL and the public_id (needed for deletion).
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string = "products"
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `kushals-mart/${folder}`,
        format: "webp",
        quality: "auto",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload returned no result"));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by its public_id.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

/**
 * Extract the Cloudinary public_id from a res.cloudinary.com URL.
 * Example: https://res.cloudinary.com/abc/image/upload/v123/kushals-mart/products/foo.webp
 *   → public_id = "kushals-mart/products/foo"
 * Returns null if the URL is not a Cloudinary URL.
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (!url.includes("res.cloudinary.com")) return null;
  // URL path: /cloud_name/image/upload/v.../folder/filename.ext
  const match = url.match(/\/upload\/(?:v\d+\/)?(kushals-mart\/.+)\.\w+$/);
  return match ? match[1] : null;
}
