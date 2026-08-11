import { prisma } from "../../db/prismaClient.js";
import { hashPassword, verifyPassword } from "../../utils/hash.js";
import { AppError } from "../../utils/AppError.js";

export async function signupBusiness(params: {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) {
    throw new AppError(409, "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(params.password);

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { businessName: params.businessName },
    });
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: params.email,
        passwordHash,
        name: params.ownerName,
        role: "OWNER",
      },
    });
    return { tenant, user };
  });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new AppError(401, "Invalid email or password.");
  }
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw new AppError(401, "Invalid email or password.");
  }
  return user;
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new AppError(401, "Account no longer active.");
  }
  return user;
}
