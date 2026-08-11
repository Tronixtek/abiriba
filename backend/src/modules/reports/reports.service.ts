import { prisma } from "../../db/prismaClient.js";
import { AppError } from "../../utils/AppError.js";

export type ReportRange = "day" | "week" | "month";

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dateRangeFor(range: ReportRange, anchor: Date): { from: Date; to: Date } {
  const day = startOfUtcDay(anchor);

  if (range === "day") {
    const to = new Date(day);
    to.setUTCDate(to.getUTCDate() + 1);
    return { from: day, to };
  }

  if (range === "week") {
    const from = new Date(day);
    from.setUTCDate(from.getUTCDate() - 6);
    const to = new Date(day);
    to.setUTCDate(to.getUTCDate() + 1);
    return { from, to };
  }

  // month: calendar month containing `anchor`
  const from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
  return { from, to };
}

export async function getSalesReport(params: { tenantId: string; range: ReportRange; date?: string }) {
  const anchor = params.date ? new Date(`${params.date}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(anchor.getTime())) {
    throw new AppError(400, `Invalid date: ${params.date}`);
  }
  const { from, to } = dateRangeFor(params.range, anchor);

  const paidFilter = { tenantId: params.tenantId, status: "PAID" as const, paidAt: { gte: from, lt: to } };

  const [orderAgg, itemAgg, topProducts] = await Promise.all([
    prisma.order.aggregate({ where: paidFilter, _sum: { total: true }, _count: true }),
    prisma.orderItem.aggregate({
      where: { tenantId: params.tenantId, order: paidFilter },
      _sum: { quantity: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "name"],
      where: { tenantId: params.tenantId, order: paidFilter },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 10,
    }),
  ]);

  return {
    range: params.range,
    from: from.toISOString().slice(0, 10),
    to: new Date(to.getTime() - 1).toISOString().slice(0, 10),
    totalRevenue: Number(orderAgg._sum.total ?? 0),
    itemsSold: itemAgg._sum.quantity ?? 0,
    orderCount: orderAgg._count,
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      name: p.name,
      qty: p._sum.quantity ?? 0,
      revenue: Number(p._sum.lineTotal ?? 0),
    })),
  };
}
