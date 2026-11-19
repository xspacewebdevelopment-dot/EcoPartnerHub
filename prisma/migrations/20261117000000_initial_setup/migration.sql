-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "ProviderVerificationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('FREE', 'VERIFIED_STANDARD', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "MarketplaceType" AS ENUM ('REGIONAL', 'INDUSTRY_VERTICAL', 'GLOBAL');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FIXED', 'HOURLY', 'CUSTOM_QUOTE', 'STARTING_AT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "roleId" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "preferences" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalEntityName" TEXT,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "description" TEXT NOT NULL,
    "tagline" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "website" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "addressLine1" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "verificationStatus" "ProviderVerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "isPubliclyVisible" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "membershipTier" "MembershipTier" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProviderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "parentId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marketplace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "MarketplaceType" NOT NULL DEFAULT 'REGIONAL',
    "regionCode" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marketplace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderService" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customTitle" TEXT,
    "customDescription" TEXT,
    "pricingModel" "PricingModel" NOT NULL DEFAULT 'CUSTOM_QUOTE',
    "startingPrice" DECIMAL(12,2),
    "currency" TEXT,
    "experienceYears" INTEGER,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderMarketplace" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "isListed" BOOLEAN NOT NULL DEFAULT true,
    "listingPriority" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderMarketplace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderVerificationAuditLog" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "previousStatus" "ProviderVerificationStatus",
    "newStatus" "ProviderVerificationStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "internalNotes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderVerificationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_resource_action_idx" ON "Permission"("resource", "action");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE INDEX "CustomerProfile_city_country_idx" ON "CustomerProfile"("city", "country");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProfile_userId_key" ON "ProviderProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProfile_slug_key" ON "ProviderProfile"("slug");

-- CreateIndex
CREATE INDEX "ProviderProfile_verificationStatus_isPubliclyVisible_delete_idx" ON "ProviderProfile"("verificationStatus", "isPubliclyVisible", "deletedAt", "membershipTier", "rating" DESC);

-- CreateIndex
CREATE INDEX "ProviderProfile_latitude_longitude_idx" ON "ProviderProfile"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "ProviderProfile_city_state_country_idx" ON "ProviderProfile"("city", "state", "country");

-- CreateIndex
CREATE INDEX "ProviderProfile_verifiedBy_idx" ON "ProviderProfile"("verifiedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_isActive_displayOrder_idx" ON "Category"("parentId", "isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "Category_isActive_displayOrder_idx" ON "Category"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE INDEX "Service_isActive_displayOrder_idx" ON "Service"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Marketplace_slug_key" ON "Marketplace"("slug");

-- CreateIndex
CREATE INDEX "Marketplace_type_regionCode_idx" ON "Marketplace"("type", "regionCode");

-- CreateIndex
CREATE INDEX "Marketplace_isActive_idx" ON "Marketplace"("isActive");

-- CreateIndex
CREATE INDEX "ProviderService_serviceId_status_idx" ON "ProviderService"("serviceId", "status");

-- CreateIndex
CREATE INDEX "ProviderService_providerId_status_idx" ON "ProviderService"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderService_providerId_serviceId_key" ON "ProviderService"("providerId", "serviceId");

-- CreateIndex
CREATE INDEX "ProviderMarketplace_marketplaceId_isListed_listingPriority_idx" ON "ProviderMarketplace"("marketplaceId", "isListed", "listingPriority" DESC);

-- CreateIndex
CREATE INDEX "ProviderMarketplace_providerId_idx" ON "ProviderMarketplace"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderMarketplace_providerId_marketplaceId_key" ON "ProviderMarketplace"("providerId", "marketplaceId");

-- CreateIndex
CREATE INDEX "ProviderVerificationAuditLog_providerId_createdAt_idx" ON "ProviderVerificationAuditLog"("providerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProviderVerificationAuditLog_changedById_idx" ON "ProviderVerificationAuditLog"("changedById");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMarketplace" ADD CONSTRAINT "ProviderMarketplace_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMarketplace" ADD CONSTRAINT "ProviderMarketplace_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationAuditLog" ADD CONSTRAINT "ProviderVerificationAuditLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationAuditLog" ADD CONSTRAINT "ProviderVerificationAuditLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

