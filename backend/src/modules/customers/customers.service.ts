import { prisma } from "../../db/prismaClient.js";

export async function listCustomers(tenantId: string) {
  return prisma.customer.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function createCustomer(params: {
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
}) {
  return prisma.customer.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      email: params.email,
      phone: params.phone,
    },
  });
}
