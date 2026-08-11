/*
  Warnings:

  - Added the required column `displayPrice` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "platformFee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "displayPrice" DECIMAL(10,2);

-- Backfill: 0.5% platform fee, capped at NGN 200 per item, on existing products
UPDATE "Product" SET "displayPrice" = ROUND(price + LEAST(price * 0.005, 200), 2);

ALTER TABLE "Product" ALTER COLUMN "displayPrice" SET NOT NULL;
