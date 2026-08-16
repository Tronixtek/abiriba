import { prisma } from "../../db/prismaClient.js";
import { AppError } from "../../utils/AppError.js";

const PAID_FILTER = { status: "PAID" as const };

/**
 * The one deliberate place in this codebase where an Order/OrderItem
 * aggregate has no tenantId filter — this is the platform operator's own
 * cross-tenant view, not reachable by any tenant-scoped role.
 */
export async function getPlatformStats() {
  const [tenantCount, activeUserCount, orderAgg, itemAgg] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.order.aggregate({
      where: PAID_FILTER,
      _sum: { total: true, subtotal: true, platformFee: true },
      _count: true,
    }),
    prisma.orderItem.aggregate({
      where: { order: PAID_FILTER },
      _sum: { quantity: true },
    }),
  ]);

  return {
    tenantCount,
    activeUserCount,
    transactionCount: orderAgg._count,
    itemsSold: itemAgg._sum.quantity ?? 0,
    gmv: Number(orderAgg._sum.total ?? 0),
    vendorPayouts: Number(orderAgg._sum.subtotal ?? 0),
    platformRevenue: Number(orderAgg._sum.platformFee ?? 0),
  };
}

export async function listTenants() {
  const [tenants, revenueByTenant] = await Promise.all([
    prisma.tenant.findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, products: true, orders: true } },
        users: { where: { role: "OWNER" }, take: 1, select: { name: true, email: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["tenantId"],
      where: PAID_FILTER,
      _sum: { total: true, subtotal: true, platformFee: true },
    }),
  ]);

  const revenueMap = new Map(revenueByTenant.map((r) => [r.tenantId, r._sum]));

  return tenants.map((t) => {
    const revenue = revenueMap.get(t.id);
    const owner = t.users[0];
    return {
      id: t.id,
      businessName: t.businessName,
      createdAt: t.createdAt,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      userCount: t._count.users,
      productCount: t._count.products,
      orderCount: t._count.orders,
      gmv: Number(revenue?.total ?? 0),
      vendorPayouts: Number(revenue?.subtotal ?? 0),
      platformRevenue: Number(revenue?.platformFee ?? 0),
    };
  });
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Daily growth series for the last `days` days (including today), for the
 * admin dashboard's trend charts. Every day in the range is pre-seeded so
 * the series has no gaps even when a given day had no activity.
 */
export async function getGrowthTrends(days: number) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  from.setUTCHours(0, 0, 0, 0);

  const [orders, tenants] = await Promise.all([
    prisma.order.findMany({
      where: { ...PAID_FILTER, paidAt: { gte: from } },
      select: { paidAt: true, total: true, platformFee: true, items: { select: { quantity: true } } },
    }),
    prisma.tenant.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    }),
  ]);

  const buckets = new Map<
    string,
    { date: string; newTenants: number; transactions: number; gmv: number; platformRevenue: number; itemsSold: number }
  >();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setUTCDate(from.getUTCDate() + i);
    const key = dayKey(d);
    buckets.set(key, { date: key, newTenants: 0, transactions: 0, gmv: 0, platformRevenue: 0, itemsSold: 0 });
  }

  for (const o of orders) {
    const bucket = buckets.get(dayKey(o.paidAt!));
    if (!bucket) continue;
    bucket.transactions += 1;
    bucket.gmv += Number(o.total);
    bucket.platformRevenue += Number(o.platformFee);
    bucket.itemsSold += o.items.reduce((sum, i) => sum + i.quantity, 0);
  }
  for (const t of tenants) {
    const bucket = buckets.get(dayKey(t.createdAt));
    if (bucket) bucket.newTenants += 1;
  }

  return Array.from(buckets.values());
}

export async function getTenantDetail(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { products: true, customers: true } },
    },
  });
  if (!tenant) {
    throw new AppError(404, "Business not found.");
  }

  const [orderAgg, recentOrders, recentStockAdjustments] = await Promise.all([
    prisma.order.aggregate({
      where: { tenantId, ...PAID_FILTER },
      _sum: { total: true, subtotal: true, platformFee: true },
      _count: true,
    }),
    prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true, payment: true },
    }),
    prisma.stockAdjustment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { product: { select: { name: true } }, user: { select: { name: true } } },
    }),
  ]);

  return {
    id: tenant.id,
    businessName: tenant.businessName,
    createdAt: tenant.createdAt,
    users: tenant.users,
    productCount: tenant._count.products,
    customerCount: tenant._count.customers,
    transactionCount: orderAgg._count,
    gmv: Number(orderAgg._sum.total ?? 0),
    vendorPayouts: Number(orderAgg._sum.subtotal ?? 0),
    platformRevenue: Number(orderAgg._sum.platformFee ?? 0),
    recentOrders,
    recentStockAdjustments,
  };
}
