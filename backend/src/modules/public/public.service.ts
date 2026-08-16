import { prisma } from "../../db/prismaClient.js";
import { AppError } from "../../utils/AppError.js";
import { createOrder } from "../orders/orders.service.js";
import { haversineKm } from "../../utils/geo.js";

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

/**
 * Lets a customer revisit an order they placed (e.g. to check whether staff
 * have marked it paid yet) using nothing but the unguessable order id — no
 * customer account exists to authenticate against. Deliberately returns a
 * minimal, public-safe shape: never the vendor's subtotal/platformFee split,
 * staff identities, or void reasons.
 */
export async function getPublicOrder(params: { slug: string; orderId: string }) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } });
  if (!tenant) {
    throw new AppError(404, "Store not found.");
  }

  const order = await prisma.order.findFirst({
    where: { id: params.orderId, tenantId: tenant.id },
    include: { items: true },
  });
  if (!order) {
    throw new AppError(404, "Order not found.");
  }

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
  };
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
 * Creates a customer-submitted order awaiting in-person payment — same
 * OPEN status a staff-built cart would get, just tagged source=CUSTOMER_QR
 * with no createdById (no staff user is involved). Staff confirm payment
 * later via the existing orders.service.ts#payOrder, unchanged.
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
