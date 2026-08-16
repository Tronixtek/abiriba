-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "slug" TEXT;

-- Backfill: derive slug from businessName (lowercase, non-alphanumeric -> hyphen,
-- trim leading/trailing hyphens); fall back to 'shop' if that strips to empty.
UPDATE "Tenant"
SET "slug" = COALESCE(
  NULLIF(regexp_replace(regexp_replace(lower("businessName"), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'), ''),
  'shop'
);

-- Disambiguate any duplicate slugs produced by the backfill by appending part of the row id.
UPDATE "Tenant" t
SET "slug" = t."slug" || '-' || substr(t."id", 1, 6)
WHERE t."id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS rn
    FROM "Tenant"
  ) ranked WHERE rn > 1
);

ALTER TABLE "Tenant" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
