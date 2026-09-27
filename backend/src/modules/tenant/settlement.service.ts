import { prisma } from "../../db/prismaClient.js";
import { AppError } from "../../utils/AppError.js";
import * as safeHaven from "../../utils/safeHavenClient.js";
import type { SettlementMode } from "../../generated/prisma/enums.js";

const SETTLEMENT_SELECT = {
  settlementMode: true,
  settlementBankCode: true,
  settlementAccountNumber: true,
  settlementAccountName: true,
} as const;

export function getSettlementSettings(tenantId: string) {
  return prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: SETTLEMENT_SELECT });
}

export function listSettlementBanks() {
  return safeHaven.listBanks();
}

// Lets the vendor see the account holder's name before saving, so a typo'd
// account number is caught now rather than when a payout fails later.
export async function verifySettlementAccount(input: { bankCode: string; accountNumber: string }) {
  const { accountName } = await safeHaven.nameEnquiry(input);
  return { accountName };
}

export async function updateSettlementSettings(params: {
  tenantId: string;
  settlementMode: SettlementMode;
  bankCode?: string;
  accountNumber?: string;
}) {
  let accountDetails = {};
  if (params.bankCode !== undefined || params.accountNumber !== undefined) {
    if (!params.bankCode || !params.accountNumber) {
      throw new AppError(400, "Provide both a bank and an account number.");
    }
    // Re-resolved server-side rather than trusting a name sent by the client.
    const { accountName } = await safeHaven.nameEnquiry({
      bankCode: params.bankCode,
      accountNumber: params.accountNumber,
    });
    accountDetails = {
      settlementBankCode: params.bankCode,
      settlementAccountNumber: params.accountNumber,
      settlementAccountName: accountName,
    };
  }

  return prisma.tenant.update({
    where: { id: params.tenantId },
    data: { settlementMode: params.settlementMode, ...accountDetails },
    select: SETTLEMENT_SELECT,
  });
}
