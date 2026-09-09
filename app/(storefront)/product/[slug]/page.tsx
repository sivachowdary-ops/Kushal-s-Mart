import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/storefront-data";
import { ProductDetailClient } from "@/components/storefront/product-detail-client";

// Revalidate product pages every 30s so admin updates reflect promptly
export const revalidate = 30;

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
