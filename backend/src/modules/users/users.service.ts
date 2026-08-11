import { prisma } from "../../db/prismaClient.js";
import { hashPassword } from "../../utils/hash.js";
import { AppError } from "../../utils/AppError.js";
import type { Role } from "../../shared/types.js";

export async function listUsers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
}

export async function createStaffUser(params: {
  tenantId: string;
  callerRole: Role;
  name: string;
  email: string;
  password: string;
  role: Extract<Role, "MANAGER" | "STAFF">;
}) {
  if (params.callerRole === "MANAGER" && params.role === "MANAGER") {
    throw new AppError(403, "Managers can only create Staff accounts, not other Managers.");
  }

  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) {
    throw new AppError(409, "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(params.password);
  const user = await prisma.user.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      email: params.email,
      passwordHash,
      role: params.role,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  return user;
}
