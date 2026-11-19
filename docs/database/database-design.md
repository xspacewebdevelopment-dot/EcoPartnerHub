# EcoPartnerHub - Backend Database Design Specification

> **Document Status**: Proposed Architecture / Draft for Team Review  
> **Target Database Engine**: Neon PostgreSQL (Serverless)  
> **ORM**: Prisma ORM (`@prisma/client` ^6.19.3)  
> **Coordination Leads**:  
> - Akshay (User, Role, Permission & Authentication)  
> - Om Prakash (Provider Verification & Compliance)  
> - Krishna (Customer Profiles, Enquiries, Quotations & Leads)  
> - Lead / Architecture (Schema Approval & Migration Governance)

---

## 1. Project Database Overview

EcoPartnerHub is a digital ecosystem connecting verified sustainability service providers (e.g., renewable energy contractors, waste management consultants, carbon footprint auditors, circular economy advisors) with commercial and residential customers across regional and vertical marketplaces.

### 1.1 Architectural Context & Stack
- **Database Engine**: PostgreSQL hosted on **Neon** (serverless architecture with connection pooling enabled).
- **ORM**: Prisma ORM with strict type generation and relational schema modeling.
- **Application Framework**: Next.js (App Router, React 19, TypeScript).
- **Primary Design Objectives**:
  1. **Strict Data Integrity**: Explicit foreign keys, relational constraints, and unified indexing strategies.
  2. **Security & Role-Based Access Control (RBAC)**: Fine-grained permissions mapped to roles, decoupled from profile identities.
  3. **High-Trust Provider Discovery**: Rigorous multi-stage verification firewall ensuring that only compliant, vetted providers are visible to the public.
  4. **Multi-Marketplace Flexibility**: Providers can offer distinct services across multiple geographic or vertical marketplaces with independent configurations.
  5. **Auditing & Traceability**: Standardized `createdAt` and `updatedAt` timestamps on all entities, accompanied by soft-delete markers where historical data retention is critical.

---

## 2. Core Enums

To maintain database consistency and prevent string typo bugs, the following enumerated types are proposed:

### 2.1 `UserStatus`
Represents the account lifecycle state of a platform user.
- `PENDING_VERIFICATION`: Account registered; email or phone verification pending.
- `ACTIVE`: Fully operational user account.
- `SUSPENDED`: Temporarily locked due to security or policy issues.
- `DEACTIVATED`: Voluntarily closed or soft-deleted by user.

### 2.2 `ProviderVerificationStatus`
Defines the strict verification lifecycle for service providers.
- `DRAFT`: Provider registration initiated; profile details or business information incomplete.
- `PENDING_REVIEW`: Submitted by provider; waiting in queue for compliance assessment.
- `UNDER_REVIEW`: Currently being audited by the verification team (Om Prakash).
- `ACTION_REQUIRED`: Compliance documents or credentials rejected or missing; awaiting provider update.
- `APPROVED`: Fully vetted, authorized, and certified for public directory listing.
- `REJECTED`: Application denied due to failed compliance or fraudulent credentials.
- `SUSPENDED`: Previously approved, but halted due to policy breach or expired certifications.

> [!IMPORTANT]
> **Provider Verification Security Rules**:
> 1. A provider **must never** automatically become `APPROVED` upon self-registration.
> 2. Only providers with status `APPROVED` and `isPubliclyVisible = true` can be returned in public discovery/search queries.
> 3. State transitions to `APPROVED`, `REJECTED`, or `SUSPENDED` must be executed through audited workflows coordinated with Om Prakash.
> 4. Subscription upgrades, billing status, or fee payments **do not** bypass or guarantee verification approval.

### 2.3 `MembershipTier`
Commercial tier for providers (strictly decoupled from verification compliance).
- `FREE`: Baseline directory listing capabilities.
- `VERIFIED_STANDARD`: Standard business tier.
- `PREMIUM`: Enhanced listing visibility, advanced lead insights.
- `ENTERPRISE`: Dedicated account manager, multi-branch listings.

### 2.4 `MarketplaceType`
Classification of operating marketplaces.
- `REGIONAL`: Geographic boundaries (e.g., India-National, EU-Central, US-West).
- `INDUSTRY_VERTICAL`: Sector-specific marketplace (e.g., Solar & Wind Energy, Industrial Waste, ESG Auditing).
- `GLOBAL`: Universal cross-border sustainability directory.

### 2.5 `ListingStatus`
Operational state of a provider's service offering.
- `ACTIVE`: Actively accepting leads and customer enquiries.
- `PAUSED`: Temporarily paused by the provider (e.g., at full capacity).
- `DRAFT`: Unpublished service draft.
- `ARCHIVED`: Obsolete or discontinued offering.

### 2.6 `PricingModel`
Structure of service quotation.
- `FIXED`: Fixed package pricing.
- `HOURLY`: Hourly rate.
- `CUSTOM_QUOTE`: Variable quote based on scope.
- `STARTING_AT`: Baseline minimum engagement cost.

---

## 3. Core Database Entities (10 Entities)

Every entity is designed with PostgreSQL-compatible data types, standard UUID v4 primary keys, explicit foreign keys, indexes, and constraints.

---

### Entity 1: `User`
The central identity and authentication table. Represents any human accessing the platform (customer, provider owner, admin, auditor).

