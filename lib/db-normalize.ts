/**
 * DB Normalization Helpers — Kushal's Mart
 *
 * WHY: The existing Supabase tables use Prisma's PascalCase naming
 * (Category, Product, ProductVariant, Order, OrderItem) with camelCase columns.
 * Our admin UI and admin-store.tsx use snake_case. These functions translate
 * between the two so ONLY API routes need updating — no changes to admin pages.
 */

// ── Category ───────────────────────────────────────────────

export function normalizeCategory(c: Record<string, unknown>) {
  return {
    id: c.id as string,
    name: c.name as string,
    slug: c.slug as string,
    description: (c.description as string) || null,
    image_url: (c.imageUrl as string) || null,
    sort_order: (c.sortOrder as number) || 0,
    created_at: c.createdAt as string,
  };
}

export function toCategoryDB(body: Record<string, unknown>) {
  return {
    name: body.name,
    slug: body.slug,
    description: body.description || null,
    imageUrl: body.image_url || null,
    sortOrder: (body.sort_order as number) || 0,
  };
}

// ── ProductVariant ─────────────────────────────────────────

export function normalizeVariant(v: Record<string, unknown>) {
  return {
    id: v.id as string,
    product_id: v.productId as string,
    name: v.name as string,
    sku: v.sku as string,
    stock: (v.stock as number) || 0,
    low_stock_threshold: (v.lowStockThreshold as number) ?? 3,
    selling_price_override: (v.sellingPriceOverride as number) ?? null,
    mrp_override: (v.mrpOverride as number) ?? null,
    images: (v.images as string[]) || [],
    created_at: v.createdAt as string,
    updated_at: v.updatedAt as string,
  };
}

export function toVariantDB(v: Record<string, unknown>, productId?: string) {
  const row: Record<string, unknown> = {
    name: v.name || "Default",
    sku: v.sku || `SKU-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase(),
    stock: typeof v.stock === "number" ? v.stock : parseInt(String(v.stock || 0), 10) || 0,
    lowStockThreshold: typeof v.low_stock_threshold === "number" ? v.low_stock_threshold : 3,
    sellingPriceOverride: v.selling_price_override != null && v.selling_price_override !== "" ? Number(v.selling_price_override) : null,
    mrpOverride: v.mrp_override != null && v.mrp_override !== "" ? Number(v.mrp_override) : null,
    images: Array.isArray(v.images) ? v.images : [],
    updatedAt: new Date().toISOString(),
  };
  if (v.id) {
    row.id = v.id;
  } else {
    row.id = `var-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  }
  if (productId) row.productId = productId;
  return row;
}

// ── Product ────────────────────────────────────────────────

export function normalizeProduct(p: Record<string, unknown>) {
  const variants = ((p.ProductVariant as Record<string, unknown>[]) || []).map(normalizeVariant);
  return {
    id: p.id as string,
    name: p.name as string,
    slug: p.slug as string,
    description: p.description as string,
    category_id: p.categoryId as string,
    brand: (p.brand as string) || null,
    mrp: p.mrp as number,
    selling_price: p.sellingPrice as number,
    cost_price: (p.costPrice as number) || 0,
    images: (p.images as string[]) || [],
    is_active: p.isActive as boolean,
    weight_grams: (p.weightGrams as number) ?? null,
    specifications: (p.specifications as Record<string, string>) || {},
    whats_in_the_box: (p.whatsInTheBox as string[]) || [],
    badge_type: (p.badgeType as string) || null,
    created_at: p.createdAt as string,
    updated_at: p.updatedAt as string,
    categories: p.Category
      ? { id: (p.Category as Record<string, unknown>).id, name: (p.Category as Record<string, unknown>).name }
      : null,
    variants,
    product_variants: variants, // alias for compatibility
  };
}

export function toProductDB(body: Record<string, unknown>) {
  const row: Record<string, unknown> = {
    name: body.name,
    slug: body.slug,
    description: body.description || "",
    categoryId: body.category_id,
    brand: body.brand || null,
    mrp: body.mrp,
    sellingPrice: body.selling_price,
    costPrice: (body.cost_price as number) || 0,
    images: body.images || [],
    isActive: body.is_active ?? true,
    updatedAt: new Date().toISOString(),
  };
  if (body.weight_grams !== undefined) {
    row.weightGrams = body.weight_grams ? Number(body.weight_grams) : null;
  }
  if (body.specifications !== undefined) {
    row.specifications = body.specifications;
  }
  if (body.whats_in_the_box !== undefined) {
    row.whatsInTheBox = body.whats_in_the_box;
  }
  if (body.badge_type !== undefined) {
    row.badgeType = body.badge_type || null;
  }
  if (!body.slug && body.name) {
    row.slug = (body.name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  return row;
}

// ── OrderItem ──────────────────────────────────────────────

export function normalizeOrderItem(i: Record<string, unknown>) {
  return {
    id: i.id as string,
    order_id: i.orderId as string,
    product_id: i.productId as string,
    variant_id: i.variantId as string,
    product_name: i.productName as string,
    variant_name: (i.variantName as string) || "",
    unit_price: i.unitPrice as number,
    cost_price: (i.costPrice as number) || 0,
    quantity: i.quantity as number,
    line_total: i.lineTotal as number,
    image: (i.image as string) || null,
  };
}

// ── Order ──────────────────────────────────────────────────

export function normalizeOrder(o: Record<string, unknown>) {
  return {
    id: o.id as string,
    order_number: o.orderNumber as string,
    channel: o.channel as string,
    status: o.status as string,
    customer_name: o.customerName as string,
    customer_phone: o.customerPhone as string,
    customer_email: (o.customerEmail as string) || null,
    shipping_address: (o.shippingAddress as Record<string, string>) || null,
    subtotal: o.subtotal as number,
    discount: (o.discount as number) || 0,
    total: o.total as number,
    payment_status: o.paymentStatus as string,
    payment_mode: (o.paymentMode as string) || "prepaid",
    shiprocket_awb: (o.shiprocketAwb as string) || null,
    courier_name: (o.courierName as string) || null,
    timeline: (o.timeline as unknown[]) || [],
    created_at: o.createdAt as string,
    updated_at: o.updatedAt as string,
    order_items: ((o.OrderItem as Record<string, unknown>[]) || []).map(normalizeOrderItem),
  };
}
