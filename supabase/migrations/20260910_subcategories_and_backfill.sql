-- ==============================================================================
-- Migration: 20260910_subcategories_and_backfill.sql
-- Description:
--   1. Create SubCategory table
--   2. Add subCategoryId and subCategorySlug to Product table
--   3. Seed subcategories for Diecast Cars and RC Cars
--   4. Smart backfill existing 23 products into appropriate subcategories
-- ==============================================================================

-- 1. Create SubCategory table
CREATE TABLE IF NOT EXISTS public."SubCategory" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  "categoryId" TEXT NOT NULL REFERENCES public."Category"(id) ON DELETE CASCADE,
  "sortOrder" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and public read
ALTER TABLE public."SubCategory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on SubCategory" 
  ON public."SubCategory" FOR SELECT USING (true);
GRANT ALL ON TABLE public."SubCategory" TO service_role;
GRANT ALL ON TABLE public."SubCategory" TO postgres;
GRANT SELECT ON TABLE public."SubCategory" TO anon, authenticated;

-- 2. Add subCategoryId to Product
ALTER TABLE public."Product" 
  ADD COLUMN IF NOT EXISTS "subCategoryId" TEXT REFERENCES public."SubCategory"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "subCategorySlug" TEXT;

CREATE INDEX IF NOT EXISTS idx_product_subcategory ON public."Product"("subCategoryId");

-- 3. Seed Subcategories
INSERT INTO public."SubCategory" (id, name, slug, "categoryId", "sortOrder") VALUES
  -- Diecast Cars subcategories
  ('sub-diecast-1-18', '1/18 Scale', '1-18-scale', 'cat-diecast', 1),
  ('sub-diecast-1-24', '1/24 Scale', '1-24-scale', 'cat-diecast', 2),
  ('sub-diecast-1-32', '1/32 Scale', '1-32-scale', 'cat-diecast', 3),
  ('sub-diecast-1-43', '1/43 Scale', '1-43-scale', 'cat-diecast', 4),
  ('sub-diecast-1-64', '1/64 Scale', '1-64-scale', 'cat-diecast', 5),
  ('sub-diecast-hotwheels', 'Hotwheels', 'hotwheels', 'cat-diecast', 6),
  
  -- RC Cars subcategories
  ('sub-rc-off-road', 'Off Road', 'off-road', 'cat-rc-cars', 1),
  ('sub-rc-on-road', 'On Road', 'on-road', 'cat-rc-cars', 2)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  slug = EXCLUDED.slug, 
  "categoryId" = EXCLUDED."categoryId", 
  "sortOrder" = EXCLUDED."sortOrder";

-- 4. Smart Backfill for Existing Products

-- Diecast 1/64
UPDATE public."Product"
SET "subCategoryId" = 'sub-diecast-1-64', "subCategorySlug" = '1-64-scale'
WHERE "categoryId" = 'cat-diecast' AND (name ILIKE '%1/64%' OR name ILIKE '%1:64%');

-- Diecast 1/24
UPDATE public."Product"
SET "subCategoryId" = 'sub-diecast-1-24', "subCategorySlug" = '1-24-scale'
WHERE "categoryId" = 'cat-diecast' AND (name ILIKE '%1/24%' OR name ILIKE '%1:24%' OR name ILIKE '%Mini Cooper%' OR name ILIKE '%Defender%');

-- Diecast 1/18
UPDATE public."Product"
SET "subCategoryId" = 'sub-diecast-1-18', "subCategorySlug" = '1-18-scale'
WHERE "categoryId" = 'cat-diecast' AND (name ILIKE '%1/18%' OR name ILIKE '%1:18%' OR name ILIKE '%Ghost Phantom%');

-- Diecast fallback: default any remaining to 1/64 scale
UPDATE public."Product"
SET "subCategoryId" = 'sub-diecast-1-64', "subCategorySlug" = '1-64-scale'
WHERE "categoryId" = 'cat-diecast' AND "subCategoryId" IS NULL;

-- RC Cars Off Road
UPDATE public."Product"
SET "subCategoryId" = 'sub-rc-off-road', "subCategorySlug" = 'off-road'
WHERE "categoryId" = 'cat-rc-cars' AND (
  name ILIKE '%Monster%' OR 
  name ILIKE '%Thar%' OR 
  name ILIKE '%Crawler%' OR 
  name ILIKE '%Police Truck%' OR 
  name ILIKE '%Suchiyu%' OR
  name ILIKE '%Off-Road%'
);

-- RC Cars On Road
UPDATE public."Product"
SET "subCategoryId" = 'sub-rc-on-road', "subCategorySlug" = 'on-road'
WHERE "categoryId" = 'cat-rc-cars' AND (
  name ILIKE '%Drift%' OR 
  name ILIKE '%Polo%' OR 
  name ILIKE '%Lamborghini%' OR 
  name ILIKE '%Nissan%' OR 
  name ILIKE '%Meclarin%' OR 
  name ILIKE '%buggati%' OR
  name ILIKE '%Fun Chapter%'
);

-- RC Cars fallback: default any remaining to On Road
UPDATE public."Product"
SET "subCategoryId" = 'sub-rc-on-road', "subCategorySlug" = 'on-road'
WHERE "categoryId" = 'cat-rc-cars' AND "subCategoryId" IS NULL;
