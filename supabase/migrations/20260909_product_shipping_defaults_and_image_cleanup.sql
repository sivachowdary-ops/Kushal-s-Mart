-- ==============================================================================
-- Migration: 20260909_product_shipping_defaults_and_image_cleanup.sql
-- Description:
--   1. Backfill all existing products with standard shipping specs:
--      weightGrams = 500, lengthCm = 20, widthCm = 20, heightCm = 20
--   2. Alter column defaults on the "Product" table for future inserts
--   3. Prune old/stale variant image URLs that no longer exist in Product.images
-- ==============================================================================

-- 1. Backfill existing products where shipping specs are null, 0, or missing
UPDATE "Product"
SET
  "weightGrams" = COALESCE(NULLIF("weightGrams", 0), 500),
  "lengthCm"    = COALESCE(NULLIF("lengthCm", 0), 20),
  "widthCm"     = COALESCE(NULLIF("widthCm", 0), 20),
  "heightCm"    = COALESCE(NULLIF("heightCm", 0), 20)
WHERE
  "weightGrams" IS NULL OR "weightGrams" = 0 OR
  "lengthCm"    IS NULL OR "lengthCm" = 0 OR
  "widthCm"     IS NULL OR "widthCm" = 0 OR
  "heightCm"    IS NULL OR "heightCm" = 0;

-- 2. Alter column defaults for all future inserts at DB level
ALTER TABLE "Product" ALTER COLUMN "weightGrams" SET DEFAULT 500;
ALTER TABLE "Product" ALTER COLUMN "lengthCm"    SET DEFAULT 20;
ALTER TABLE "Product" ALTER COLUMN "widthCm"     SET DEFAULT 20;
ALTER TABLE "Product" ALTER COLUMN "heightCm"    SET DEFAULT 20;

-- 3. Clean up existing stale/deleted variant images
-- Prunes ProductVariant.images so it strictly retains URLs that are still in Product.images
UPDATE "ProductVariant" pv
SET "images" = ARRAY(
  SELECT elem
  FROM unnest(pv."images") AS elem
  WHERE elem = ANY(p."images")
)
FROM "Product" p
WHERE pv."productId" = p."id"
  AND pv."images" IS NOT NULL
  AND cardinality(pv."images") > 0;
