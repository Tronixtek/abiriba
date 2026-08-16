import { prisma } from "../../db/prismaClient.js";
import { hashPassword, verifyPassword } from "../../utils/hash.js";
import { AppError } from "../../utils/AppError.js";
import { slugify } from "../../utils/slug.js";

export async function signupBusiness(params: {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) {
    throw new AppError(409, "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(params.password);

  return prisma.$transaction(async (tx) => {
    const base = slugify(params.businessName);
    let slug = base;
    // Business names collide sometimes — the base slug is tried first, then
    // a random 4-digit suffix is appended until a free one is found.
    while (await tx.tenant.findUnique({ where: { slug } })) {
      slug = `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const tenant = await tx.tenant.create({
      data: { businessName: params.businessName, slug },
    });
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: params.email,
        phone: params.phone,
        passwordHash,
        name: params.ownerName,
        role: "OWNER",
      },
    });
    return { tenant, user };
  });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: { select: { slug: true } } },
  });
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: { select: { slug: true } } },
  });
  if (!user || !user.isActive) {
    throw new AppError(401, "Account no longer active.");
  }
  return user;
}
