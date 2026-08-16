import { prisma } from "../src/db/prismaClient.js";
import { hashPassword } from "../src/utils/hash.js";

/**
 * The only way to create a super-admin account — there is deliberately no
 * public signup route for AdminUser. Run from backend/:
 *   npx tsx scripts/create-admin.ts <email> <password> "<name>"
 */
async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password || !name) {
    console.error('Usage: npx tsx scripts/create-admin.ts <email> <password> "<name>"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.error(`An admin with email "${email}" already exists.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.adminUser.create({ data: { email, passwordHash, name } });
  console.log(`Created admin: ${admin.email} (${admin.id})`);
  process.exit(0);
}

main();
