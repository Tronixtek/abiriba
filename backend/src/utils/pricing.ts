import { Prisma } from "../generated/prisma/client.js";
import { computeGrossedUpTotal } from "./safeHavenFees.js";

/**
 * Nigeria-only for now (NGN). A product's displayPrice is the single, all-in
 * figure a customer ever sees: the vendor's price, plus the platform fee,
 * plus enough to cover the payment provider's collection fee. Nothing is
 * ever added on top at checkout — the cart total is what gets transferred.
 *
 * Applied once when a vendor sets/edits a price and stored on
 * Product.displayPrice. Never recompute it elsewhere; every customer- and
 * staff-POS-facing price read must come from displayPrice.
 */
export const PLATFORM_FEE_RATE = new Prisma.Decimal("0.005");
export const PLATFORM_FEE_CAP = new Prisma.Decimal("200");

/** The platform's own cut: 0.5% of the vendor's price, capped at NGN 200. */
export function platformFeeFor(vendorPrice: Prisma.Decimal | number | string): Prisma.Decimal {
  const vendor = new Prisma.Decimal(vendorPrice);
  return Prisma.Decimal.min(vendor.times(PLATFORM_FEE_RATE), PLATFORM_FEE_CAP);
}

/**
 * The provider's fee is charged per transfer, not per item, so a per-unit
 * allowance can only be an estimate — it's sized for the worst case (this
 * item bought on its own). A multi-item order therefore collects a little
 * more than the one fee actually costs; that surplus stays with the
 * platform rather than being refunded, which keeps the sticker price
 * stable no matter what else is in the basket.
 */
export function toDisplayPrice(vendorPrice: Prisma.Decimal | number | string): Prisma.Decimal {
  const vendor = new Prisma.Decimal(vendorPrice);
  const net = vendor.plus(platformFeeFor(vendor));
  // Whole Naira, always rounded up — kobo isn't in real circulation, and
  // rounding up means the fee is never under-collected.
  return computeGrossedUpTotal(net).totalCharged;
}

/**
 * Splits a unit's all-in price into who gets what. Order totals are summed
 * from these so subtotal + platformFee + paymentAllowance === total exactly,
 * with no cross-rounding drift.
 */
export function priceBreakdown(vendorPrice: Prisma.Decimal | number | string): {
  vendorPrice: Prisma.Decimal;
  platformFee: Prisma.Decimal;
  paymentAllowance: Prisma.Decimal;
  displayPrice: Prisma.Decimal;
} {
  const vendor = new Prisma.Decimal(vendorPrice);
  const platformFee = platformFeeFor(vendor);
  const displayPrice = toDisplayPrice(vendor);
  return {
    vendorPrice: vendor,
    platformFee,
    paymentAllowance: displayPrice.minus(vendor).minus(platformFee),
    displayPrice,
  };
}
