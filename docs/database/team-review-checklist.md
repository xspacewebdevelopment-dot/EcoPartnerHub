# EcoPartnerHub - Database Design Team Review Checklist

> **Document Status**: Active Review Checklist  
> **Prepared For**: Engineering Team (Akshay, Om Prakash, Krishna, Team Leader)  
> **Topic**: Proposed 10-Entity Database Schema, Relational Integrity & Future Entities  

---

## 1. Questions & Coordination with Akshay (User, Role, Permission & Auth)

- [ ] **Single Role vs. Multi-Role Architecture**:
  - The current proposed design assigns exactly one Role per User (`User.roleId -> Role.id`).
  - *Question for Akshay*: Is a single role per user sufficient for the foreseeable roadmap, or can an individual user hold multiple roles simultaneously (e.g., both a `CUSTOMER` and an internal `STAFF` or `AUDITOR`)? If multi-role is needed, we must migrate to a `UserRole` join table.
- [ ] **Authentication Strategy & Credential Storage**:
  - *Question for Akshay*: What authentication system is planned (NextAuth.js, Auth0, Clerk, Firebase Auth, or custom credentials)?
  - If NextAuth.js or OAuth providers are used, should we incorporate standard auth models (`Account`, `Session`, `VerificationToken`) into the core Prisma schema now or keep them isolated?
- [ ] **Password Security & Social Login**:
  - `User.passwordHash` is proposed as nullable (`String?`) to allow Google/SSO logins without dummy passwords. Does this align with your authentication flow?
- [ ] **Granularity of RBAC Permissions**:
  - We have proposed an explicit `RolePermission` join table with `resource` and `action` fields (e.g., `resource: "provider"`, `action: "verify"`).
  - *Question for Akshay*: Does this structure match your intended authorization middleware / CASL / permit checks in Next.js Server Components and Route Handlers?
- [ ] **User Deletion & Data Retention**:
  - Soft deletion is modeled via `User.deletedAt`. Does our authentication lookup need to filter out soft-deleted users at the middleware layer, or should we implement database-level triggers/views?

---

## 2. Questions & Coordination with Om Prakash (Provider Verification & Compliance)

- [ ] **Verification State Lifecycle**:
  - The proposed lifecycle enum is:
    `DRAFT` ➔ `PENDING_REVIEW` ➔ `UNDER_REVIEW` ➔ `ACTION_REQUIRED` ➔ `APPROVED` / `REJECTED` / `SUSPENDED`.
  - *Question for Om Prakash*: Does this accurately reflect your team's operational stages? Are any intermediary steps missing (e.g., `BACKGROUND_CHECK_IN_PROGRESS`, `PROVISIONAL_APPROVAL`)?
- [ ] **Audit Trail & Verification History**:
  - The proposed schema tracks `verifiedAt` (timestamp) and `verifiedBy` (User ID of the reviewer) on `ProviderProfile`.
  - *Question for Om Prakash*: Is this single-point audit sufficient, or does compliance require an append-only `ProviderVerificationLog` table that stores every status change, comment, and timestamp historically?
- [ ] **Document Schema (`ProviderDocument`) Details**:
  - For the future `ProviderDocument` entity:
    - What document categories are mandatory (e.g., Business Registration, Tax Filing, ISO 14001 / ISO 50001, Insurance, Trade Licences)?
    - Do documents require explicit expiration tracking (`validUntil`) and automated expiry alerts?
- [ ] **Rejection & Resubmission Protocols**:
  - When a provider is placed in `ACTION_REQUIRED` or `REJECTED`, can they edit and resubmit their existing profile, or does a new submission instance get generated?
- [ ] **Decoupling from Monetization**:
  - We have codified the rule that paying for a higher membership tier (e.g. `PREMIUM`) never impacts `verificationStatus`. Can you confirm that no automated payment webhook will have permissions to modify verification flags?

---

## 3. Questions & Coordination with Krishna (Customer Profiles, Enquiries, Quotations & Leads)

- [ ] **Customer Profile Scope**:
  - The proposed `CustomerProfile` accommodates both residential individuals and commercial/enterprise clients (with fields like `companyName`, `industry`, `companySize`).
  - *Question for Krishna*: Do we need distinct subtypes (e.g. `CustomerType: RESIDENTIAL | COMMERCIAL`) to tailor discovery and enquiry flows?
