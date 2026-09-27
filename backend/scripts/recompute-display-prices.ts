import { prisma } from "../src/db/prismaClient.js";
import { toDisplayPrice } from "../src/utils/pricing.js";

/**
 * One-off backfill: recomputes every product's displayPrice with the current
 * pricing rules. Run after changing how displayPrice is derived, otherwise
 * products priced under the old rules keep their old shelf price.
 *
 *   npx tsx scripts/recompute-display-prices.ts [--apply]
 *
 * Without --apply it only reports what would change.
 */
const apply = process.argv.includes("--apply");

const products = await prisma.product.findMany({
  select: { id: true, name: true, price: true, displayPrice: true, tenant: { select: { businessName: true } } },
  orderBy: { name: "asc" },
});

let changed = 0;
for (const product of products) {
  const next = toDisplayPrice(product.price);
  if (next.equals(product.displayPrice)) continue;
  changed++;
  console.log(
    `${product.tenant.businessName} — ${product.name}: ${product.displayPrice.toString()} -> ${next.toString()} (vendor keeps ${product.price.toString()})`
  );
  if (apply) {
    await prisma.product.update({ where: { id: product.id }, data: { displayPrice: next } });
  }
}

console.log(
  `\n${changed} of ${products.length} product(s) ${apply ? "updated" : "would change — re-run with --apply"}.`
);
await prisma.$disconnect();
