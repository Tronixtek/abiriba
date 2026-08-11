import { Prisma } from "../generated/prisma/client.js";

/**
 * Nigeria-only for now (NGN). 0.5% platform fee per item, capped at NGN 200
 * per item — applied once when a vendor sets/edits a product's price and
 * stored on Product.displayPrice. Never recompute this elsewhere; every
 * customer- and staff-POS-facing price read must come from displayPrice.
 */
export const PLATFORM_FEE_RATE = new Prisma.Decimal("0.005");
export const PLATFORM_FEE_CAP = new Prisma.Decimal("200");

export function toDisplayPrice(vendorPrice: Prisma.Decimal | number | string): Prisma.Decimal {
  const vendor = new Prisma.Decimal(vendorPrice);
  const fee = Prisma.Decimal.min(vendor.times(PLATFORM_FEE_RATE), PLATFORM_FEE_CAP);
  // Whole Naira only — kobo isn't in real circulation, so customers must
  // never be charged a fraction. Always rounds up, never down, so the fee
  // is never under-collected.
  return vendor.plus(fee).toDecimalPlaces(0, Prisma.Decimal.ROUND_UP);
}
