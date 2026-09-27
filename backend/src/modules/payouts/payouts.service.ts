import { prisma } from "../../db/prismaClient.js";
import { env } from "../../config/env.js";
import * as safeHaven from "../../utils/safeHavenClient.js";
import { fromKobo, instantSettlementDeductionFor, outwardFeeFor, toKobo } from "../../utils/safeHavenFees.js";

const MAX_RETRIES = 5;

export function listPayouts(tenantId: string) {
  return prisma.payout.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { orders: true } } },
  });
}

async function failPayout(payoutId: string, reason: string, retryable = true) {
  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "FAILED",
      failureReason: reason,
      retryCount: retryable ? { increment: 1 } : MAX_RETRIES,
    },
  });
}

// Atomically claims whichever of these orders aren't already in a payout —
// the instant path and the nightly sweep can race for the same order, and
// only one of them may ever pay it out.
async function createPayoutForOrders(tenantId: string, orderIds: string[]) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.create({ data: { tenantId, amount: 0 } });
    const claimed = await tx.order.updateMany({
      where: { id: { in: orderIds }, tenantId, payoutId: null },
      data: { payoutId: payout.id },
    });
    if (claimed.count === 0) {
      await tx.payout.delete({ where: { id: payout.id } });
      return null;
    }
    // The vendor's share is exactly the orders' subtotal — the platform fee
    // and the customer-paid SafeHaven collection fee stay behind.
    const sum = await tx.order.aggregate({ where: { payoutId: payout.id }, _sum: { subtotal: true } });
    return tx.payout.update({ where: { id: payout.id }, data: { amount: sum._sum.subtotal ?? 0 } });
  });
}

// Idempotent — safe to call again for the same payout (retry loop, racing triggers).
export async function executePayout(payoutId: string): Promise<void> {
  const payout = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  if (payout.status === "SUCCESS" || payout.status === "PROCESSING") return;

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: payout.tenantId } });
  if (!tenant.settlementBankCode || !tenant.settlementAccountNumber) {
    await failPayout(payoutId, "No payout bank account on file");
    return;
  }

  // Deterministic and persisted before the transfer is attempted, so a retry
  // after an ambiguous failure (e.g. a timeout after SafeHaven already moved
  // the money) re-sends the same reference rather than a fresh one.
  const transferReference = payout.transferReference ?? `abiriba_payout_${payout.id}`;
  await prisma.payout.update({ where: { id: payoutId }, data: { status: "PROCESSING", transferReference } });

  const isInstant = tenant.settlementMode === "INSTANT";
  const amountKobo = toKobo(payout.amount);
  // Instant: outward fee + VAT + margin, deducted from the vendor. End of
  // day: base outward fee only, recorded for cost-tracking — the vendor gets
  // the full amount and the platform absorbs it.
  const feeKobo = isInstant ? instantSettlementDeductionFor(amountKobo) : outwardFeeFor(amountKobo);
  // Outward transfers go out in whole Naira. Instant floors (never overpays
  // after the deduction); end-of-day rounds the vendor's full share.
  const sentKobo = isInstant
    ? Math.floor((amountKobo - feeKobo) / 100) * 100
    : Math.round(amountKobo / 100) * 100;

  if (sentKobo <= 0) {
    await failPayout(payoutId, "Payout is too small to cover the instant-settlement fee", false);
    return;
  }

  try {
    const nameEnquiry = await safeHaven.nameEnquiry({
      bankCode: tenant.settlementBankCode,
      accountNumber: tenant.settlementAccountNumber,
    });
    const result = await safeHaven.transfer({
      nameEnquiryReference: nameEnquiry.sessionId,
      debitAccountNumber: env.SAFE_HAVEN_PLATFORM_ACCOUNT_NUMBER,
      beneficiaryBankCode: tenant.settlementBankCode,
      beneficiaryAccountNumber: tenant.settlementAccountNumber,
      narration: "Abiriba payout",
      amount: sentKobo / 100,
      paymentReference: transferReference,
    });

    const recorded = {
      feeAmount: fromKobo(feeKobo),
      transferredAmount: fromKobo(sentKobo),
      nameEnquiryReference: nameEnquiry.sessionId,
    };

    if (result.status === "Completed") {
      await prisma.payout.update({
        where: { id: payoutId },
        data: { ...recorded, status: "SUCCESS", failureReason: null, completedAt: new Date() },
      });
    } else if (/pending|processing/i.test(result.status)) {
      // Deliberately not auto-retried: re-sending could double-pay if the
      // original transfer later completes.
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          ...recorded,
          failureReason: `Transfer ${result.status} at SafeHaven — confirm on the SafeHaven dashboard before retrying`,
        },
      });
    } else {
      await failPayout(payoutId, `Transfer status: ${result.status}`);
    }
  } catch (err) {
    await failPayout(payoutId, err instanceof Error ? err.message : "Unknown payout failure");
  }
}

