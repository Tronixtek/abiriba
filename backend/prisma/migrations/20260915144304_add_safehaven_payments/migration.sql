-- CreateEnum
CREATE TYPE "SettlementMode" AS ENUM ('INSTANT', 'END_OF_DAY');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'ONLINE';

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_markedPaidById_fkey";

-- DropForeignKey
ALTER TABLE "StockAdjustment" DROP CONSTRAINT "StockAdjustment_userId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "payoutId" TEXT,
ADD COLUMN     "safeHavenAccountNumber" TEXT,
ADD COLUMN     "safeHavenBankName" TEXT,
ADD COLUMN     "safeHavenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "safeHavenPaymentReference" TEXT,
ADD COLUMN     "safeHavenVirtualAccountId" TEXT,
ADD COLUMN     "totalCharged" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "markedPaidById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StockAdjustment" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "settlementAccountName" TEXT,
ADD COLUMN     "settlementAccountNumber" TEXT,
ADD COLUMN     "settlementBankCode" TEXT,
ADD COLUMN     "settlementMode" "SettlementMode" NOT NULL DEFAULT 'END_OF_DAY';

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "feeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "transferredAmount" DECIMAL(10,2),
    "nameEnquiryReference" TEXT,
    "transferReference" TEXT,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_transferReference_key" ON "Payout"("transferReference");

-- CreateIndex
CREATE INDEX "Payout_tenantId_idx" ON "Payout"("tenantId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_safeHavenPaymentReference_key" ON "Order"("safeHavenPaymentReference");

-- CreateIndex
CREATE INDEX "Order_payoutId_idx" ON "Order"("payoutId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_markedPaidById_fkey" FOREIGN KEY ("markedPaidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
