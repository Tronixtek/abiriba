import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/prismaClient.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import { createOrder, payOrder } from "../orders/orders.service.js";
import { haversineKm } from "../../utils/geo.js";
import * as safeHaven from "../../utils/safeHavenClient.js";
import { computeGrossedUpTotal, toKobo } from "../../utils/safeHavenFees.js";
import { enqueueInstantPayout } from "../payouts/payouts.service.js";

/**
 * Public, unauthenticated storefront — deliberately exposes the minimum:
 * business name + active products, and never exact stock counts (just
 * in-stock/out-of-stock), to avoid leaking inventory levels publicly.
 */
export async function getStorefront(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new AppError(404, "Store not found.");
  }

  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { name: "asc" },
    include: { images: { orderBy: { position: "asc" } } },
  });

  return {
    businessName: tenant.businessName,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.displayPrice, // fee-inclusive price only — never the vendor's raw price
      images: p.images.map((img) => img.url),
      available: p.quantity > 0,
    })),
  };
}

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

// Minimal, public-safe shape: never the vendor's subtotal/platformFee split,
// staff identities, or void reasons.
function toPublicOrder(order: OrderWithItems) {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    totalCharged: order.totalCharged,
    safeHavenAccountNumber: order.safeHavenAccountNumber,
    safeHavenBankName: order.safeHavenBankName,
    safeHavenExpiresAt: order.safeHavenExpiresAt,
  };
}

async function findTenantBySlug(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new AppError(404, "Store not found.");
  }
  return tenant;
}

/**
 * Lets a customer revisit an order they placed (e.g. to check whether it's
 * been paid yet) using nothing but the unguessable order id — no customer
 * account exists to authenticate against.
 */
export async function getPublicOrder(params: { slug: string; orderId: string }) {
  const tenant = await findTenantBySlug(params.slug);

  const order = await prisma.order.findFirst({
    where: { id: params.orderId, tenantId: tenant.id },
    include: { items: true },
  });
  if (!order) {
    throw new AppError(404, "Order not found.");
  }

  return toPublicOrder(order);
}

/**
 * Real, live count — used by the marketing landing page's "join N
 * businesses" line. No fabricated numbers; this is the actual tenant count.
 */
export async function getPlatformStats() {
  const businessCount = await prisma.tenant.count();
  return { businessCount };
}

/**
 * Cities that currently have at least one marketplace-listed vendor — powers
 * a pick-from-a-list city filter on the customer side, rather than freeform
 * text that would need to match whatever a vendor happened to type.
 */
export async function listMarketplaceCities() {
  const rows = await prisma.tenant.findMany({
    where: { marketplaceEnabled: true, city: { not: null } },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });
  return rows.map((r) => r.city as string);
}

/**
 * The one deliberately cross-tenant public query in the app — searches every
 * marketplace-opted-in vendor's active, in-stock products by name. Same
 * safe-field discipline as getStorefront: never raw price, quantity, tenant
 * id, or exact coordinates — just enough to let a customer find a nearby
 * shop and click through to its storefront.
 */
