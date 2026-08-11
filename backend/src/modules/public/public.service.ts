import { prisma } from "../../db/prismaClient.js";
import { AppError } from "../../utils/AppError.js";
import { createOrder } from "../orders/orders.service.js";

/**
 * Public, unauthenticated storefront — deliberately exposes the minimum:
 * business name + active products, and never exact stock counts (just
 * in-stock/out-of-stock), to avoid leaking inventory levels publicly.
 */
export async function getStorefront(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new AppError(404, "Store not found.");
  }

  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
  });

  return {
    businessName: tenant.businessName,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.displayPrice, // fee-inclusive price only — never the vendor's raw price
      available: p.quantity > 0,
    })),
  };
}

/**
 * Creates a customer-submitted order awaiting in-person payment — same
 * OPEN status a staff-built cart would get, just tagged source=CUSTOMER_QR
 * with no createdById (no staff user is involved). Staff confirm payment
 * later via the existing orders.service.ts#payOrder, unchanged.
 */
export async function createPublicOrder(params: {
  tenantId: string;
  items: { productId: string; quantity: number }[];
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}) {
  const tenant = await prisma.tenant.findUnique({ where: { id: params.tenantId } });
  if (!tenant) {
    throw new AppError(404, "Store not found.");
  }

  const customer = await prisma.customer.create({
    data: {
      tenantId: params.tenantId,
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    },
  });

  return createOrder({
    tenantId: params.tenantId,
    customerId: customer.id,
    source: "CUSTOMER_QR",
    items: params.items,
  });
}