| Field Name | PostgreSQL Type | Prisma Type | PK | FK | Nullable | Unique | Default | Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | `String @id @default(uuid())` | ✅ | ❌ | ❌ | ✅ | `gen_random_uuid()` | Unique user identifier |
| `email` | `VARCHAR(255)` | `String` | ❌ | ❌ | ❌ | ✅ | None | Primary login and notification email |
| `passwordHash` | `VARCHAR(255)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Nullable for OAuth/SSO logins |
| `fullName` | `VARCHAR(150)` | `String` | ❌ | ❌ | ❌ | ❌ | None | User's full display name |
| `phone` | `VARCHAR(30)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Contact number with country code |
| `roleId` | `UUID` | `String` | ❌ | ✅ (Role.id) | ❌ | ❌ | None | Assigned role |
| `status` | `UserStatus` | `UserStatus` | ❌ | ❌ | ❌ | ❌ | `'PENDING_VERIFICATION'` | Account status |
| `isEmailVerified` | `BOOLEAN` | `Boolean` | ❌ | ❌ | ❌ | ❌ | `false` | Email confirmation flag |
| `emailVerifiedAt` | `TIMESTAMPTZ` | `DateTime?` | ❌ | ❌ | ✅ | ❌ | None | Timestamp of email verification |
| `lastLoginAt` | `TIMESTAMPTZ` | `DateTime?` | ❌ | ❌ | ✅ | ❌ | None | Last recorded user authentication |
| `createdAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Row creation timestamp |
| `updatedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `@updatedAt` | Auto-updating modification timestamp |
| `deletedAt` | `TIMESTAMPTZ` | `DateTime?` | ❌ | ❌ | ✅ | ❌ | None | Soft-deletion timestamp |

**Indexes & Constraints**:
- `UNIQUE INDEX idx_users_email (email)`
- `INDEX idx_users_role_id (roleId)`
- `INDEX idx_users_status (status)`

---

### Entity 2: `Role`
Defines access tiers and permission containers. One User has exactly one Role; one Role can belong to many Users.

| Field Name | PostgreSQL Type | Prisma Type | PK | FK | Nullable | Unique | Default | Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | `String @id @default(uuid())` | ✅ | ❌ | ❌ | ✅ | `gen_random_uuid()` | Unique role identifier |
| `name` | `VARCHAR(50)` | `String` | ❌ | ❌ | ❌ | ✅ | None | Human-readable role name (e.g., "Administrator") |
| `code` | `VARCHAR(50)` | `String` | ❌ | ❌ | ❌ | ✅ | None | Machine slug (e.g., "ADMIN", "PROVIDER", "CUSTOMER") |
| `description` | `VARCHAR(255)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Detailed description of role duties |
| `isSystem` | `BOOLEAN` | `Boolean` | ❌ | ❌ | ❌ | ❌ | `false` | System roles cannot be deleted via UI |
| `createdAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Creation timestamp |
| `updatedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `@updatedAt` | Modification timestamp |

**Indexes & Constraints**:
- `UNIQUE INDEX idx_roles_name (name)`
- `UNIQUE INDEX idx_roles_code (code)`

---

### Entity 3: `Permission`
Fine-grained authorizations assigned to roles. Role and Permission have a many-to-many relationship through explicit join table `RolePermission`.

| Field Name | PostgreSQL Type | Prisma Type | PK | FK | Nullable | Unique | Default | Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | `String @id @default(uuid())` | ✅ | ❌ | ❌ | ✅ | `gen_random_uuid()` | Unique permission identifier |
| `name` | `VARCHAR(100)` | `String` | ❌ | ❌ | ❌ | ✅ | None | Human-readable name (e.g., "Verify Provider") |
| `code` | `VARCHAR(100)` | `String` | ❌ | ❌ | ❌ | ✅ | None | Granular code (e.g., "provider:verify", "service:create") |
| `resource` | `VARCHAR(50)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Target domain entity (e.g., "provider", "enquiry") |
| `action` | `VARCHAR(50)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Permitted action (e.g., "read", "write", "approve") |
| `description` | `VARCHAR(255)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Explanation of privilege |
| `createdAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Creation timestamp |
| `updatedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `@updatedAt` | Modification timestamp |

**Join Table**: `RolePermission`
- `roleId` (`UUID`, FK -> `Role.id`, `ON DELETE CASCADE`)
- `permissionId` (`UUID`, FK -> `Permission.id`, `ON DELETE CASCADE`)
- `assignedAt` (`TIMESTAMPTZ`, default: `now()`)
- `PRIMARY KEY (roleId, permissionId)`

**Indexes & Constraints**:
- `UNIQUE INDEX idx_permissions_code (code)`
- `INDEX idx_permissions_resource_action (resource, action)`

---

### Entity 4: `CustomerProfile`
Contains business or personal profile information for clients seeking sustainability services. One User has at most one CustomerProfile.