- [ ] **Enquiry Dispatch Topology (1:1 Direct vs. 1:N Marketplace Broadcast)**:
  - In our proposed future `Enquiry` model, `providerId` is nullable:
    - If `providerId` is populated ➔ Direct enquiry to a chosen provider.
    - If `providerId` is `null` ➔ Marketplace-wide open broadcast where multiple approved providers can submit quotes.
  - *Question for Krishna*: Does this match your lead distribution and matchmaking requirements?
- [ ] **Quotation Granularity (Single Total vs. Line Items)**:
  - The proposed future `Quotation` model holds `totalAmount`, `taxAmount`, and narrative `scopeOfWork`.
  - *Question for Krishna*: Do we need an itemized `QuotationItem` table (breakdown of labor, equipment, audit fees, permits) for Phase 2, or is a single quote summary sufficient initially?
- [ ] **Customer Contact Privacy & Lead Unlocking**:
  - *Question for Krishna*: Should customer contact details (phone, email) be hidden/masked from providers until the provider formally accepts the enquiry or expends a lead credit?
- [ ] **Lead Event Analytics**:
  - For `LeadEvent`, what specific interactions must be tracked for billing or conversion analytics (`PROFILE_VIEW`, `PHONE_REVEAL`, `ENQUIRY_CLICK`, `MESSAGE_SENT`)?

---

## 4. Unconfirmed Database Decisions

The following architectural decisions are documented for explicit consensus before schema implementation:

### Decision A: Primary Key Generation Strategy (UUID v4 vs. CUID2)
- **Proposed**: Standard PostgreSQL `UUID` (`gen_random_uuid()` / Prisma `@default(uuid())`).
- **Alternative**: CUID2 (`@default(cuid())`), which is URL-friendly and collision-resistant for distributed environments.
- **Trade-off**: Native PostgreSQL UUIDs optimize memory and native indexing in Postgres/Neon, whereas CUID2 strings avoid URL encoding issues in frontend routes.
- **Recommendation**: Native UUIDs for database efficiency, paired with unique human-readable `slug` fields for public URLs.

### Decision B: Explicit Join Tables vs. Implicit Prisma Many-to-Many
- **Proposed**: Explicit join models (`RolePermission`, `ProviderService`, `ProviderMarketplace`).
- **Trade-off**: Explicit join tables allow metadata fields (`assignedAt`, `pricingModel`, `startingPrice`, `isListed`, `listingPriority`) and deterministic foreign key constraints, which implicit tables do not support.
- **Recommendation**: Maintain explicit join tables.

### Decision C: Soft Deletes vs. Status Flags vs. Hard Deletes
- **Proposed**: `deletedAt DateTime?` on `User` and `ProviderProfile`; status flags on transactional records.
- **Trade-off**: Soft deletion prevents foreign key breakage on historical records but requires filtering `where: { deletedAt: null }` in every query.
- **Recommendation**: Use soft delete on `User` and `ProviderProfile`; use status transitions (`ARCHIVED`, `CLOSED`) on services and listings.

### Decision D: Geolocation Search Architecture
- **Proposed**: `latitude` and `longitude` stored as `DECIMAL(10, 7)`.
- **Alternative**: Enabling the PostgreSQL `PostGIS` extension for native geospatial spatial queries (`ST_DWithin`, `ST_Distance`).
- **Trade-off**: Neon supports PostGIS, but it adds indexing and migration complexity. Decimal coordinates allow straightforward bounding-box filtering and Haversine distance calculations in TypeScript or SQL queries without requiring specialized extensions.
- **Recommendation**: Start with Decimal coordinates; evaluate PostGIS when map polygon radius queries become a formal requirement.

---

## 5. Items Requiring Team Leader Approval

- [ ] **1. Sign-off on 10 Core Entities**:
  Approval of the entity list: `User`, `Role`, `Permission`, `CustomerProfile`, `ProviderProfile`, `Category`, `Service`, `Marketplace`, `ProviderService`, `ProviderMarketplace`.
- [ ] **2. Verification Firewall Rule Endorsement**:
  Formal leadership confirmation that under no circumstances can a provider become publicly visible or approved without human compliance verification.
- [ ] **3. Neon PostgreSQL Migration Execution Strategy**:
  Confirm migration command protocol for team branches:
  - Feature branches: `npx prisma migrate dev --name <migration-name>`
  - Staging / Production: `npx prisma migrate deploy`
- [ ] **4. Authorization to Implement `prisma/schema.prisma`**:
  Approval to transition from documentation phase to schema implementation and migration file creation once team questions are resolved.
