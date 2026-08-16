import { prisma } from "../../../db/prismaClient.js";
import { verifyPassword } from "../../../utils/hash.js";
import { AppError } from "../../../utils/AppError.js";

export async function login(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) {
    throw new AppError(401, "Invalid email or password.");
  }
  const valid = await verifyPassword(admin.passwordHash, password);
  if (!valid) {
    throw new AppError(401, "Invalid email or password.");
  }
  return admin;
}

export async function getAdminById(adminId: string) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) {
    throw new AppError(401, "Account no longer active.");
  }
  return admin;
}
