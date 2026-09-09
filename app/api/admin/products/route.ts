import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeProduct, toProductDB, toVariantDB } from "@/lib/db-normalize";
import { verifyAdmin, verifyAdminOrStaff } from "@/lib/admin-auth";

// CHANGED: table "products" → "Product", join "categories" → "Category",
//          join "product_variants" → "ProductVariant", createdAt instead of created_at
export async function GET(request: Request) {
  const user = await verifyAdminOrStaff(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("Product")
    .select(`*, Category ( id, name ), ProductVariant ( * )`)
    .order("createdAt", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(normalizeProduct));
}

// CHANGED: table "products" → "Product", body snake_case → camelCase for DB,
//          "product_variants" → "ProductVariant", column "product_id" → "productId"
export async function POST(request: Request) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { variants, ...productBody } = body;

    if (!productBody.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const dbRow = toProductDB(productBody);

    const { data: product, error: productError } = await supabaseAdmin
      .from("Product")
      .insert([dbRow])
      .select()
      .single();

    if (productError) return NextResponse.json({ error: productError.message }, { status: 500 });

    if (variants && variants.length > 0) {
      const productImages = (dbRow.images as string[]) || [];
      const variantsData = variants.map((v: Record<string, unknown>) => ({
        ...toVariantDB(v, product.id, productImages),
        createdAt: new Date().toISOString(),
      }));

      const { error: variantsError } = await supabaseAdmin
        .from("ProductVariant")
        .insert(variantsData);

      if (variantsError) {
        await supabaseAdmin.from("Product").delete().eq("id", product.id);
        return NextResponse.json({ error: variantsError.message }, { status: 500 });
      }
    }

    const { data: fullProduct } = await supabaseAdmin
      .from("Product")
      .select(`*, Category ( id, name ), ProductVariant ( * )`)
      .eq("id", product.id)
      .single();

    return NextResponse.json(normalizeProduct(fullProduct), { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
