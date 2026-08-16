-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "country" TEXT DEFAULT 'Nigeria',
ADD COLUMN     "lga" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "streetNumber" TEXT;
