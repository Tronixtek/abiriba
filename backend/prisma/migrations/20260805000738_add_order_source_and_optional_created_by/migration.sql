-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('STAFF', 'CUSTOMER_QR');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_createdById_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'STAFF',
ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
