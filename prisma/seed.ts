import { PrismaClient, UserStatus } from "@prisma/client";
import { signToken } from "../src/lib/jwt";

const prisma = new PrismaClient();

async function main() {
  // Find the existing PROVIDER role
  const providerRole = await prisma.role.findUnique({
    where: {
      code: "PROVIDER",
    },
  });

  if (!providerRole) {
    throw new Error(
      'PROVIDER role not found. Create it in Prisma Studio first.'
    );
  }

  // Find or create a local test provider user
  const email = "provider.test@ecopartnerhub.local";
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        fullName: "Validation Test Provider",
        roleId: providerRole.id,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      },
    });
  }

  // Generate JWT for Postman
  const token = signToken({
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleCode: providerRole.code,
    status: user.status,
  });

  console.log("\nTest provider user ready!");
  console.log("Email:", user.email);
  console.log("Role:", providerRole.code);
  console.log("\nJWT TOKEN (keep it private):\n");
  console.log(token);
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });