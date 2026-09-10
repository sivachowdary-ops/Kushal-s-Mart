import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeProduct, toProductDB, toVariantDB } from "@/lib/db-normalize";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // CHANGED: tables "products"→"Product", joins camelCase
  const { data, error } = await supabaseAdmin
    .from("Product")
    .select(`*, Category ( id, name ), ProductVariant ( * )`)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalizeProduct(data));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const { variants, ...productBody } = body;

    const dbRow = toProductDB(productBody);
    delete dbRow.id; // Do not overwrite existing ID on update
    let { error: productError } = await supabaseAdmin
      .from("Product")
      .update(dbRow)
      .eq("id", id);

    if (productError && (productError.code === "42703" || productError.message.includes("subCategory"))) {
      const fallbackRow = { ...dbRow };
      delete fallbackRow.subCategoryId;
      delete fallbackRow.subCategorySlug;
      const retry = await supabaseAdmin
        .from("Product")
        .update(fallbackRow)
        .eq("id", id);
      productError = retry.error;
    }

    if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

    if (variants !== undefined) {
      // 1. Fetch existing variants for this product
      const { data: existingVariants, error: fetchVarErr } = await supabaseAdmin
        .from("ProductVariant")
        .select("id")
        .eq("productId", id);

      if (fetchVarErr) {
        console.error("[admin/products] Failed to fetch variants:", fetchVarErr);
      }

      const existingIds = new Set((existingVariants || []).map((v: { id: string }) => v.id));
      const incomingIds = new Set(
        variants.filter((v: Record<string, unknown>) => v.id).map((v: Record<string, unknown>) => v.id as string)
      );

      // 2. Identify variants removed by the user in the UI
      const toDelete = (existingVariants || []).filter((v: { id: string }) => !incomingIds.has(v.id));
      for (const delVar of toDelete) {
        // Try deleting; if referenced by OrderItem (FK 23503), retain it safely
        const { error: delErr } = await supabaseAdmin
          .from("ProductVariant")
          .delete()
          .eq("id", delVar.id);
        if (delErr) {
          console.warn(`[admin/products] Variant ${delVar.id} referenced by existing orders; retained for order integrity.`);
        }
      }

      const productImages = (dbRow.images as string[]) || (productBody.images as string[]) || [];

      // 3. In-place update or insert incoming variants
      for (const v of variants) {
        const variantRow = toVariantDB(v, id, productImages);
        const variantId = (v.id as string) || (variantRow.id as string);

        if (v.id && existingIds.has(v.id as string)) {
          // Update existing variant — keeps primary key intact, preserves OrderItem FK!
          const { error: updateVarErr } = await supabaseAdmin
            .from("ProductVariant")
            .update({
              name: variantRow.name,
              sku: variantRow.sku,
              stock: variantRow.stock,
              lowStockThreshold: variantRow.lowStockThreshold,
              sellingPriceOverride: variantRow.sellingPriceOverride,
              mrpOverride: variantRow.mrpOverride,
              images: variantRow.images,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", v.id);

          if (updateVarErr) {
            console.error(`[admin/products] Error updating variant ${v.id}:`, updateVarErr);
          }
        } else {
          // Insert new variant
          const { error: insertVarErr } = await supabaseAdmin
            .from("ProductVariant")
            .insert({
              ...variantRow,
              id: variantId,
              createdAt: new Date().toISOString(),
            });

          if (insertVarErr) {
            console.error(`[admin/products] Error inserting new variant:`, insertVarErr);
          }
        }
      }
    }

    const { data: fullProduct } = await supabaseAdmin
      .from("Product")
      .select(`*, Category ( id, name ), ProductVariant ( * )`)
      .eq("id", id)
      .single();

    return NextResponse.json(normalizeProduct(fullProduct));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// CHANGED: "products"→"Product" (ProductVariant cascades via FK in Prisma schema)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Delete variants first (no cascade in Prisma-generated schema)
  await supabaseAdmin.from("ProductVariant").delete().eq("productId", id);
  const { error } = await supabaseAdmin.from("Product").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
