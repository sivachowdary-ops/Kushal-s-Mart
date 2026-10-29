-- ==============================================================================
-- Migration: 20261029_diecast_1_34_1_36_subcategory.sql
-- Adds the "1/34 & 1/36 Scale" Diecast subcategory, shown first, and moves the
-- existing 1/34 and 1/36 diecast models into it. Run in Supabase SQL Editor.
-- Safe to re-run.
-- ==============================================================================

-- 1. Add the subcategory (sortOrder 0 = listed before 1/18 Scale)
INSERT INTO public."SubCategory" (id, name, slug, "categoryId", "sortOrder")
VALUES ('sub-diecast-1-34-36', '1/34 & 1/36 Scale', '1-34-1-36-scale', 'cat-diecast', 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  "categoryId" = EXCLUDED."categoryId",
  "sortOrder" = EXCLUDED."sortOrder";

-- 2. PREVIEW — the diecast products that step 3 will move (run this first and check the list)
SELECT id, name, "subCategorySlug" AS current_subcategory
FROM public."Product"
WHERE "categoryId" = 'cat-diecast'
  AND (name ~* '1\s*[/:]\s*3[46]([^0-9]|$)' OR slug ~* '1-3[46]-scale');

-- 3. Move them into the new subcategory
UPDATE public."Product"
SET "subCategoryId" = 'sub-diecast-1-34-36',
    "subCategorySlug" = '1-34-1-36-scale',
    "updatedAt" = NOW()
WHERE "categoryId" = 'cat-diecast'
  AND (name ~* '1\s*[/:]\s*3[46]([^0-9]|$)' OR slug ~* '1-3[46]-scale');

-- VERIFY: expect the new row first, then the product count in it
--   SELECT id, name, "sortOrder" FROM public."SubCategory" WHERE "categoryId" = 'cat-diecast' ORDER BY "sortOrder";
--   SELECT COUNT(*) FROM public."Product" WHERE "subCategorySlug" = '1-34-1-36-scale';
