import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/prismaClient.js";
import { AppError } from "../../utils/AppError.js";
import { toDisplayPrice } from "../../utils/pricing.js";

export async function listProducts(tenantId: string) {
  return prisma.product.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function getLowStockProducts(tenantId: string) {
  return prisma.$queryRaw`
    SELECT * FROM "Product"
    WHERE "tenantId" = ${tenantId} AND "quantity" <= "lowStockThreshold" AND "isActive" = true
    ORDER BY "name" ASC
  `;
}

export async function createProduct(params: {
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
}) {
  try {
    return await prisma.product.create({
      data: {
        tenantId: params.tenantId,
        sku: params.sku,
        name: params.name,
        description: params.description,
        price: params.price,
        displayPrice: toDisplayPrice(params.price),
        quantity: params.quantity,
        lowStockThreshold: params.lowStockThreshold,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, `A product with SKU "${params.sku}" already exists.`);
    }
    throw err;
  }
}

export async function updateProduct(params: {
  tenantId: string;
  productId: string;
  name?: string;
  description?: string;
  price?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
}) {
  const { count } = await prisma.product.updateMany({
    where: { id: params.productId, tenantId: params.tenantId },
    data: {
      name: params.name,
      description: params.description,
      price: params.price,
      displayPrice: params.price !== undefined ? toDisplayPrice(params.price) : undefined,
      lowStockThreshold: params.lowStockThreshold,
      isActive: params.isActive,
    },
  });
  if (count === 0) {
    throw new AppError(404, "Product not found.");
  }
  return prisma.product.findFirstOrThrow({ where: { id: params.productId, tenantId: params.tenantId } });
}

export async function adjustStock(params: {
  tenantId: string;
  userId: string;
  productId: string;
  delta: number;
  reason: "RESTOCK" | "MANUAL_CORRECTION";
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: params.productId, tenantId: params.tenantId },
    });
    if (!product) {
      throw new AppError(404, "Product not found.");
    }
    const newQuantity = product.quantity + params.delta;
    if (newQuantity < 0) {
      throw new AppError(
        400,
        `Adjustment would leave negative stock (current: ${product.quantity}).`
      );
    }

    const updated = await tx.product.update({
      where: { id: params.productId },
      data: { quantity: newQuantity },
    });

    await tx.stockAdjustment.create({
      data: {
        tenantId: params.tenantId,
        productId: params.productId,
        userId: params.userId,
        delta: params.delta,
        reason: params.reason,
        note: params.note,
      },
    });

    return updated;
  });
}
