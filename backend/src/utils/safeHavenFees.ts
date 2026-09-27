import { Prisma } from "../generated/prisma/client.js";

// SafeHaven's published fees (their "Fee Breakdown" sheet). Math is done in
// integer kobo to avoid float drift; Decimal only at the edges.

export function toKobo(amount: Prisma.Decimal | number | string): number {
  return Math.round(Number(amount) * 100);
}

export function fromKobo(kobo: number): Prisma.Decimal {
  return new Prisma.Decimal(kobo).dividedBy(100);
}

// Inward (collection) fee, VIR/SUB ACC INWARD: ₦1–₦1,000 → ₦5 flat,
// ₦1,001–₦10,000 → 0.5%, above ₦10,000 → ₦50 flat. No VAT on inward fees.
const INWARD_LOW_THRESHOLD_KOBO = 100_000;
const INWARD_LOW_FLAT_KOBO = 500;
const INWARD_PERCENT = 0.005;
const INWARD_HIGH_THRESHOLD_KOBO = 1_000_000;
const INWARD_HIGH_FLAT_KOBO = 5_000;

/**
 * Grosses up an order total so that after SafeHaven deducts its inward fee
 * from the transfer, the full order total (vendor subtotal + platform fee)
 * still lands intact — the customer covers SafeHaven's cut, the same
 * principle as Product.displayPrice covering the platform fee. The fee is a
 * percentage of the full amount charged, hence dividing rather than adding:
 *   charged - 0.5% × charged = total  →  charged = total / (1 - 0.5%)
 */
export function computeGrossedUpTotal(total: Prisma.Decimal | number | string): { totalCharged: Prisma.Decimal } {
  const target = toKobo(total);

  // Solve for the percentage band, then fall back to the flat fee wherever
  // the solved amount lands outside that band.
  let charged = Math.ceil(target / (1 - INWARD_PERCENT));
  if (charged > INWARD_HIGH_THRESHOLD_KOBO) {
    charged = target + INWARD_HIGH_FLAT_KOBO;
  } else if (charged <= INWARD_LOW_THRESHOLD_KOBO) {
    charged = target + INWARD_LOW_FLAT_KOBO;
  }

  // Whole Naira, rounded up — simpler to send from a bank app, and never short.
  charged = Math.ceil(charged / 100) * 100;
  return { totalCharged: fromKobo(charged) };
}

// Outward (NIP transfer) fee: up to ₦1M → ₦10, up to ₦2.5M → ₦25, above → ₦50.
const OUTWARD_TIER_1_MAX_KOBO = 100_000_000;
const OUTWARD_TIER_1_FEE_KOBO = 1_000;
const OUTWARD_TIER_2_MAX_KOBO = 250_000_000;
const OUTWARD_TIER_2_FEE_KOBO = 2_500;
const OUTWARD_TIER_3_FEE_KOBO = 5_000;

export function outwardFeeFor(amountKobo: number): number {
  if (amountKobo <= OUTWARD_TIER_1_MAX_KOBO) return OUTWARD_TIER_1_FEE_KOBO;
  if (amountKobo <= OUTWARD_TIER_2_MAX_KOBO) return OUTWARD_TIER_2_FEE_KOBO;
  return OUTWARD_TIER_3_FEE_KOBO;
}

// VAT applies to outward transfer fees only.
const OUTWARD_VAT_RATE = 0.075;
const INSTANT_SETTLEMENT_MARGIN_KOBO = 1_000; // ₦10

// Instant settlement means one outward transfer per order instead of one per
// day, so that transfer's fee + VAT + a flat margin come out of the vendor's
// payout. End-of-day payouts don't carry this — the platform absorbs its one
// daily transfer fee.
export function instantSettlementDeductionFor(amountKobo: number): number {
  const fee = outwardFeeFor(amountKobo);
  return fee + Math.round(fee * OUTWARD_VAT_RATE) + INSTANT_SETTLEMENT_MARGIN_KOBO;
}
