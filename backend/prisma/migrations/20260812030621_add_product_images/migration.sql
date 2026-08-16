-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_idx" ON "ProductImage"("tenantId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: carry any existing single Product.imageUrl into the new table
-- (position 0) before the column is dropped, so no existing vendor's
-- already-uploaded photo is lost.
INSERT INTO "ProductImage" ("id", "tenantId", "productId", "url", "position", "createdAt")
SELECT gen_random_uuid()::text, "tenantId", "id", "imageUrl", 0, now()
FROM "Product"
WHERE "imageUrl" IS NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "imageUrl";
