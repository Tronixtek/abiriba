import { prisma } from "../../db/prismaClient.js";

export async function listStockAdjustments(tenantId: string) {
  return prisma.stockAdjustment.findMany({
    where: { tenantId },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