export async function searchMarketplace(params: { query: string; city?: string; lat?: number; lng?: number }) {
  const query = params.query.trim();
  if (query.length < 2) {
    throw new AppError(400, "Search term must be at least 2 characters.");
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      quantity: { gt: 0 },
      name: { contains: query, mode: "insensitive" },
      tenant: {
        marketplaceEnabled: true,
        latitude: { not: null },
        longitude: { not: null },
        ...(params.city ? { city: { equals: params.city, mode: "insensitive" as const } } : {}),
      },
    },
    include: {
      tenant: {
        select: {
          businessName: true,
          slug: true,
          state: true,
          city: true,
          street: true,
          streetNumber: true,
          latitude: true,
          longitude: true,
        },
      },
      images: { orderBy: { position: "asc" }, take: 1 },
    },
    take: 200,
  });

  const grouped = new Map<
    string,
    {
      distance: number | null;
      result: {
        businessName: string;
        slug: string;
        state: string | null;
        city: string | null;
        street: string | null;
        streetNumber: string | null;
        distanceKm: number | null;
        products: { name: string; displayPrice: unknown; image: string | null }[];
      };
    }
  >();

  for (const p of products) {
    const t = p.tenant;
    if (!grouped.has(t.slug)) {
      const distance =
        params.lat !== undefined && params.lng !== undefined && t.latitude !== null && t.longitude !== null
          ? haversineKm(params.lat, params.lng, Number(t.latitude), Number(t.longitude))
          : null;
      grouped.set(t.slug, {
        distance,
        result: {
          businessName: t.businessName,
          slug: t.slug,
          state: t.state,
          city: t.city,
          street: t.street,
          streetNumber: t.streetNumber,
          distanceKm: distance,
          products: [],
        },
      });
    }
    const entry = grouped.get(t.slug)!;
    if (entry.result.products.length < 3) {
      entry.result.products.push({
        name: p.name,
        displayPrice: p.displayPrice, // fee-inclusive price only — never the vendor's raw price
        image: p.images[0]?.url ?? null,
      });
    }
  }

  const sorted = Array.from(grouped.values()).sort((a, b) => {
    if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
    if (a.distance !== null) return -1;
    if (b.distance !== null) return 1;
    return a.result.businessName.localeCompare(b.result.businessName);
  });

  return sorted.slice(0, 20).map((entry) => entry.result);
}

/**
 * Creates a customer-submitted order awaiting payment — same OPEN status a
 * staff-built cart would get, just tagged source=CUSTOMER_QR with no
 * createdById (no staff user is involved). It's paid either online via
 * initializeSafeHavenPayment below, or in person via orders.service.ts#payOrder.
 */
export async function createPublicOrder(params: {
  slug: string;
  items: { productId: string; quantity: number }[];
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } });
  if (!tenant) {
    throw new AppError(404, "Store not found.");
  }

  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    },
  });

  return createOrder({
    tenantId: tenant.id,
    customerId: customer.id,
    source: "CUSTOMER_QR",
    items: params.items,
  });
}

const PAYMENT_WINDOW_SECONDS = 30 * 60;

/**
 * Gives the customer a SafeHaven virtual account to transfer this order's
 * total into. The amount is grossed up so SafeHaven's own collection fee is
 * covered by the customer, not the vendor or platform. Reuses a still-valid
 * virtual account instead of minting a second one for the same order.
 */
export async function initializeSafeHavenPayment(params: { slug: string; orderId: string }) {
  const tenant = await findTenantBySlug(params.slug);
  const order = await prisma.order.findFirst({
    where: { id: params.orderId, tenantId: tenant.id },
    include: { items: true },
  });
  if (!order) {
    throw new AppError(404, "Order not found.");
  }
  // In-person (staff-built) orders are paid at the till, not through this flow.
  if (order.source !== "CUSTOMER_QR") {
    throw new AppError(400, "Online payment is only available for orders placed from the storefront.");
  }
  if (order.status !== "OPEN") {
    throw new AppError(400, "This order isn't awaiting payment.");
  }

  if (
    order.safeHavenVirtualAccountId &&
    order.safeHavenAccountNumber &&
    order.totalCharged &&
    order.safeHavenExpiresAt &&
    order.safeHavenExpiresAt.getTime() > Date.now() + 60_000
  ) {
    return {
      accountNumber: order.safeHavenAccountNumber,
      accountName: null,
      bankName: order.safeHavenBankName ?? "Safe Haven MFB",
      totalCharged: order.totalCharged,
      expiresAt: order.safeHavenExpiresAt,
    };
  }

  // Stock is only decremented once payment is confirmed, so check it now
  // rather than let a customer pay for something that has since sold out.
  const products = await prisma.product.findMany({
    where: { tenantId: tenant.id, id: { in: order.items.map((i) => i.productId) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of order.items) {
    const product = productMap.get(item.productId);
    if (!product || product.quantity < item.quantity) {
      throw new AppError(409, `Sorry, "${item.name}" has just sold out. Please speak to a staff member.`);
    }
  }

  const { totalCharged } = computeGrossedUpTotal(order.total);
  const [banks, virtualAccount] = await Promise.all([
    safeHaven.listBanks().catch(() => [] as safeHaven.Bank[]),
    safeHaven.createVirtualAccount({
      amount: Number(totalCharged.toFixed(2)),
      callbackUrl: `${env.BACKEND_PUBLIC_URL}/public/${encodeURIComponent(params.slug)}/orders/${order.id}/safehaven-webhook`,
      validForSeconds: PAYMENT_WINDOW_SECONDS,
    }),
  ]);

  const bankName = banks.find((b) => b.code === virtualAccount.bankCode)?.name ?? "Safe Haven MFB";
  const providerExpiry = virtualAccount.expiryDate ? new Date(virtualAccount.expiryDate) : null;
  const expiresAt =
    providerExpiry && !Number.isNaN(providerExpiry.getTime())
      ? providerExpiry
      : new Date(Date.now() + PAYMENT_WINDOW_SECONDS * 1000);

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      safeHavenVirtualAccountId: virtualAccount._id,
      safeHavenAccountNumber: virtualAccount.accountNumber,
      safeHavenBankName: bankName,
      safeHavenPaymentReference: `abiriba_ord_${order.id}_${Date.now()}`,
      safeHavenExpiresAt: expiresAt,
      totalCharged,
    },
  });

  return {
    accountNumber: virtualAccount.accountNumber,
    accountName: virtualAccount.accountName ?? null,
    bankName,
    totalCharged: updated.totalCharged!,
    expiresAt,
  };
}