| Field Name | PostgreSQL Type | Prisma Type | PK | FK | Nullable | Unique | Default | Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | `String @id @default(uuid())` | ✅ | ❌ | ❌ | ✅ | `gen_random_uuid()` | Unique customer profile identifier |
| `userId` | `UUID` | `String` | ❌ | ✅ (User.id) | ❌ | ✅ | None | Parent user account reference (1:1) |
| `companyName` | `VARCHAR(150)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Enterprise or organization name |
| `contactPerson`| `VARCHAR(100)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Primary liaison name |
| `phone` | `VARCHAR(30)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Business contact telephone |
| `industry` | `VARCHAR(100)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Sector (e.g., Manufacturing, Retail) |
| `companySize` | `VARCHAR(50)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Headcount bracket (e.g., "1-50", "500+") |
| `website` | `VARCHAR(255)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Corporate website URL |
| `addressLine1` | `VARCHAR(255)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Street address |
| `city` | `VARCHAR(100)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | City/municipality |
| `state` | `VARCHAR(100)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | State, province, or region |
| `postalCode` | `VARCHAR(20)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Postal/ZIP code |
| `country` | `VARCHAR(100)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Country name or ISO code |
| `preferences` | `JSONB` | `Json?` | ❌ | ❌ | ✅ | ❌ | `'{}'` | Notification and sustainability preference tags |
| `createdAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Creation timestamp |
| `updatedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `@updatedAt` | Modification timestamp |

**Indexes & Constraints**:
- `UNIQUE INDEX idx_customer_profiles_user_id (userId)`
- `INDEX idx_customer_profiles_city_country (city, country)`

---

### Entity 5: `ProviderProfile`
Contains comprehensive commercial, operational, and verification data for service providers. One User has at most one ProviderProfile.

| Field Name | PostgreSQL Type | Prisma Type | PK | FK | Nullable | Unique | Default | Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | `String @id @default(uuid())` | ✅ | ❌ | ❌ | ✅ | `gen_random_uuid()` | Unique provider profile identifier |
| `userId` | `UUID` | `String` | ❌ | ✅ (User.id) | ❌ | ✅ | None | Parent user account reference (1:1) |
| `businessName` | `VARCHAR(200)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Commercial trading name |
| `slug` | `VARCHAR(220)` | `String` | ❌ | ❌ | ❌ | ✅ | None | URL-safe slug for provider public landing page |
| `legalEntityName` | `VARCHAR(255)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Registered legal company name |
| `registrationNumber` | `VARCHAR(100)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Corporate registration / CIN / LLC number |
| `taxId` | `VARCHAR(100)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | GSTIN, VAT, or federal tax identifier |
| `description` | `TEXT` | `String` | ❌ | ❌ | ❌ | ❌ | None | Comprehensive business profile and capabilities |
| `tagline` | `VARCHAR(255)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Short marketing proposition |
| `logoUrl` | `VARCHAR(512)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Hosted brand logo URL |
| `bannerUrl` | `VARCHAR(512)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Hosted profile header banner URL |
| `website` | `VARCHAR(255)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Official website URL |
| `contactEmail` | `VARCHAR(255)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Public business enquiry email |
| `contactPhone` | `VARCHAR(30)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Public business telephone |
| `addressLine1` | `VARCHAR(255)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Operating premises address |
| `city` | `VARCHAR(100)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Operating base city |
| `state` | `VARCHAR(100)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Operating base state/region |
| `postalCode` | `VARCHAR(20)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Postal code |
| `country` | `VARCHAR(100)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Operating base country |
| `latitude` | `DECIMAL(10,7)`| `Decimal?` | ❌ | ❌ | ✅ | ❌ | None | Coordinate for geo-distance search |
| `longitude` | `DECIMAL(10,7)`| `Decimal?` | ❌ | ❌ | ✅ | ❌ | None | Coordinate for geo-distance search |
| `verificationStatus` | `ProviderVerificationStatus` | `ProviderVerificationStatus` | ❌ | ❌ | ❌ | ❌ | `'DRAFT'` | Audit status (Om Prakash's team) |
| `verifiedAt` | `TIMESTAMPTZ` | `DateTime?` | ❌ | ❌ | ✅ | ❌ | None | Timestamp of verification approval |
| `verifiedBy` | `UUID` | `String?` | ❌ | ✅ (User.id) | ✅ | ❌ | None | Internal auditor user who approved |
| `rejectionReason`| `TEXT` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Explanation provided if rejected/flagged |
| `isPubliclyVisible` | `BOOLEAN` | `Boolean` | ❌ | ❌ | ❌ | ❌ | `false` | True ONLY if verified & approved |
| `rating` | `DECIMAL(3,2)` | `Decimal` | ❌ | ❌ | ❌ | ❌ | `0.00` | Aggregate rating score (0.00 - 5.00) |
| `reviewCount` | `INTEGER` | `Int` | ❌ | ❌ | ❌ | ❌ | `0` | Total verified customer reviews |
| `membershipTier`| `MembershipTier`| `MembershipTier`| ❌ | ❌ | ❌ | ❌ | `'FREE'` | Monetization tier (decoupled from review) |
| `createdAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Creation timestamp |
| `updatedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `@updatedAt` | Modification timestamp |
| `deletedAt` | `TIMESTAMPTZ` | `DateTime?` | ❌ | ❌ | ✅ | ❌ | None | Soft-deletion timestamp |

**Indexes & Constraints**:
- `UNIQUE INDEX idx_provider_profiles_user_id (userId)`
- `UNIQUE INDEX idx_provider_profiles_slug (slug)`
- `INDEX idx_provider_profiles_discovery (verificationStatus, isPubliclyVisible)`
- `INDEX idx_provider_profiles_geo (city, state, country)`
- `INDEX idx_provider_profiles_tier (membershipTier)`

---

### Entity 6: `Category`
Hierarchical taxonomy for classifying sustainability services. Supports parent-child subcategories.

| Field Name | PostgreSQL Type | Prisma Type | PK | FK | Nullable | Unique | Default | Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | `String @id @default(uuid())` | ✅ | ❌ | ❌ | ✅ | `gen_random_uuid()` | Unique category identifier |
| `name` | `VARCHAR(100)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Category title (e.g., "Solar Energy", "Rooftop Solar") |
| `slug` | `VARCHAR(120)` | `String` | ❌ | ❌ | ❌ | ✅ | None | SEO-friendly URL slug |
| `description` | `TEXT` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Detailed scope of the category |
| `iconUrl` | `VARCHAR(512)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Hosted icon graphic asset |
| `parentId` | `UUID` | `String?` | ❌ | ✅ (Category.id) | ✅ | ❌ | None | Self-referencing FK for hierarchical taxonomy |
| `displayOrder` | `INTEGER` | `Int` | ❌ | ❌ | ❌ | ❌ | `0` | Sort priority in UI navigation |
| `isActive` | `BOOLEAN` | `Boolean` | ❌ | ❌ | ❌ | ❌ | `true` | Visibility toggle |
| `createdAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Creation timestamp |
| `updatedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `@updatedAt` | Modification timestamp |

**Indexes & Constraints**:
- `UNIQUE INDEX idx_categories_slug (slug)`
- `INDEX idx_categories_parent_id (parentId)`
- `INDEX idx_categories_is_active_order (isActive, displayOrder)`

---

### Entity 7: `Service`
Standardized service catalog offerings that belong to a single Category. One Category contains multiple Services.

| Field Name | PostgreSQL Type | Prisma Type | PK | FK | Nullable | Unique | Default | Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | `String @id @default(uuid())` | ✅ | ❌ | ❌ | ✅ | `gen_random_uuid()` | Unique service identifier |
| `categoryId` | `UUID` | `String` | ❌ | ✅ (Category.id) | ❌ | ❌ | None | Parent category link |
| `name` | `VARCHAR(150)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Service name (e.g., "Commercial Solar Installation") |
| `slug` | `VARCHAR(170)` | `String` | ❌ | ❌ | ❌ | ✅ | None | SEO URL identifier |
| `shortDescription`| `VARCHAR(255)`| `String?` | ❌ | ❌ | ✅ | ❌ | None | Summary blurb for search cards |
| `description` | `TEXT` | `String` | ❌ | ❌ | ❌ | ❌ | None | Comprehensive definition of service scope |
| `iconUrl` | `VARCHAR(512)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Vector or PNG icon asset |
| `isActive` | `BOOLEAN` | `Boolean` | ❌ | ❌ | ❌ | ❌ | `true` | Catalog availability status |
| `displayOrder` | `INTEGER` | `Int` | ❌ | ❌ | ❌ | ❌ | `0` | Ordering weight |
| `metadata` | `JSONB` | `Json?` | ❌ | ❌ | ✅ | ❌ | `'{}'` | Dynamic form fields / attribute requirements |
| `createdAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Creation timestamp |
| `updatedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `@updatedAt` | Modification timestamp |

**Indexes & Constraints**:
- `UNIQUE INDEX idx_services_slug (slug)`
- `INDEX idx_services_category_id (categoryId)`
- `INDEX idx_services_is_active (isActive)`

---

### Entity 8: `Marketplace`
Represents an operational exchange, territory, or sector portal within EcoPartnerHub.

| Field Name | PostgreSQL Type | Prisma Type | PK | FK | Nullable | Unique | Default | Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | `String @id @default(uuid())` | ✅ | ❌ | ❌ | ✅ | `gen_random_uuid()` | Unique marketplace identifier |
| `name` | `VARCHAR(150)` | `String` | ❌ | ❌ | ❌ | ❌ | None | Marketplace name (e.g., "India Clean Energy Exchange") |
| `slug` | `VARCHAR(170)` | `String` | ❌ | ❌ | ❌ | ✅ | None | URL slug for marketplace routing |
| `description` | `TEXT` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Mission and regional/vertical coverage |
| `type` | `MarketplaceType`| `MarketplaceType`| ❌ | ❌ | ❌ | ❌ | `'REGIONAL'` | Classification (REGIONAL / VERTICAL / GLOBAL) |
| `regionCode` | `VARCHAR(10)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | ISO code or territory (e.g., "IN", "EU", "APAC") |
| `currency` | `VARCHAR(3)` | `String` | ❌ | ❌ | ❌ | ❌ | `'INR'` | Operating ISO-4217 currency code |
| `isActive` | `BOOLEAN` | `Boolean` | ❌ | ❌ | ❌ | ❌ | `true` | Portal status |
| `config` | `JSONB` | `Json?` | ❌ | ❌ | ✅ | ❌ | `'{}'` | Territory settings, banners, terms links |
| `createdAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Creation timestamp |
| `updatedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `@updatedAt` | Modification timestamp |

**Indexes & Constraints**:
- `UNIQUE INDEX idx_marketplaces_slug (slug)`
- `INDEX idx_marketplaces_type_region (type, regionCode)`
- `INDEX idx_marketplaces_is_active (isActive)`

---

### Entity 9: `ProviderService` (Join Entity: ProviderProfile ↔ Service)
Manages the many-to-many relationship between ProviderProfile and Service, containing provider-specific offerings, pricing models, and experience.

| Field Name | PostgreSQL Type | Prisma Type | PK | FK | Nullable | Unique | Default | Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | `String @id @default(uuid())` | ✅ | ❌ | ❌ | ✅ | `gen_random_uuid()` | Unique listing identifier |
| `providerId` | `UUID` | `String` | ❌ | ✅ (ProviderProfile.id) | ❌ | ❌ | None | Provider reference (`ON DELETE CASCADE`) |
| `serviceId` | `UUID` | `String` | ❌ | ✅ (Service.id) | ❌ | ❌ | None | Service catalog reference (`ON DELETE RESTRICT`) |
| `customTitle` | `VARCHAR(200)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Provider's customized headline for this service |
| `customDescription`| `TEXT` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Provider's bespoke service narrative |
| `pricingModel` | `PricingModel` | `PricingModel` | ❌ | ❌ | ❌ | ❌ | `'CUSTOM_QUOTE'`| Pricing structure |
| `startingPrice`| `DECIMAL(12,2)`| `Decimal?` | ❌ | ❌ | ✅ | ❌ | None | Optional base price indication |
| `currency` | `VARCHAR(3)` | `String?` | ❌ | ❌ | ✅ | ❌ | None | Currency code matching marketplace |
| `experienceYears`| `INTEGER` | `Int?` | ❌ | ❌ | ✅ | ❌ | None | Years of track record in this service |
| `status` | `ListingStatus` | `ListingStatus`| ❌ | ❌ | ❌ | ❌ | `'ACTIVE'` | Offering visibility status |
| `createdAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Creation timestamp |
| `updatedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `@updatedAt` | Modification timestamp |

**Indexes & Constraints**:
- `UNIQUE INDEX idx_provider_service_unique (providerId, serviceId)`
- `INDEX idx_provider_service_provider_id (providerId)`
- `INDEX idx_provider_service_service_id (serviceId)`
- `INDEX idx_provider_service_status (status)`

---

### Entity 10: `ProviderMarketplace` (Join Entity: ProviderProfile ↔ Marketplace)
Manages the many-to-many relationship between ProviderProfile and Marketplace, enabling providers to register and operate across distinct regional or vertical hubs.

| Field Name | PostgreSQL Type | Prisma Type | PK | FK | Nullable | Unique | Default | Description |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `id` | `UUID` | `String @id @default(uuid())` | ✅ | ❌ | ❌ | ✅ | `gen_random_uuid()` | Unique join identifier |
| `providerId` | `UUID` | `String` | ❌ | ✅ (ProviderProfile.id) | ❌ | ❌ | None | Provider reference (`ON DELETE CASCADE`) |
| `marketplaceId`| `UUID` | `String` | ❌ | ✅ (Marketplace.id) | ❌ | ❌ | None | Marketplace reference (`ON DELETE RESTRICT`) |
| `isListed` | `BOOLEAN` | `Boolean` | ❌ | ❌ | ❌ | ❌ | `true` | Provider active participation flag |
| `listingPriority`| `INTEGER` | `Int` | ❌ | ❌ | ❌ | ❌ | `0` | Weight for marketplace featured sorting |
| `joinedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Timestamp provider joined marketplace |
| `createdAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `now()` | Creation timestamp |
| `updatedAt` | `TIMESTAMPTZ` | `DateTime` | ❌ | ❌ | ❌ | ❌ | `@updatedAt` | Modification timestamp |

**Indexes & Constraints**:
- `UNIQUE INDEX idx_provider_marketplace_unique (providerId, marketplaceId)`
- `INDEX idx_provider_marketplace_provider_id (providerId)`
- `INDEX idx_provider_marketplace_marketplace_id (marketplaceId)`
- `INDEX idx_provider_marketplace_priority (isListed, listingPriority)`

---

## 4. Relationship Summary & Cardinalities

| Entity A | Cardinality | Entity B | Relationship Type | Mechanics & Integrity Rules |
| :--- | :---: | :--- | :--- | :--- |
| **Role** | `1` : `N` | **User** | One-to-Many | One User belongs to exactly one Role (`User.roleId` → `Role.id`). `onDelete: Restrict` prevents accidental deletion of active roles. |
| **User** | `1` : `0..1` | **CustomerProfile** | One-to-One (Optional) | `CustomerProfile.userId` is Unique FK to `User.id`. `onDelete: Cascade`. |
| **User** | `1` : `0..1` | **ProviderProfile** | One-to-One (Optional) | `ProviderProfile.userId` is Unique FK to `User.id`. `onDelete: Cascade`. |
| **Role** | `M` : `N` | **Permission** | Many-to-Many | Explicit join table `RolePermission` with composite PK `(roleId, permissionId)`. `onDelete: Cascade` on both edges. |
| **Category** | `1` : `N` | **Category** | Self-referential Hierarchical | `Category.parentId` references `Category.id`. `onDelete: Restrict` prevents orphaned child categories. |
| **Category** | `1` : `N` | **Service** | One-to-Many | `Service.categoryId` references `Category.id`. `onDelete: Restrict` prevents deleting a category that has active services. |
| **ProviderProfile** | `M` : `N` | **Service** | Many-to-Many | Resolved through explicit join entity `ProviderService` with composite unique `(providerId, serviceId)`. |
| **ProviderProfile** | `M` : `N` | **Marketplace** | Many-to-Many | Resolved through explicit join entity `ProviderMarketplace` with composite unique `(providerId, marketplaceId)`. |

---

## 5. Provider Discovery & Search Rules

As the owner of **Provider discovery and search APIs**, the following architectural rules must be codified at the database and query level:

1. **The Public Discovery Predicate**:
   Every public search, directory query, or marketplace catalog endpoint must strictly enforce the following WHERE clause filter:
   ```sql
   WHERE p."verificationStatus" = 'APPROVED'
     AND p."isPubliclyVisible" = true
     AND p."deletedAt" IS NULL
     AND pm."isListed" = true
   ```
2. **Strict Verification Firewall**:
   - Provider self-registration sets `verificationStatus = 'DRAFT'`.
   - Completion of profile details transitions status to `PENDING_REVIEW`.
   - **Only** a designated auditor/admin user (coordinating with Om Prakash) can transition status to `APPROVED`.
   - In accordance with compliance standards, paying a membership subscription (e.g., upgrading from `FREE` to `PREMIUM`) updates `membershipTier` **only**, leaving `verificationStatus` untouched.
3. **Compound Indexes for High-Speed Discovery**:
   - `CREATE INDEX idx_provider_search ON "ProviderProfile" ("verificationStatus", "isPubliclyVisible", "rating" DESC);`
   - `CREATE INDEX idx_provider_geo ON "ProviderProfile" ("country", "state", "city");`

---

## 6. Future & Coordination-Dependent Entities (TASK 3)

The following entities have been identified as essential for subsequent development phases. They are clearly categorized below as **future or coordination-dependent** and must **not** be applied to the current migration cycle until formal approval is granted:

### 6.1 `ProviderDocument`
- **Owner / Coordinator**: Om Prakash (Verification & Compliance).
- **Purpose**: Stores compliance records, legal certifications, business licenses, ISO certificates, and insurance documents uploaded by providers during verification.
- **Proposed Fields**:
  - `id`: UUID (PK)
  - `providerId`: UUID (FK -> `ProviderProfile.id`, `onDelete: Cascade`)
  - `documentType`: Enum (`BUSINESS_LICENSE`, `TAX_CERTIFICATE`, `ISO_CERTIFICATION`, `INSURANCE_POLICY`, `OTHER`)
  - `documentNumber`: String?
  - `fileUrl`: String (secure object storage URL, e.g., AWS S3 / Cloudflare R2 / Google Cloud Storage)
  - `fileSize`: Int
  - `mimeType`: String
  - `verificationStatus`: Enum (`PENDING`, `VERIFIED`, `REJECTED`, `EXPIRED`)
  - `verifiedAt`: DateTime?
  - `verifiedBy`: UUID? (FK -> `User.id`)
  - `rejectionNotes`: String?
  - `validUntil`: DateTime? (for time-sensitive certifications)
  - `createdAt`, `updatedAt`

### 6.2 `Enquiry`
- **Owner / Coordinator**: Krishna (Customer & Lead Pipelines).
- **Purpose**: Captures customer requests for sustainability services, either directed to a specific provider or broadcast across a marketplace.
- **Proposed Fields**:
  - `id`: UUID (PK)
  - `customerId`: UUID (FK -> `CustomerProfile.id`, `onDelete: Restrict`)
  - `serviceId`: UUID (FK -> `Service.id`, `onDelete: Restrict`)
  - `marketplaceId`: UUID (FK -> `Marketplace.id`, `onDelete: Restrict`)
  - `providerId`: UUID? (FK -> `ProviderProfile.id`, nullable: null indicates an open marketplace broadcast enquiry)
  - `title`: String
  - `description`: Text (detailed project requirements)
  - `status`: Enum (`OPEN`, `IN_REVIEW`, `QUOTED`, `ACCEPTED`, `CLOSED`, `CANCELLED`)
  - `budgetEstimate`: Decimal?
  - `targetCompletionDate`: DateTime?
  - `attachments`: Json? (URLs of blueprints, site assessments, bills)
  - `createdAt`, `updatedAt`

### 6.3 `ProviderResponse`
- **Owner / Coordinator**: Krishna & Om Prakash.
- **Purpose**: Captures the provider's acknowledgement, acceptance, or declination of a direct or marketplace broadcast enquiry.
- **Proposed Fields**:
  - `id`: UUID (PK)
  - `enquiryId`: UUID (FK -> `Enquiry.id`, `onDelete: Cascade`)
  - `providerId`: UUID (FK -> `ProviderProfile.id`, `onDelete: Cascade`)
  - `status`: Enum (`VIEWED`, `ACCEPTED`, `DECLINED`, `RESPONDED`)
  - `declineReason`: String?
  - `respondedAt`: DateTime (default: `now()`)
  - `createdAt`, `updatedAt`
  - Unique Constraint: `(enquiryId, providerId)`

### 6.4 `Quotation`
- **Owner / Coordinator**: Krishna.
- **Purpose**: Formal commercial proposals issued by an approved provider to a customer in response to an enquiry.
- **Proposed Fields**:
  - `id`: UUID (PK)
  - `enquiryId`: UUID (FK -> `Enquiry.id`, `onDelete: Restrict`)
  - `providerId`: UUID (FK -> `ProviderProfile.id`, `onDelete: Restrict`)
  - `quoteNumber`: String (Unique business reference, e.g., `QT-2026-0042`)
  - `totalAmount`: Decimal(14,2)
  - `taxAmount`: Decimal(14,2)
  - `currency`: String (default: `INR`)
  - `scopeOfWork`: Text
  - `termsAndConditions`: Text?
  - `status`: Enum (`DRAFT`, `SUBMITTED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `SUPERSEDED`)
  - `validUntil`: DateTime
  - `acceptedAt`: DateTime?
  - `rejectionFeedback`: String?
  - `createdAt`, `updatedAt`

### 6.5 `LeadEvent`
- **Owner / Coordinator**: Krishna & Lead Architect.
- **Purpose**: Real-time audit log and analytics tracking customer engagements, search impressions, telephone reveal clicks, and quotation requests for billing and performance reporting.
- **Proposed Fields**:
  - `id`: UUID (PK)
  - `providerId`: UUID (FK -> `ProviderProfile.id`, `onDelete: Cascade`)
  - `customerId`: UUID? (FK -> `CustomerProfile.id`, nullable for anonymous guest visits)
  - `eventType`: Enum (`PROFILE_VIEW`, `CONTACT_CLICK`, `ENQUIRY_SUBMITTED`, `QUOTE_ACCEPTED`)
  - `marketplaceId`: UUID? (FK -> `Marketplace.id`)
  - `serviceId`: UUID? (FK -> `Service.id`)
  - `metadata`: Json? (e.g., referrer, user agent, search keywords)
  - `ipAddress`: String?
  - `timestamp`: DateTime (default: `now()`)

---

## 7. Draft Prisma Schema (For Review & Coordination Only)

> [!CAUTION]
> **DO NOT APPLY YET**: This schema block is provided purely for peer review. In compliance with project governance, `prisma/schema.prisma` will only be modified after Akshay, Om Prakash, Krishna, and the Team Leader formally sign off.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -------------------------------------------------------------
// ENUMS
// -------------------------------------------------------------

enum UserStatus {
  PENDING_VERIFICATION
  ACTIVE
  SUSPENDED
  DEACTIVATED
}

enum ProviderVerificationStatus {
  DRAFT
  PENDING_REVIEW
  UNDER_REVIEW
  ACTION_REQUIRED
  APPROVED
  REJECTED
  SUSPENDED
}

enum MembershipTier {
  FREE
  VERIFIED_STANDARD
  PREMIUM
  ENTERPRISE
}

enum MarketplaceType {
  REGIONAL
  INDUSTRY_VERTICAL
  GLOBAL
}

enum ListingStatus {
  ACTIVE
  PAUSED
  DRAFT
  ARCHIVED
}

enum PricingModel {
  FIXED
  HOURLY
  CUSTOM_QUOTE
  STARTING_AT
}

// -------------------------------------------------------------
// 1. USER & ACCESS CONTROL (Coordination: Akshay)
// -------------------------------------------------------------

model User {
  id              String      @id @default(uuid())
  email           String      @unique
  passwordHash    String?
  fullName        String
  phone           String?
  roleId          String
  status          UserStatus  @default(PENDING_VERIFICATION)
  isEmailVerified Boolean     @default(false)
  emailVerifiedAt DateTime?
  lastLoginAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?

  // Relations
  role            Role             @relation(fields: [roleId], references: [id], onDelete: Restrict)
  customerProfile CustomerProfile?
  providerProfile ProviderProfile?
  auditedProfiles ProviderProfile[] @relation("AuditorRelation")

  @@index([roleId])
  @@index([status])
}

model Role {
  id          String           @id @default(uuid())
  name        String           @unique
  code        String           @unique
  description String?
  isSystem    Boolean          @default(false)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  // Relations
  users       User[]
  permissions RolePermission[]
}

model Permission {
  id          String           @id @default(uuid())
  name        String           @unique
  code        String           @unique
  resource    String
  action      String
  description String?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  // Relations
  roles       RolePermission[]

  @@index([resource, action])
}

model RolePermission {
  roleId       String
  permissionId String
  assignedAt   DateTime   @default(now())

  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

// -------------------------------------------------------------
// 2. CUSTOMER & PROVIDER PROFILES
// -------------------------------------------------------------

model CustomerProfile {
  id            String   @id @default(uuid())
  userId        String   @unique
  companyName   String?
  contactPerson String?
  phone         String?
  industry      String?
  companySize   String?
  website       String?
  addressLine1  String?
  city          String?
  state         String?
  postalCode    String?
  country       String?
  preferences   Json?    @default("{}")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([city, country])
}

model ProviderProfile {
  id                 String                     @id @default(uuid())
  userId             String                     @unique
  businessName       String
  slug               String                     @unique
  legalEntityName    String?
  registrationNumber String?
  taxId              String?
  description        String
  tagline            String?
  logoUrl            String?
  bannerUrl          String?
  website            String?
  contactEmail       String
  contactPhone       String
  addressLine1       String?
  city               String
  state              String
  postalCode         String
  country            String
  latitude           Decimal?                   @db.Decimal(10, 7)
  longitude          Decimal?                   @db.Decimal(10, 7)
  verificationStatus ProviderVerificationStatus @default(DRAFT)
  verifiedAt         DateTime?
  verifiedBy         String?
  rejectionReason    String?
  isPubliclyVisible  Boolean                    @default(false)
  rating             Decimal                    @default(0.00) @db.Decimal(3, 2)
  reviewCount        Int                        @default(0)
  membershipTier     MembershipTier             @default(FREE)
  createdAt          DateTime                   @default(now())
  updatedAt          DateTime                   @updatedAt
  deletedAt          DateTime?

  // Relations
  user               User                       @relation(fields: [userId], references: [id], onDelete: Cascade)
  auditor            User?                      @relation("AuditorRelation", fields: [verifiedBy], references: [id], onDelete: SetNull)
  services           ProviderService[]
  marketplaces       ProviderMarketplace[]

  @@index([verificationStatus, isPubliclyVisible])
  @@index([city, state, country])
}

// -------------------------------------------------------------
// 3. TAXONOMY: CATEGORIES & SERVICES
// -------------------------------------------------------------

model Category {
  id           String     @id @default(uuid())
  name         String
  slug         String     @unique
  description  String?
  iconUrl      String?
  parentId     String?
  displayOrder Int        @default(0)
  isActive     Boolean    @default(true)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  // Relations
  parent       Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children     Category[] @relation("CategoryHierarchy")
  services     Service[]

  @@index([parentId])
  @@index([isActive, displayOrder])
}

model Service {
  id               String            @id @default(uuid())
  categoryId       String
  name             String
  slug             String            @unique
  shortDescription String?
  description      String
  iconUrl          String?
  isActive         Boolean           @default(true)
  displayOrder     Int               @default(0)
  metadata         Json?             @default("{}")
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  // Relations
  category         Category          @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  providers        ProviderService[]

  @@index([categoryId])
  @@index([isActive])
}

// -------------------------------------------------------------
// 4. MARKETPLACE & PARTICIPATION
// -------------------------------------------------------------

model Marketplace {
  id          String                @id @default(uuid())
  name        String
  slug        String                @unique
  description String?
  type        MarketplaceType       @default(REGIONAL)
  regionCode  String?
  currency    String                @default("INR")
  isActive    Boolean               @default(true)
  config      Json?                 @default("{}")
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  // Relations
  providers   ProviderMarketplace[]

  @@index([type, regionCode])
  @@index([isActive])
}

model ProviderService {
  id                String       @id @default(uuid())
  providerId        String
  serviceId         String
  customTitle       String?
  customDescription String?
  pricingModel      PricingModel @default(CUSTOM_QUOTE)
  startingPrice     Decimal?     @db.Decimal(12, 2)
  currency          String?
  experienceYears   Int?
  status            ListingStatus @default(ACTIVE)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  // Relations
  provider          ProviderProfile @relation(fields: [providerId], references: [id], onDelete: Cascade)
  service           Service         @relation(fields: [serviceId], references: [id], onDelete: Restrict)

  @@unique([providerId, serviceId])
  @@index([providerId])
  @@index([serviceId])
  @@index([status])
}

model ProviderMarketplace {
  id              String          @id @default(uuid())
  providerId      String
  marketplaceId   String
  isListed        Boolean         @default(true)
  listingPriority Int             @default(0)
  joinedAt        DateTime        @default(now())
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  provider        ProviderProfile @relation(fields: [providerId], references: [id], onDelete: Cascade)
  marketplace     Marketplace     @relation(fields: [marketplaceId], references: [id], onDelete: Restrict)

  @@unique([providerId, marketplaceId])
  @@index([providerId])
  @@index([marketplaceId])
  @@index([isListed, listingPriority])
}
```

---

## 8. Summary of Team Coordination Responsibilities

1. **Akshay (User, Role, Permission & Authentication)**:
   - Validate whether single-role (`roleId` on `User`) is sufficient or if multi-role support is needed.
   - Confirm authentication mechanism (Credentials hash vs NextAuth / Auth0 / Clerk session tokens).
   - Review initial seeded Roles (`ADMIN`, `STAFF`, `PROVIDER`, `CUSTOMER`) and Permission scopes.

2. **Om Prakash (Provider Verification & Compliance)**:
   - Review `ProviderVerificationStatus` states and approval transition criteria.
   - Confirm requirements for `verifiedBy` auditor tracking and audit trails.
   - Validate `ProviderDocument` future schema and required document types.

3. **Krishna (Customer Profiles, Enquiries, Quotations & Leads)**:
   - Validate fields in `CustomerProfile`.
   - Review proposed future entities `Enquiry`, `ProviderResponse`, `Quotation`, and `LeadEvent`.
   - Confirm enquiry broadcast models (1-to-1 direct vs 1-to-N marketplace open broadcast).

4. **Team Leader / Repository Owner**:
   - Final approval on proposed database design before updating `prisma/schema.prisma`.
   - Authorization to execute migration on Neon PostgreSQL.
