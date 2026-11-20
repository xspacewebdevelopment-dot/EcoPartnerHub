import { PrismaClient, Role, AccountStatus, EntityType, VerificationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting controlled initial seed for EcomPartnerHub...");

  // 1. Seed SUPER_ADMIN (Restricted initial setup)
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "superadmin@ecopartnerhub.com";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@2026";
  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    },
    create: {
      email: superAdminEmail,
      phone: "+919999999999",
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.email} (Role: ${superAdmin.role})`);

  // 2. Seed Initial Operations ADMIN
  const adminEmail = "admin@ecopartnerhub.com";
  const adminPassword = "AdminUser@2026";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminHash,
      role: Role.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    },
    create: {
      email: adminEmail,
      phone: "+919888888888",
      passwordHash: adminHash,
      role: Role.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });
  console.log(`✅ Operations Admin created: ${admin.email} (Role: ${admin.role})`);

  // 3. Seed Sample CUSTOMER
  const customerEmail = "customer@ecopartnerhub.com";
  const customerPassword = "Customer@2026";
  const customerHash = await bcrypt.hash(customerPassword, 10);

  const customer = await prisma.user.upsert({
    where: { email: customerEmail },
    update: {
      passwordHash: customerHash,
      role: Role.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
    },
    create: {
      email: customerEmail,
      phone: "+919777777777",
      passwordHash: customerHash,
      role: Role.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      isEmailVerified: true,
      customerProfile: {
        create: {
          fullName: "Aarav Sharma",
          businessName: "Aarav Organics D2C",
          businessType: "D2C Brand",
          city: "Bengaluru",
          marketplacePresence: ["Amazon", "Flipkart", "Blinkit"],
          isBusinessVerified: true,
        },
      },
    },
  });
  console.log(`✅ Sample Customer created: ${customer.email} (Role: ${customer.role})`);

  // 4. Seed Sample PROVIDER
  const providerEmail = "provider@ecopartnerhub.com";
  const providerPassword = "Provider@2026";
  const providerHash = await bcrypt.hash(providerPassword, 10);

  const provider = await prisma.user.upsert({
    where: { email: providerEmail },
    update: {
      passwordHash: providerHash,
      role: Role.PROVIDER,
      accountStatus: AccountStatus.ACTIVE,
    },
    create: {
      email: providerEmail,
      phone: "+919666666666",
      passwordHash: providerHash,
      role: Role.PROVIDER,
      accountStatus: AccountStatus.ACTIVE,
      isEmailVerified: true,
      providerProfile: {
        create: {
          legalName: "Apex Growth Agency LLP",
          displayName: "Apex Marketplace Specialists",
          entityType: EntityType.LLP,
          operatingLocations: ["Mumbai", "Delhi NCR", "Bengaluru"],
          membershipStatus: "ACTIVE",
          verificationLevel: 2, // Level 2 — Business Verified
          verificationStatus: VerificationStatus.APPROVED,
          website: "https://apexgrowth.example.com",
          bio: "Specializing in marketplace ads, catalogue optimization, and Quick Commerce operations.",
        },
      },
    },
  });
  console.log(`✅ Sample Provider created: ${provider.email} (Role: ${provider.role})`);

  console.log("🎉 Seed finished successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
