# EcoPartnerHub - Provider Management API Architecture & Implementation Plan

> **Document Status**: Proposed API Specification / Architectural Blueprint  
> **Target Framework**: Next.js 16 (App Router, Node.js runtime, TypeScript)  
> **ORM & Database**: Prisma ORM (`@prisma/client` ^6.19.3) / Neon PostgreSQL (Serverless)  
> **Domain Responsibility**: Provider Management, Services Catalog, Marketplaces & Provider Discovery  
> **Author / Lead**: Tathagata Mahapatra (`feature/tathagata-provider-management`)  
> **Reference Documents**: [Database Design Specification](file:///home/tathagata-mahapatra/EcoPartnerHub/docs/database/database-design.md) | [ER Diagram](file:///home/tathagata-mahapatra/EcoPartnerHub/docs/database/er-diagram.md) | [Team Review Checklist](file:///home/tathagata-mahapatra/EcoPartnerHub/docs/database/team-review-checklist.md)

---

## Table of Contents
1. [Analysis of Existing Health Check Route (`src/app/api/health/db/route.ts`)](#1-analysis-of-existing-health-check-route)
2. [Proposed API Folder Structure](#2-proposed-api-folder-structure)
3. [Endpoint Catalog: Methods, Routes & Responsibilities](#3-endpoint-catalog-methods-routes--responsibilities)
4. [Request Parameters, Request Bodies & JSON Responses](#4-request-parameters-request-bodies--json-responses)
5. [Authentication & Authorization Matrix](#5-authentication--authorization-matrix)
6. [Prisma ORM Integration Patterns](#6-prisma-orm-integration-patterns)
7. [Database Schema Dependencies & Coordination Roadmap](#7-database-schema-dependencies--coordination-roadmap)

---

## 1. Analysis of Existing Health Check Route

The existing database health check route is implemented in [`src/app/api/health/db/route.ts`](file:///home/tathagata-mahapatra/EcoPartnerHub/src/app/api/health/db/route.ts). Below is an in-depth dissection of how it works and the architectural standards it establishes for all subsequent API route handlers.

### 1.1 Code Dissection

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startTime = Date.now();
    const result = await prisma.$queryRaw<Array<{ result: number }>>`SELECT 1 as result`;
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      database: "Neon PostgreSQL",
      connected: true,
      queryResult: result,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Unknown database error";
    // Sanitize error message to avoid exposing database credentials
    const sanitizedMessage = rawMessage.replace(
      /(postgres(?:ql)?:\/\/)[^@]+@/gi,
      "$1***:***@"
    );

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "Neon PostgreSQL",
        connected: false,
        error: sanitizedMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
```

### 1.2 Key Mechanics & Operational Concepts

1. **Route Segment Configuration (`export const dynamic = "force-dynamic"`):**
   - By default, Next.js App Router aggressively caches GET route handlers at build time or runtime if they do not read request headers or query strings.
   - For an operational health check, static caching would produce false positives (e.g., returning a stale `healthy` status even when the database is unreachable).
   - `force-dynamic` ensures every incoming HTTP GET request executes freshly against the live Neon PostgreSQL database.

2. **Singleton Prisma Client Connection (`@/lib/prisma`):**
   - The route imports `prisma` from [`src/lib/prisma.ts`](file:///home/tathagata-mahapatra/EcoPartnerHub/src/lib/prisma.ts).
   - That singleton module attaches `PrismaClient` to `globalThis` in non-production environments to avoid exhausting the Neon PostgreSQL connection pool during Next.js Hot Module Replacement (HMR).

3. **Low-Overhead Diagnostic Query (`prisma.$queryRaw`):**
   - Executes `SELECT 1 as result` via tagged template literal `$queryRaw`.
   - This validates network reachability, TLS handshake, authentication with Neon, and query execution without depending on any specific application table.
   - It records elapsed execution time (`Date.now() - startTime`) to provide real-time connection latency metrics (`latencyMs`).

4. **Security Hardening (Credential Sanitization):**
   - If the Neon connection fails (e.g., connection timeout, DNS failure, SSL renegotiation), Prisma driver exceptions often embed the complete connection string, including passwords.
   - The route applies a regular expression `/(postgres(?:ql)?:\/\/)[^@]+@/gi` to mask credentials (`postgres://***:***@...`) before emitting the error response.
   - This prevents credential leakage in client-facing JSON responses and external monitoring logs.

5. **Standardized Response Envelopes:**
   - Both success and failure responses return a uniform schema with HTTP status codes (`200 OK` for healthy, `500 Internal Server Error` for unhealthy).
   - Both branches include an ISO-8601 UTC timestamp (`new Date().toISOString()`).

### 1.3 Patterns to Replicate Across Provider API Routes

The patterns in `src/app/api/health/db/route.ts` form the foundation for all upcoming provider, service, and discovery routes:
- **Consistent Use of `NextResponse.json()`**: Always return standard JSON envelopes with explicit HTTP status codes.
- **Strict Error Masking & Logging**: Sanitize database error messages and log internal stack traces only on the server.
- **Dynamic Directives for Non-Cached Content**: Apply `force-dynamic` to transactional endpoints (`/api/providers/me`, `/api/providers/[id]/verification`), while letting public read routes leverage Next.js caching or ISR (`revalidate`).
- **Prisma Client Reuse**: Always import `prisma` from `@/lib/prisma` rather than creating a new `PrismaClient()` instance per route.

---

## 2. Proposed API Folder Structure

Following Next.js 16 App Router conventions, each API route handler lives in a `route.ts` file within a nested folder inside `src/app/api/`. Dynamic segments are represented with square brackets `[param]`.

```
src/app/api/
├── health/
│   └── db/
│       └── route.ts                         # Database ping & connectivity diagnostic
│
├── providers/
│   ├── route.ts                             # GET (Admin list/filter) | POST (Provider onboarding)
│   ├── me/
│   │   ├── route.ts                         # GET (Current profile) | PATCH (Update profile)
│   │   ├── submit-verification/
│   │   │   └── route.ts                     # POST (Submit profile for compliance review)
│   │   ├── services/
│   │   │   ├── route.ts                     # GET (My services) | POST (Attach service offering)
│   │   │   └── [serviceId]/
│   │   │       └── route.ts                 # GET | PATCH | DELETE (Manage offering)
│   │   └── marketplaces/
│   │       ├── route.ts                     # GET (My marketplaces) | POST (Join marketplace)
│   │       └── [marketplaceId]/
│   │           └── route.ts                 # PATCH (Toggle isListed/priority) | DELETE (Leave)
│   ├── [id]/
│   │   ├── route.ts                         # GET (Internal detail) | PATCH (Admin update) | DELETE (Soft delete)
│   │   ├── verification/
│   │   │   └── route.ts                     # PATCH (Audit action: approve, reject, suspend)
│   │   └── services/
│   │       └── route.ts                     # GET (Active services for specific provider)
│   └── by-slug/
│       └── [slug]/
│           └── route.ts                     # GET (Public SEO landing page data)
│
├── services/
│   ├── route.ts                             # GET (Public catalog list) | POST (Admin create service)
│   ├── [id]/
│   │   └── route.ts                         # GET | PATCH | DELETE (Admin service management)
│   └── categories/
│       ├── route.ts                         # GET (Hierarchical category tree) | POST (Admin create)
│       └── [id]/
│           └── route.ts                     # GET | PATCH | DELETE (Admin category management)
│
├── marketplaces/
│   ├── route.ts                             # GET (List operational hubs) | POST (Admin create hub)
│   ├── [id]/
│   │   └── route.ts                         # GET | PATCH | DELETE (Admin marketplace management)
│   └── [id]/providers/
│       └── route.ts                         # GET (List approved providers listed in marketplace)
│
└── discovery/
    ├── search/
    │   └── route.ts                         # GET (Public high-performance search & multi-filter)
    └── featured/
        └── route.ts                         # GET (Public top-rated / featured providers)
```

### 2.1 Architectural Rationale

1. **Separation of Concerns (Self vs. Resource vs. Public)**:
   - `/api/providers/me/*`: Contextually scoped to the currently authenticated user (`session.user.id`). Prevents insecure direct object reference (IDOR) vulnerabilities since no ID is passed in the URL.
   - `/api/providers/[id]/*`: Resource-addressed endpoints reserved for platform administrators, compliance auditors (Om Prakash's team), or internal integrations.
   - `/api/providers/by-slug/[slug]`: Public, SEO-optimized endpoint that only returns approved, visible providers.
2. **Dedicated Discovery Namespace (`/api/discovery/*`)**:
   - Isolates high-traffic public search, aggregation, and geo-filtering from operational CRUD endpoints.
   - Allows fine-tuned caching (`next: { revalidate: 60 }`), CDN edge optimization, and rate-limiting rules.
3. **Relational Sub-Routes**:
   - `/api/providers/me/services` and `/api/providers/me/marketplaces` directly manipulate join tables (`ProviderService` and `ProviderMarketplace`) within the provider's security context.

---

## 3. Endpoint Catalog: Methods, Routes & Responsibilities

### 3.1 Public Discovery & Catalog Endpoints (No Auth Required)

| Method | Endpoint | Primary Responsibility | Success Code | Error Codes |
| :--- | :--- | :--- | :---: | :---: |
| `GET` | `/api/discovery/search` | Multi-criteria provider discovery (keyword, service, category, marketplace, geo-location, rating, tier) | `200 OK` | `400`, `500` |
| `GET` | `/api/discovery/featured` | Fetch curated, highest-rated, or priority-ranked providers across marketplaces | `200 OK` | `500` |
| `GET` | `/api/providers/by-slug/[slug]` | Fetch complete public profile of a single approved provider by SEO slug | `200 OK` | `404`, `500` |
| `GET` | `/api/services/categories` | Fetch full hierarchical tree of active categories and subcategories | `200 OK` | `500` |
| `GET` | `/api/services` | Browse active standardized services catalog with category metadata | `200 OK` | `500` |
| `GET` | `/api/services/[id]` | Fetch single service details and active offering counts | `200 OK` | `404`, `500` |
| `GET` | `/api/marketplaces` | List all active regional and vertical marketplaces | `200 OK` | `500` |
| `GET` | `/api/marketplaces/[id]` | Fetch single marketplace details and operating rules | `200 OK` | `404`, `500` |
| `GET` | `/api/marketplaces/[id]/providers` | List approved providers actively listed in a specific marketplace | `200 OK` | `404`, `500` |

### 3.2 Provider Self-Management Endpoints (`/api/providers/me/*`)

| Method | Endpoint | Primary Responsibility | Success Code | Error Codes |
| :--- | :--- | :--- | :---: | :---: |
| `POST` | `/api/providers` | Onboard new provider profile for authenticated user (initial status `DRAFT`) | `201 Created` | `400`, `401`, `409` |
| `GET` | `/api/providers/me` | Fetch complete private profile, verification status, and audit feedback | `200 OK` | `401`, `404` |
| `PATCH` | `/api/providers/me` | Update commercial details, branding, address, coordinates, and contact info | `200 OK` | `400`, `401`, `409` |
| `POST` | `/api/providers/me/submit-verification` | Transition status from `DRAFT` or `ACTION_REQUIRED` to `PENDING_REVIEW` | `200 OK` | `400`, `401`, `422` |
| `GET` | `/api/providers/me/services` | List all services currently offered by the authenticated provider | `200 OK` | `401` |
| `POST` | `/api/providers/me/services` | Attach a catalog service to provider's profile (`ProviderService` join) | `201 Created` | `400`, `401`, `409` |
| `PATCH` | `/api/providers/me/services/[serviceId]` | Update custom title, description, pricing model, rate, or listing status | `200 OK` | `400`, `401`, `404` |
| `DELETE` | `/api/providers/me/services/[serviceId]` | Remove a service offering from provider's catalog | `200 OK` | `401`, `404` |
| `GET` | `/api/providers/me/marketplaces` | List marketplaces provider currently belongs to | `200 OK` | `401` |
| `POST` | `/api/providers/me/marketplaces` | Enroll provider into a regional or vertical marketplace | `201 Created` | `400`, `401`, `409` |
| `PATCH` | `/api/providers/me/marketplaces/[marketplaceId]` | Toggle listing status (`isListed: true/false`) in a specific marketplace | `200 OK` | `400`, `401`, `404` |
| `DELETE` | `/api/providers/me/marketplaces/[marketplaceId]` | Disenroll provider from a specific marketplace | `200 OK` | `401`, `404` |

### 3.3 Administrative & Compliance Audit Endpoints (`/api/providers/[id]/*`)

| Method | Endpoint | Primary Responsibility | Success Code | Error Codes |
| :--- | :--- | :--- | :---: | :---: |
| `GET` | `/api/providers` | List all providers with admin filters (`verificationStatus`, `tier`, `country`) | `200 OK` | `401`, `403` |
| `GET` | `/api/providers/[id]` | Fetch comprehensive provider record, compliance notes, and auditor info | `200 OK` | `401`, `403`, `404` |
| `PATCH` | `/api/providers/[id]` | Administrative update of provider metadata or commercial tier | `200 OK` | `400`, `401`, `403` |
| `PATCH` | `/api/providers/[id]/verification` | Transition verification status (`APPROVED`, `REJECTED`, `ACTION_REQUIRED`, `SUSPENDED`) | `200 OK` | `400`, `401`, `403` |
| `DELETE` | `/api/providers/[id]` | Soft-delete a provider (`deletedAt = now()`, unlist from directories) | `200 OK` | `401`, `403`, `404` |
| `POST` | `/api/services/categories` | Create new service category or subcategory | `201 Created` | `400`, `401`, `403` |
| `PATCH` | `/api/services/categories/[id]` | Update category name, slug, description, or display order | `200 OK` | `400`, `401`, `403` |
| `DELETE` | `/api/services/categories/[id]` | Delete category (restricted if services are assigned) | `200 OK` | `400`, `401`, `403` |
| `POST` | `/api/services` | Add new standardized service to catalog | `201 Created` | `400`, `401`, `403` |
| `PATCH` | `/api/services/[id]` | Modify catalog service definition or active toggle | `200 OK` | `400`, `401`, `403` |
| `DELETE` | `/api/services/[id]` | Archive or delete catalog service | `200 OK` | `400`, `401`, `403` |
| `POST` | `/api/marketplaces` | Create new regional or vertical marketplace hub | `201 Created` | `400`, `401`, `403` |
| `PATCH` | `/api/marketplaces/[id]` | Update marketplace settings, operating currency, or config | `200 OK` | `400`, `401`, `403` |

---

## 4. Request Parameters, Request Bodies & JSON Responses

### 4.1 Standardized API Envelopes

Every API route returns responses adhering to one of two structural envelopes.

#### Success Envelope
```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```
*(The `meta` object is included for paginated collections).*

#### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request payload contains invalid fields.",
    "details": [
      { "field": "slug", "message": "Slug contains illegal characters." }
    ]
  },
  "timestamp": "2026-11-16T03:00:00.000Z"
}
```

---

### 4.2 Detailed Specifications for Critical Endpoints

#### Endpoint A: Provider Discovery Search (`GET /api/discovery/search`)
- **Query Parameters**:
  - `q` (string, optional): Text keyword matching business name, tagline, or description.
  - `categoryId` (UUID, optional): Filter providers offering services in this category.
  - `serviceId` (UUID, optional): Filter providers offering this specific service.
  - `marketplaceId` (UUID, optional): Restrict to providers active in this marketplace.
  - `city` / `state` / `country` (string, optional): Geographic boundary filtering.
  - `lat` / `lng` (decimal, optional): Center coordinates for distance calculation.
  - `radiusKm` (number, optional, default: `50`): Radius filter around `lat`/`lng`.
  - `minRating` (decimal, optional): Minimum rating threshold (e.g., `4.0`).
  - `tier` (enum: `FREE`, `VERIFIED_STANDARD`, `PREMIUM`, `ENTERPRISE`, optional).
  - `page` (integer, default: `1`): Pagination offset page.
  - `limit` (integer, default: `20`, max: `100`): Results per page.
  - `sortBy` (enum: `rating`, `reviewCount`, `name`, `distance`, default: `rating`).
  - `sortOrder` (enum: `asc`, `desc`, default: `desc`).

- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "e7b0a8c2-3e4f-4d9a-bc12-8f9d12345678",
      "businessName": "GreenSun Solar Solutions",
      "slug": "greensun-solar-solutions",
      "tagline": "Commercial & Industrial Rooftop Solar EPC Specialists",
      "logoUrl": "https://cdn.ecopartnerhub.com/logos/greensun.png",
      "city": "Bengaluru",
      "state": "Karnataka",
      "country": "India",
      "rating": 4.85,
      "reviewCount": 38,
      "membershipTier": "PREMIUM",
      "services": [
        {
          "serviceId": "a1b2c3d4-0000-0000-0000-000000000001",
          "name": "Commercial Solar Installation",
          "pricingModel": "CUSTOM_QUOTE",
          "startingPrice": "250000.00",
          "currency": "INR"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### Endpoint B: Provider Public Profile by Slug (`GET /api/providers/by-slug/[slug]`)
- **Route Parameters**:
  - `slug` (string, required): Unique SEO identifier (e.g., `greensun-solar-solutions`).
- **Query Rules**: Must enforce `verificationStatus = 'APPROVED'`, `isPubliclyVisible = true`, `deletedAt = null`.
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "e7b0a8c2-3e4f-4d9a-bc12-8f9d12345678",
    "businessName": "GreenSun Solar Solutions",
    "slug": "greensun-solar-solutions",
    "tagline": "Commercial & Industrial Rooftop Solar EPC Specialists",
    "description": "Providing end-to-end solar engineering, procurement, and construction for industrial clients.",
    "logoUrl": "https://cdn.ecopartnerhub.com/logos/greensun.png",
    "bannerUrl": "https://cdn.ecopartnerhub.com/banners/greensun.png",
    "website": "https://greensunsolar.example.com",
    "contactEmail": "contact@greensunsolar.example.com",
    "contactPhone": "+91-80-23456789",
    "addressLine1": "42 Tech Park Road, Whitefield",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560066",
    "country": "India",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "rating": 4.85,
    "reviewCount": 38,
    "membershipTier": "PREMIUM",
    "verifiedAt": "2026-03-15T10:30:00.000Z",
    "services": [
      {
        "id": "f5a1c9e8-1111-2222-3333-444455556666",
        "serviceId": "a1b2c3d4-0000-0000-0000-000000000001",
        "serviceName": "Commercial Solar Installation",
        "categoryName": "Solar Energy",
        "customTitle": "Turnkey Industrial Solar EPC",
        "customDescription": "Complete rooftop and ground-mount installations with tier-1 bifacial panels.",
        "pricingModel": "CUSTOM_QUOTE",
        "startingPrice": "250000.00",
        "currency": "INR",
        "experienceYears": 8
      }
    ],
    "marketplaces": [
      {
        "marketplaceId": "m1m2m3m4-0000-0000-0000-000000000001",
        "name": "India Clean Energy Exchange",
        "slug": "india-clean-energy"
      }
    ]
  }
}
```

---

#### Endpoint C: Provider Self-Registration (`POST /api/providers`)
- **Headers**: `Authorization: Bearer <token>` or session cookie.
- **Request Body**:
```json
{
  "businessName": "EcoCycle Industrial Waste Ltd",
  "slug": "ecocycle-industrial-waste",
  "legalEntityName": "EcoCycle Solutions Private Limited",
  "registrationNumber": "U38210KA2024PTC123456",
  "taxId": "29ABCDE1234F1Z5",
  "description": "Licensed hazardous and non-hazardous industrial waste recycling and circular valorization.",
  "tagline": "Zero Waste to Landfill Solutions",
  "logoUrl": "https://cdn.ecopartnerhub.com/logos/ecocycle.png",
  "website": "https://ecocycle.example.com",
  "contactEmail": "info@ecocycle.example.com",
  "contactPhone": "+91-80-87654321",
  "addressLine1": "Plot 18, Peenya Industrial Area",
  "city": "Bengaluru",
  "state": "Karnataka",
  "postalCode": "560058",
  "country": "India",
  "latitude": 13.0285,
  "longitude": 77.5195
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "99b1a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "userId": "u1u2u3u4-user-uuid-here",
    "businessName": "EcoCycle Industrial Waste Ltd",
    "slug": "ecocycle-industrial-waste",
    "verificationStatus": "DRAFT",
    "isPubliclyVisible": false,
    "membershipTier": "FREE",
    "createdAt": "2026-11-16T03:15:00.000Z"
  }
}
```

---

#### Endpoint D: Submit for Compliance Verification (`POST /api/providers/me/submit-verification`)
- **Headers**: Authenticated provider user.
- **Body**: None or optional submission note:
```json
{
  "submissionNotes": "Updated business GST certificate and factory license."
}
```
- **Validation**: Requires `businessName`, `description`, `taxId`, `registrationNumber`, and at least 1 attached service before submission is accepted.
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "providerId": "99b1a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "verificationStatus": "PENDING_REVIEW",
    "submittedAt": "2026-11-16T03:20:00.000Z",
    "message": "Your profile has been submitted to the compliance team for review."
  }
}
```

---

#### Endpoint E: Attach Service Offering (`POST /api/providers/me/services`)
- **Request Body**:
```json
{
  "serviceId": "a1b2c3d4-0000-0000-0000-000000000001",
  "customTitle": "Commercial Rooftop Solar Turnkey EPC",
  "customDescription": "Engineering, statutory approvals, net metering, and installation.",
  "pricingModel": "CUSTOM_QUOTE",
  "startingPrice": 150000.00,
  "currency": "INR",
  "experienceYears": 6,
  "status": "ACTIVE"
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "ps-uuid-1234",
    "providerId": "99b1a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "serviceId": "a1b2c3d4-0000-0000-0000-000000000001",
    "customTitle": "Commercial Rooftop Solar Turnkey EPC",
    "pricingModel": "CUSTOM_QUOTE",
    "startingPrice": "150000.00",
    "status": "ACTIVE",
    "createdAt": "2026-11-16T03:22:00.000Z"
  }
}
```

---

#### Endpoint F: Compliance Auditor Status Transition (`PATCH /api/providers/[id]/verification`)
- **Headers**: User with `AUDITOR` or `ADMIN` role.
- **Request Body**:
```json
{
  "action": "APPROVE",
  "rejectionReason": null
}
```
*(Alternative actions: `REJECT`, `REQUEST_CHANGES`, `SUSPEND`)*.
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "99b1a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "verificationStatus": "APPROVED",
    "isPubliclyVisible": true,
    "verifiedAt": "2026-11-16T03:25:00.000Z",
    "verifiedBy": "auditor-user-uuid",
    "rejectionReason": null
  }
}
```

---

## 5. Authentication & Authorization Matrix

The EcoPartnerHub security model separates identity (`User`), access roles (`Role` / `Permission`), and domain profiles (`ProviderProfile`, `CustomerProfile`).

### 5.1 Roles Definition

- **`PUBLIC`**: Unauthenticated guest or client visiting the marketplace directory.
- **`CUSTOMER`**: Authenticated client seeking sustainability services.
- **`PROVIDER`**: Business owner managing provider profiles, services, and quotation workflows.
- **`AUDITOR` / `STAFF`**: Internal compliance officer (coordinating with Om Prakash) reviewing certifications and business legitimacy.
- **`ADMIN`**: Platform administrator with full CRUD authority.

### 5.2 Access Control Matrix

| Endpoint Group | Method | Required Role | Ownership / Condition Check |
| :--- | :--- | :--- | :--- |
| `/api/discovery/*` | `GET` | `PUBLIC` | Enforces `verificationStatus == APPROVED && isPubliclyVisible == true` |
| `/api/providers/by-slug/*` | `GET` | `PUBLIC` | Enforces `verificationStatus == APPROVED && isPubliclyVisible == true` |
| `/api/services/*` (Catalog) | `GET` | `PUBLIC` | Enforces `isActive == true` |
| `/api/marketplaces/*` | `GET` | `PUBLIC` | Enforces `isActive == true` |
| `/api/providers` (Onboarding) | `POST` | `PROVIDER` / `ADMIN` | User must not already possess an existing `ProviderProfile` |
| `/api/providers/me` | `GET`, `PATCH` | `PROVIDER` | Scoped strictly to `ProviderProfile.userId == session.user.id` |
| `/api/providers/me/submit-verification` | `POST` | `PROVIDER` | Scoped to own profile; status must be `DRAFT` or `ACTION_REQUIRED` |
| `/api/providers/me/services/*` | `GET`, `POST`, `PATCH`, `DELETE` | `PROVIDER` | Scoped to services owned by authenticated provider |
| `/api/providers/me/marketplaces/*` | `GET`, `POST`, `PATCH`, `DELETE` | `PROVIDER` | Scoped to marketplace memberships owned by authenticated provider |
| `/api/providers` (List all) | `GET` | `AUDITOR`, `ADMIN` | Requires permission `provider:read_all` |
| `/api/providers/[id]` | `GET`, `PATCH` | `AUDITOR`, `ADMIN` | Requires permission `provider:manage` |
| `/api/providers/[id]/verification` | `PATCH` | `AUDITOR`, `ADMIN` | Requires permission `provider:verify`. Updates `verifiedBy = session.user.id` |
| `/api/providers/[id]` | `DELETE` | `ADMIN` | Soft-deletes provider record (`deletedAt = now()`) |
| `/api/services` (Catalog) | `POST`, `PATCH`, `DELETE` | `ADMIN` | Requires permission `catalog:manage` |
| `/api/services/categories` | `POST`, `PATCH`, `DELETE` | `ADMIN` | Requires permission `catalog:manage` |
| `/api/marketplaces` | `POST`, `PATCH`, `DELETE` | `ADMIN` | Requires permission `marketplace:manage` |

### 5.3 Critical Verification Firewall Security Rules

1. **Anti-Self-Promotion Firewall**:
   - The `/api/providers/me` and `/api/providers` endpoints **must never** accept `verificationStatus`, `isPubliclyVisible`, `verifiedAt`, or `verifiedBy` in their request bodies. Any attempt by a provider to submit these fields is discarded or rejected with `400 Bad Request`.
2. **Auditor Accountability**:
   - Status changes to `APPROVED`, `REJECTED`, or `SUSPENDED` can **only** be executed via `/api/providers/[id]/verification` by an auditor with verified session credentials. The system automatically populates `verifiedBy = session.user.id` and `verifiedAt = new Date()`.
3. **Decoupled Monetization Firewall**:
   - If a provider upgrades their subscription (e.g., from `FREE` to `PREMIUM`), the update modifies `membershipTier` only. It has **zero effect** on `verificationStatus` or `isPubliclyVisible`.

---

## 6. Prisma ORM Integration Patterns

All database operations across these route handlers leverage the singleton Prisma Client from `@/lib/prisma`. Below are concrete patterns for the core operations.

### 6.1 High-Speed Public Discovery Query

This query implements compound search across text fields, relational categories, marketplace enrollment, and pagination while strictly enforcing verification predicates:

```typescript
// Pattern: GET /api/discovery/search
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function searchProviders(params: {
  q?: string;
  categoryId?: string;
  serviceId?: string;
  marketplaceId?: string;
  city?: string;
  state?: string;
  country?: string;
  minRating?: number;
  tier?: string;
  page: number;
  limit: number;
}) {
  const { q, categoryId, serviceId, marketplaceId, city, state, country, minRating, tier, page, limit } = params;
  const skip = (page - 1) * limit;

  // Strict verification predicate
  const where: Prisma.ProviderProfileWhereInput = {
    verificationStatus: "APPROVED",
    isPubliclyVisible: true,
    deletedAt: null,
    ...(q && {
      OR: [
        { businessName: { contains: q, mode: "insensitive" } },
        { tagline: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(city && { city: { equals: city, mode: "insensitive" } }),
    ...(state && { state: { equals: state, mode: "insensitive" } }),
    ...(country && { country: { equals: country, mode: "insensitive" } }),
    ...(minRating && { rating: { gte: minRating } }),
    ...(tier && { membershipTier: tier as any }),
    ...(serviceId && {
      services: {
        some: {
          serviceId,
          status: "ACTIVE",
        },
      },
    }),
    ...(categoryId && {
      services: {
        some: {
          service: { categoryId },
          status: "ACTIVE",
        },
      },
    }),
    ...(marketplaceId && {
      marketplaces: {
        some: {
          marketplaceId,
          isListed: true,
        },
      },
    }),
  };

  const [total, providers] = await prisma.$transaction([
    prisma.providerProfile.count({ where }),
    prisma.providerProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { membershipTier: "desc" },
        { rating: "desc" },
        { reviewCount: "desc" },
      ],
      select: {
        id: true,
        businessName: true,
        slug: true,
        tagline: true,
        logoUrl: true,
        city: true,
        state: true,
        country: true,
        rating: true,
        reviewCount: true,
        membershipTier: true,
        services: {
          where: { status: "ACTIVE" },
          take: 5,
          select: {
            customTitle: true,
            pricingModel: true,
            startingPrice: true,
            currency: true,
            service: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    }),
  ]);

  return { total, providers, page, limit, totalPages: Math.ceil(total / limit) };
}
```

### 6.2 Atomic Registration Transaction (`prisma.$transaction`)

When a provider registers, we atomically create their `ProviderProfile` and enroll them in the default marketplace for their country:

```typescript
// Pattern: POST /api/providers
export async function createProviderProfile(userId: string, data: any) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check if profile already exists
    const existing = await tx.providerProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new Error("PROFILE_EXISTS");
    }

    // 2. Create provider profile in DRAFT state
    const provider = await tx.providerProfile.create({
      data: {
        userId,
        businessName: data.businessName,
        slug: data.slug,
        legalEntityName: data.legalEntityName,
        registrationNumber: data.registrationNumber,
        taxId: data.taxId,
        description: data.description,
        tagline: data.tagline,
        logoUrl: data.logoUrl,
        website: data.website,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        addressLine1: data.addressLine1,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        verificationStatus: "DRAFT",
        isPubliclyVisible: false,
        membershipTier: "FREE",
      },
    });

    // 3. Auto-enroll in regional marketplace if one matches country code
    const defaultMarketplace = await tx.marketplace.findFirst({
      where: { regionCode: data.country, isActive: true },
    });

    if (defaultMarketplace) {
      await tx.providerMarketplace.create({
        data: {
          providerId: provider.id,
          marketplaceId: defaultMarketplace.id,
          isListed: true,
        },
      });
    }

    return provider;
  });
}
```

### 6.3 Compliance Verification Audit Transaction

Auditor status updates transition `verificationStatus`, synchronize `isPubliclyVisible`, and timestamp the reviewer:

```typescript
// Pattern: PATCH /api/providers/[id]/verification
export async function auditProvider(
  providerId: string,
  auditorId: string,
  action: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "SUSPEND",
  rejectionReason?: string
) {
  const statusMap = {
    APPROVE: { status: "APPROVED", visible: true },
    REJECT: { status: "REJECTED", visible: false },
    REQUEST_CHANGES: { status: "ACTION_REQUIRED", visible: false },
    SUSPEND: { status: "SUSPENDED", visible: false },
  } as const;

  const target = statusMap[action];

  return await prisma.providerProfile.update({
    where: { id: providerId },
    data: {
      verificationStatus: target.status,
      isPubliclyVisible: target.visible,
      verifiedAt: action === "APPROVE" ? new Date() : undefined,
      verifiedBy: auditorId,
      rejectionReason: rejectionReason || null,
    },
  });
}
```

### 6.4 Geolocation Search with Distance Calculation (`$queryRaw`)

For bounding-box or radius filtering (e.g., within 50 km of coordinates), Neon PostgreSQL executes standard Haversine formula calculation:

```typescript
// Pattern: Geo-radius filtering within /api/discovery/search
export async function findNearbyProviders(lat: number, lng: number, radiusKm: number) {
  return await prisma.$queryRaw<Array<{ id: string; businessName: string; distanceKm: number }>>`
    SELECT 
      id,
      "businessName",
      (
        6371 * acos(
          cos(radians(${lat})) * cos(radians("latitude")) *
          cos(radians("longitude") - radians(${lng})) +
          sin(radians(${lat})) * sin(radians("latitude"))
        )
      ) AS "distanceKm"
    FROM "ProviderProfile"
    WHERE "verificationStatus" = 'APPROVED'
      AND "isPubliclyVisible" = true
      AND "deletedAt" IS NULL
      AND "latitude" IS NOT NULL
      AND "longitude" IS NOT NULL
      AND (
        6371 * acos(
          cos(radians(${lat})) * cos(radians("latitude")) *
          cos(radians("longitude") - radians(${lng})) +
          sin(radians(${lat})) * sin(radians("latitude"))
        )
      ) <= ${radiusKm}
    ORDER BY "distanceKm" ASC
    LIMIT 50;
  `;
}
```

### 6.5 Safe Error Handling for Prisma Known Request Errors

Prisma errors must be captured and translated into clean HTTP status codes:
- **`P2002` (Unique Constraint Violation)**: Map to `409 Conflict` (e.g., duplicate slug or user already having a profile).
- **`P2003` (Foreign Key Constraint Failure)**: Map to `400 Bad Request` or `422 Unprocessable Entity` (e.g., linking a non-existent `serviceId`).
- **`P2025` (Record to update/delete not found)**: Map to `404 Not Found`.

---

## 7. Database Schema Dependencies & Coordination Roadmap

To ensure zero downtime, consistent database state, and non-blocking team collaboration, the planned endpoints are mapped directly to their schema dependencies.

### 7.1 Schema Dependency Breakdown

```mermaid
flowchart TD
    subgraph CoreApproved["Phase 1: 10-Entity Core Schema (Awaiting Team Lead Sign-Off)"]
        User["User & Role (Akshay)"]
        Provider["ProviderProfile (Tathagata / Om Prakash)"]
        Taxonomy["Category & Service (Tathagata)"]
        MarketplaceModel["Marketplace (Tathagata)"]
        Joins["ProviderService & ProviderMarketplace (Tathagata)"]
    end

    subgraph Phase1Routes["Endpoints Immediately Unblocked by Core Schema"]
        R1["GET /api/discovery/search"]
        R2["GET /api/providers/by-slug/:slug"]
        R3["GET /api/services & /api/services/categories"]
        R4["GET /api/marketplaces"]
        R5["POST /api/providers (Onboarding)"]
        R6["GET / PATCH /api/providers/me"]
        R7["POST / PATCH / DELETE /api/providers/me/services"]
        R8["POST / PATCH / DELETE /api/providers/me/marketplaces"]
        R9["PATCH /api/providers/:id/verification"]
    end

    subgraph FutureEntities["Phase 2: Coordination-Dependent Future Entities"]
        Docs["ProviderDocument (Om Prakash)"]
        Enquiries["Enquiry & ProviderResponse (Krishna)"]
        Quotes["Quotation (Krishna)"]
        Leads["LeadEvent (Krishna & Architecture)"]
    end

    subgraph Phase2Routes["Endpoints Blocked on Future Entities"]
        F1["POST /api/providers/me/documents (Upload licenses/ISO)"]
        F2["GET /api/providers/me/enquiries (Receive client enquiries)"]
        F3["POST /api/providers/me/quotations (Submit commercial quotes)"]
        F4["GET /api/providers/me/analytics/leads (Track impressions/clicks)"]
    end

    User --> R5
    Provider --> R1
    Provider --> R2
    Provider --> R5
    Provider --> R6
    Provider --> R9
    Taxonomy --> R3
    Taxonomy --> R7
    MarketplaceModel --> R4
    MarketplaceModel --> R8
    Joins --> R7
    Joins --> R8

    Docs -.-> F1
    Enquiries -.-> F2
    Quotes -.-> F3
    Leads -.-> F4
```

### 7.2 Detailed Endpoint-to-Schema Mapping Table

| Endpoint Route | Required Prisma Entities | Required Fields & Enums | Schema Status / Dependency |
| :--- | :--- | :--- | :--- |
| `GET /api/discovery/search` | `ProviderProfile`, `ProviderService`, `Service`, `ProviderMarketplace`, `Marketplace` | `verificationStatus`, `isPubliclyVisible`, `rating`, `reviewCount`, `membershipTier`, `city`, `state`, `country`, `latitude`, `longitude` | Ready upon Core 10-Entity migration |
| `GET /api/providers/by-slug/[slug]` | `ProviderProfile`, `ProviderService`, `Service`, `Category`, `ProviderMarketplace`, `Marketplace` | `slug`, `businessName`, `description`, `contactEmail`, `contactPhone`, `logoUrl`, `bannerUrl`, `services.*`, `marketplaces.*` | Ready upon Core 10-Entity migration |
| `POST /api/providers` | `ProviderProfile`, `User` | `userId`, `businessName`, `slug`, `taxId`, `registrationNumber`, `city`, `country`, `verificationStatus: DRAFT` | Blocked on Core Schema + Auth user context |
| `GET / PATCH /api/providers/me` | `ProviderProfile` | All profile fields | Blocked on Core Schema + Auth user context |
| `POST /api/providers/me/submit-verification` | `ProviderProfile` | `verificationStatus` (`DRAFT` ➔ `PENDING_REVIEW`) | Ready upon Core 10-Entity migration |
| `CRUD /api/providers/me/services` | `ProviderService`, `Service` | `providerId`, `serviceId`, `customTitle`, `pricingModel`, `startingPrice`, `status` | Ready upon Core 10-Entity migration |
| `CRUD /api/providers/me/marketplaces` | `ProviderMarketplace`, `Marketplace` | `providerId`, `marketplaceId`, `isListed`, `listingPriority` | Ready upon Core 10-Entity migration |
| `PATCH /api/providers/[id]/verification` | `ProviderProfile`, `User` (Auditor) | `verificationStatus`, `isPubliclyVisible`, `verifiedAt`, `verifiedBy`, `rejectionReason` | Ready upon Core 10-Entity migration |
| `CRUD /api/services` & `/categories` | `Service`, `Category` | All fields in `Service` and `Category` entities | Ready upon Core 10-Entity migration |
| `CRUD /api/marketplaces` | `Marketplace` | All fields in `Marketplace` entity | Ready upon Core 10-Entity migration |
| *FUTURE*: `POST /api/providers/me/documents` | `ProviderDocument` | `documentType`, `fileUrl`, `verificationStatus`, `validUntil` | **BLOCKED**: Requires Phase 2 schema from Om Prakash |
| *FUTURE*: `GET /api/providers/me/enquiries` | `Enquiry`, `ProviderResponse` | `enquiryId`, `customerId`, `serviceId`, `status` | **BLOCKED**: Requires Phase 2 schema from Krishna |
| *FUTURE*: `POST /api/providers/me/quotations` | `Quotation` | `quoteNumber`, `totalAmount`, `scopeOfWork`, `validUntil` | **BLOCKED**: Requires Phase 2 schema from Krishna |
| *FUTURE*: `GET /api/providers/me/analytics` | `LeadEvent` | `eventType`, `metadata`, `timestamp` | **BLOCKED**: Requires Phase 2 schema from Architecture |

### 7.3 Inter-Team Coordination Dependencies

1. **Akshay (Authentication & RBAC Lead)**:
   - Must define the session payload structure (e.g., `session.user.id`, `session.user.role`).
   - Need confirmation of helper utilities for middleware route protection (e.g., `await getServerSession()` or custom JWT extraction).
2. **Om Prakash (Verification Lead)**:
   - Confirm transition criteria between `PENDING_REVIEW` and `UNDER_REVIEW`.
   - Validate whether single-field auditing (`verifiedBy`, `verifiedAt`) is sufficient or if an audit history log table (`ProviderVerificationLog`) is desired before implementing `PATCH /api/providers/[id]/verification`.
3. **Krishna (Lead Pipeline Lead)**:
   - Ensure provider discovery response payload includes the fields needed by Krishna's quotation and enquiry forms (e.g., `serviceId`, `pricingModel`).
4. **Team Leader / Repository Owner**:
   - Provide final approval on the 10-entity database design so that `prisma/schema.prisma` can be populated and `prisma migrate dev` executed.

---

## 8. Summary of Next Steps

Following approval of this API design specification:
1. **Schema Approval**: Team Leader executes migration of the 10 core entities into Neon PostgreSQL.
2. **Phase 1 Route Implementation**:
   - Scaffold folder structure under `src/app/api/providers/`, `src/app/api/services/`, `src/app/api/marketplaces/`, and `src/app/api/discovery/`.
   - Implement public discovery and catalog routes first (`/api/discovery/search`, `/api/services`, `/api/marketplaces`) to enable frontend directory integration.
   - Implement provider onboarding and self-management endpoints (`/api/providers/me/*`) in tandem with Akshay's auth middleware.
3. **Phase 2 Expansion**: Once Om Prakash and Krishna finalize compliance and lead entities, layer in document upload, enquiry response, and quotation APIs.