// Called right after an ONLINE payment is confirmed, for INSTANT tenants.
export async function enqueueInstantPayout(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { tenant: true } });
  // Without a bank account on file the order just waits — the nightly sweep
  // picks it up once one is added.
  if (order.payoutId || !order.tenant.settlementBankCode || !order.tenant.settlementAccountNumber) return;

  const payout = await createPayoutForOrders(order.tenantId, [order.id]);
  if (payout) await executePayout(payout.id);
}

// Nightly: pays out every tenant's online-paid orders that aren't in a payout
// yet — one transfer per tenant per day. Only ONLINE payments count: cash,
// card and staff-recorded transfers were collected by the vendor directly and
// never touched the platform account. Also sweeps INSTANT tenants' stragglers
// (e.g. paid before they'd added a bank account) so no money gets stranded.
export async function runEndOfDayBatch(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    where: { settlementBankCode: { not: null }, settlementAccountNumber: { not: null } },
    select: { id: true },
  });

  for (const tenant of tenants) {
    const orders = await prisma.order.findMany({
      where: { tenantId: tenant.id, status: "PAID", payoutId: null, payment: { is: { method: "ONLINE" } } },
      select: { id: true },
    });
    if (orders.length === 0) continue;

    const payout = await createPayoutForOrders(
      tenant.id,
      orders.map((o) => o.id)
    );
    if (payout) {
      await executePayout(payout.id).catch((err) => console.error("End-of-day payout failed", payout.id, err));
    }
  }
}

// In-process retry loop — no queue infrastructure exists or is needed at
// this scale. Retries FAILED payouts up to MAX_RETRIES.
export function startPayoutRetryLoop(intervalMs = 60_000): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const retryable = await prisma.payout.findMany({
        where: { status: "FAILED", retryCount: { lt: MAX_RETRIES } },
        select: { id: true },
      });
      for (const payout of retryable) {
        await executePayout(payout.id).catch((err) => console.error("Payout retry failed", payout.id, err));
      }
    } catch (err) {
      console.error("Payout retry loop error", err);
    }
  }, intervalMs);
}

// Lagos is UTC+1 year-round (no DST).
const SETTLEMENT_HOUR_LAGOS = 22;
let lastSettlementDate: string | null = null;

// Checks every 10 minutes and runs the nightly batch once per Lagos day after
// 22:00. A restart after that hour can run it again the same day, which is
// harmless — only orders not already in a payout are ever picked up.
export function startEndOfDayScheduler(intervalMs = 10 * 60_000): NodeJS.Timeout {
  return setInterval(() => {
    const lagosNow = new Date(Date.now() + 60 * 60 * 1000);
    const today = lagosNow.toISOString().slice(0, 10);
    if (lagosNow.getUTCHours() < SETTLEMENT_HOUR_LAGOS || lastSettlementDate === today) return;
    lastSettlementDate = today;
    runEndOfDayBatch().catch((err) => console.error("End-of-day settlement failed", err));
  }, intervalMs);
}
