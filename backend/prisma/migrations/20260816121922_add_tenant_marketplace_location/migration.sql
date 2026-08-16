-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "city" TEXT,
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "locationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "marketplaceEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Tenant_marketplaceEnabled_idx" ON "Tenant"("marketplaceEnabled");

-- CreateIndex
CREATE INDEX "Tenant_city_idx" ON "Tenant"("city");
