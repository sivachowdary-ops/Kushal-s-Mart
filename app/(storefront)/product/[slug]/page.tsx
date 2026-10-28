import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/storefront-data";
import { ProductDetailClient } from "@/components/storefront/product-detail-client";

// Revalidate product pages every 30s so admin updates reflect promptly
export const revalidate = 30;

// Per-product title, description and share image (was the generic site title on every product)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const description = (product.description || "").replace(/\s+/g, " ").trim().slice(0, 160);
  return {
    title: product.name,
    description: description || undefined,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description: description || undefined,
      images: product.images?.[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

// Server Component — resolves product from in-memory cache in < 1ms
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient initialProduct={product} />;
}