/**
 * Idempotent — called by the webhook, the customer's "check now" button, and
 * a periodic poll, possibly concurrently. Never trusts a webhook's claim:
 * payment is independently confirmed via an authenticated SafeHaven call on
 * our own stored virtual account id before anything is marked paid.
 */
export async function verifyAndApplySafeHavenPayment(params: { slug: string; orderId: string }) {
  const tenant = await findTenantBySlug(params.slug);
  const order = await prisma.order.findFirst({
    where: { id: params.orderId, tenantId: tenant.id },
    include: { items: true },
  });
  if (!order) {
    throw new AppError(404, "Order not found.");
  }
  if (order.status !== "OPEN" || !order.safeHavenVirtualAccountId || !order.totalCharged) {
    return toPublicOrder(order);
  }

  // Checked regardless of expiry: a transfer that landed just before the
  // window closed still counts, even if this check runs after it.
  const transaction = await safeHaven.getVirtualAccountTransaction(order.safeHavenVirtualAccountId);
  if (!transaction || transaction.status !== "Completed") {
    return toPublicOrder(order);
  }

  // Math.round: transaction.amount is a kobo-precise decimal, and raw float
  // multiplication can drift (e.g. 202.02 * 100 = 20201.999...).
  if (Math.round(transaction.amount * 100) !== toKobo(order.totalCharged)) {
    console.error("SafeHaven payment amount mismatch", order.id, transaction.amount, order.totalCharged.toString());
    throw new AppError(400, "The amount received doesn't match this order. Please speak to a staff member.");
  }

  let applied = false;
  try {
    // Reuses the exact same stock-decrement / Payment / receipt transaction a
    // staff "mark paid" goes through. Payment.orderId is unique, so a racing
    // second caller's transaction fails and rolls back rather than double-applying.
    await payOrder({ tenantId: tenant.id, orderId: order.id, method: "ONLINE" });
    applied = true;
  } catch (err) {
    const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { status: true } });
    if (current.status !== "PAID") {
      // Money has arrived but the order couldn't be completed (e.g. an item
      // sold out in the meantime) — needs a human to fulfil or refund.
      console.error("SafeHaven payment received but order could not be marked paid", order.id, err);
      throw new AppError(
        409,
        "Your payment was received, but we couldn't confirm your order automatically. Please show this screen to a staff member."
      );
    }
  }

  if (applied && tenant.settlementMode === "INSTANT") {
    enqueueInstantPayout(order.id).catch((err) => {
      console.error("Failed to enqueue instant payout", order.id, err);
    });
  }

  const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
  return toPublicOrder(updated);
}
