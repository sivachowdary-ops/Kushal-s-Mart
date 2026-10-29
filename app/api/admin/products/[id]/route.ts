import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeProduct, toProductDB, toVariantDB } from "@/lib/db-normalize";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * Adds `delta` to a variant's stock without losing concurrent sales: the write only succeeds if
 * stock still holds the value just read (optimistic retry). Never goes below zero.
 */
async function adjustStock(variantId: string, delta: number): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: current, error: readErr } = await supabaseAdmin
      .from("ProductVariant")
      .select("stock")
      .eq("id", variantId)
      .single();
    if (readErr || !current) return false;

    const { data: written, error: writeErr } = await supabaseAdmin
      .from("ProductVariant")
      .update({ stock: Math.max(0, (current.stock || 0) + delta), updatedAt: new Date().toISOString() })
      .eq("id", variantId)
      .eq("stock", current.stock)
      .select("id");
    if (writeErr) return false;
    if (written && written.length > 0) return true;
    // Stock changed between read and write (a sale happened) — read again and retry
  }
  return false;
}

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
          // When the form says what stock it loaded, apply only the admin's change. Writing the
          // form's number back would undo every sale made while the form was open.
          const originalStock = typeof v.original_stock === "number" ? v.original_stock : null;
          const stockDelta = originalStock === null ? 0 : (variantRow.stock as number) - originalStock;

          // Update existing variant — keeps primary key intact, preserves OrderItem FK!
          const { error: updateVarErr } = await supabaseAdmin
            .from("ProductVariant")
            .update({
              name: variantRow.name,
              sku: variantRow.sku,
              ...(originalStock === null ? { stock: variantRow.stock } : {}),
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
          if (stockDelta !== 0) {
            const ok = await adjustStock(v.id as string, stockDelta);
            if (!ok) console.error(`[admin/products] Could not adjust stock for variant ${v.id} by ${stockDelta}`);
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

  // Products that appear in orders must be kept for order history. Check first — deleting the
  // variants and then failing on the product left it in the catalogue with no variants.
  const { count: orderCount, error: countErr } = await supabaseAdmin
    .from("OrderItem")
    .select("id", { count: "exact", head: true })
    .eq("productId", id);
  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });
  if ((orderCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "This product has existing orders, so it can't be deleted. Edit it and turn off \"Active\" to hide it from the store instead.",
      },
      { status: 409 }
    );
  }

  // Delete variants first (no cascade in Prisma-generated schema)
  const { error: variantErr } = await supabaseAdmin.from("ProductVariant").delete().eq("productId", id);
  if (variantErr) return NextResponse.json({ error: variantErr.message }, { status: 500 });
  const { error } = await supabaseAdmin.from("Product").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
