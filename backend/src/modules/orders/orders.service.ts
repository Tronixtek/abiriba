import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/prismaClient.js";
import { AppError } from "../../utils/AppError.js";
import { sendReceiptEmail } from "../../email/receiptService.js";
import { platformFeeFor } from "../../utils/pricing.js";
import type { OrderSource, PaymentMethod } from "../../generated/prisma/enums.js";

export async function listOrders(tenantId: string) {
  return prisma.order.findMany({
    where: { tenantId },
    include: { items: true, payment: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrder(tenantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: { items: true, payment: true },
  });
  if (!order) throw new AppError(404, "Order not found.");
  return order;
}

/**
 * Cart creation recomputes line totals from the authoritative Product
 * price server-side rather than trusting client-supplied prices — the
 * client only sends { productId, quantity }. Also used by the public
 * QR-ordering flow (public.service.ts), which has no `createdById` since
 * there's no authenticated staff user — hence it's optional here.
 */
export async function createOrder(params: {
  tenantId: string;
  createdById?: string;
  source?: OrderSource;
  customerId?: string;
  items: { productId: string; quantity: number }[];
}) {
  if (params.items.length === 0) {
    throw new AppError(400, "Cannot create an empty order.");
  }

  const products = await prisma.product.findMany({
    where: { tenantId: params.tenantId, id: { in: params.items.map((i) => i.productId) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineItems = params.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new AppError(404, `Product ${item.productId} not found.`);
    if (item.quantity <= 0) throw new AppError(400, "Quantity must be positive.");
    if (product.quantity < item.quantity) {
      throw new AppError(
        400,
        `Not enough stock for "${product.name}" (have ${product.quantity}, requested ${item.quantity}).`
      );
    }
    // unitPrice is the precomputed, all-in Product.displayPrice — the only
    // price customers/staff-POS ever see, and exactly what gets charged.
    // The split below is internal bookkeeping only.
    const unitPrice = product.displayPrice;
    const lineTotal = unitPrice.times(item.quantity);
    const vendorLineTotal = product.price.times(item.quantity);
    const platformLineTotal = platformFeeFor(product.price).times(item.quantity);
    return {
      tenantId: params.tenantId,
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      vendorLineTotal,
      platformLineTotal,
    };
  });

  const total = lineItems.reduce((sum, item) => sum.plus(item.lineTotal), new Prisma.Decimal(0));
  const subtotal = lineItems.reduce((sum, item) => sum.plus(item.vendorLineTotal), new Prisma.Decimal(0));
  const platformFee = lineItems.reduce((sum, item) => sum.plus(item.platformLineTotal), new Prisma.Decimal(0));
  // Derived, never recomputed via the rate a second time — guarantees
  // subtotal + platformFee + paymentAllowance === total exactly, with no
  // cross-rounding drift.
  const paymentAllowance = total.minus(subtotal).minus(platformFee);

  let customerName: string | null = null;
  if (params.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: params.customerId, tenantId: params.tenantId },
    });
    if (!customer) throw new AppError(404, "Customer not found.");
    customerName = customer.name;
  }

  return prisma.order.create({
    data: {
      tenantId: params.tenantId,
      customerId: params.customerId,
      customerName,
      status: "OPEN",
      source: params.source ?? "STAFF",
      subtotal,
      platformFee,
      paymentAllowance,
      total,
      createdById: params.createdById,
      items: {
        create: lineItems.map(
          ({ vendorLineTotal: _vendorLineTotal, platformLineTotal: _platformLineTotal, ...item }) => item
        ),
      },
    },
    include: { items: true },
  });
}

export async function payOrder(params: {
  tenantId: string;
  orderId: string;
  // Omitted for ONLINE payments — the customer paid directly, no staff actor.
  userId?: string;
  method: PaymentMethod;
}) {
  const order = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: params.orderId, tenantId: params.tenantId },
      include: { items: true, customer: true },
    });
    if (!order) throw new AppError(404, "Order not found.");
    if (order.status !== "OPEN") {
      throw new AppError(400, `Order is already ${order.status.toLowerCase()}.`);
    }
    if (order.items.length === 0) {
      throw new AppError(400, "Cannot pay an empty order.");
    }

    const products = await tx.product.findMany({
      where: { tenantId: params.tenantId, id: { in: order.items.map((i) => i.productId) } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of order.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new AppError(404, `Product ${item.productId} no longer exists.`);
      if (product.quantity < item.quantity) {
        throw new AppError(
          400,
          `Not enough stock for "${product.name}" (have ${product.quantity}, need ${item.quantity}).`
        );
      }
    }

    for (const item of order.items) {
      const product = productMap.get(item.productId)!;
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: product.quantity - item.quantity },
      });
      await tx.stockAdjustment.create({
        data: {
          tenantId: params.tenantId,
          productId: item.productId,
          userId: params.userId,
          delta: -item.quantity,
          reason: "SALE",
          orderId: order.id,
        },
      });
    }

    await tx.payment.create({
      data: {
        tenantId: params.tenantId,
        orderId: order.id,
        method: params.method,
        amount: order.total,
        markedPaidById: params.userId,
      },
    });

    const receiptStatus = order.customer?.email ? "PENDING" : "NOT_APPLICABLE";

    return tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date(), receiptStatus },
      include: { items: true, payment: true, customer: true },
    });
  });

  if (order.receiptStatus === "PENDING") {
    // Best-effort, decoupled from the transaction: a slow/failed send must
    // never block or roll back a sale that's already been recorded.
    sendReceiptEmail(order).catch((err) => console.error("Failed to send receipt email", err));
  }

  return order;
}

export async function voidOrder(params: {
  tenantId: string;
  orderId: string;
  userId: string;
  reason: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: params.orderId, tenantId: params.tenantId },
      include: { items: true },
    });
    if (!order) throw new AppError(404, "Order not found.");
    if (order.status !== "PAID") {
      throw new AppError(400, `Only PAID orders can be voided (this order is ${order.status}).`);
    }

    const products = await tx.product.findMany({
      where: { tenantId: params.tenantId, id: { in: order.items.map((i) => i.productId) } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of order.items) {
      const product = productMap.get(item.productId);
      if (!product) continue; // product may have been deleted since the sale
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: product.quantity + item.quantity },
      });
      await tx.stockAdjustment.create({
        data: {
          tenantId: params.tenantId,
          productId: item.productId,
          userId: params.userId,
          delta: item.quantity,
          reason: "VOID_RESTOCK",
          orderId: order.id,
          note: params.reason,
        },
      });
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
        voidedById: params.userId,
        voidReason: params.reason,
      },
      include: { items: true, payment: true },
    });
  });
}
