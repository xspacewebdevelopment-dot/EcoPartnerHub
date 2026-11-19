# EcoPartnerHub - Entity Relationship (ER) Diagrams

> **Document Status**: Architectural Review Draft  
> **Database Engine**: Neon PostgreSQL (Serverless)  
> **ORM Modeling**: Prisma ORM  

---

## 1. Core Architecture ER Diagram (10 Core Entities)

The diagram below documents the 10 core database entities, primary keys (PK), foreign keys (FK), unique constraints (UK), data types, and exact relational cardinalities.

```mermaid
erDiagram
    ROLE ||--o{ USER : "categorizes (1:N)"
    ROLE ||--o{ ROLE_PERMISSION : "contains (1:N)"
    PERMISSION ||--o{ ROLE_PERMISSION : "mapped_in (1:N)"
    
    USER ||--o| CUSTOMER_PROFILE : "owns (1:0..1)"
    USER ||--o| PROVIDER_PROFILE : "owns (1:0..1)"
    USER |o--o{ PROVIDER_PROFILE : "audits_as_verifier (0..1:N)"

    CATEGORY |o--o{ CATEGORY : "parent_to_subcategories (0..1:N)"
    CATEGORY ||--o{ SERVICE : "classifies (1:N)"

    PROVIDER_PROFILE ||--o{ PROVIDER_SERVICE : "provides (1:N)"
    SERVICE ||--o{ PROVIDER_SERVICE : "fulfilled_by (1:N)"

    PROVIDER_PROFILE ||--o{ PROVIDER_MARKETPLACE : "operates_in (1:N)"
    MARKETPLACE ||--o{ PROVIDER_MARKETPLACE : "lists (1:N)"

    USER {
        uuid id PK
        string email UK
        string passwordHash "nullable"
        string fullName
        string phone "nullable"
        uuid roleId FK
        string status "UserStatus enum"
        boolean isEmailVerified
        datetime emailVerifiedAt "nullable"
        datetime lastLoginAt "nullable"
        datetime createdAt
        datetime updatedAt
        datetime deletedAt "nullable"
    }

    ROLE {
        uuid id PK
        string name UK
        string code UK
        string description "nullable"
        boolean isSystem
        datetime createdAt
        datetime updatedAt
    }

    PERMISSION {
        uuid id PK
        string name UK
        string code UK
        string resource
        string action
        string description "nullable"
        datetime createdAt
        datetime updatedAt
    }

    ROLE_PERMISSION {
        uuid roleId PK "FK to Role.id"
        uuid permissionId PK "FK to Permission.id"
        datetime assignedAt
    }

    CUSTOMER_PROFILE {
        uuid id PK
        uuid userId FK "UK - 1:1 to User.id"
        string companyName "nullable"
        string contactPerson "nullable"
        string phone "nullable"
        string industry "nullable"
        string companySize "nullable"
        string website "nullable"
        string addressLine1 "nullable"
        string city "nullable"
        string state "nullable"
        string postalCode "nullable"
        string country "nullable"
        jsonb preferences "nullable"
        datetime createdAt
        datetime updatedAt
    }

    PROVIDER_PROFILE {
        uuid id PK
        uuid userId FK "UK - 1:1 to User.id"
        string businessName
        string slug UK
        string legalEntityName "nullable"
        string registrationNumber "nullable"
        string taxId "nullable"
        string description
        string tagline "nullable"
        string logoUrl "nullable"
        string bannerUrl "nullable"
        string website "nullable"
        string contactEmail
        string contactPhone
        string addressLine1 "nullable"
        string city
        string state
        string postalCode
        string country
        decimal latitude "nullable"
        decimal longitude "nullable"
        string verificationStatus "ProviderVerificationStatus enum"
        datetime verifiedAt "nullable"
        uuid verifiedBy FK "nullable - User.id"
        string rejectionReason "nullable"
        boolean isPubliclyVisible
        decimal rating
        integer reviewCount
        string membershipTier "MembershipTier enum"
        datetime createdAt
        datetime updatedAt
        datetime deletedAt "nullable"
    }

    CATEGORY {
        uuid id PK
        string name
        string slug UK
        string description "nullable"
        string iconUrl "nullable"
        uuid parentId FK "nullable"
        integer displayOrder
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    SERVICE {
        uuid id PK
        uuid categoryId FK
        string name
        string slug UK
        string shortDescription "nullable"
        string description
        string iconUrl "nullable"
        boolean isActive
        integer displayOrder
        jsonb metadata "nullable"
        datetime createdAt
        datetime updatedAt
    }

    MARKETPLACE {
        uuid id PK
        string name
        string slug UK
        string description "nullable"
        string type "MarketplaceType enum"
        string regionCode "nullable"
        string currency
        boolean isActive
        jsonb config "nullable"
        datetime createdAt
        datetime updatedAt
    }

    PROVIDER_SERVICE {
        uuid id PK
        uuid providerId FK
        uuid serviceId FK
        string customTitle "nullable"
        string customDescription "nullable"
        string pricingModel "PricingModel enum"
        decimal startingPrice "nullable"
        string currency "nullable"
        integer experienceYears "nullable"
        string status "ListingStatus enum"
        datetime createdAt
        datetime updatedAt
    }

    PROVIDER_MARKETPLACE {
        uuid id PK
        uuid providerId FK
        uuid marketplaceId FK
        boolean isListed
        integer listingPriority
        datetime joinedAt
        datetime createdAt
        datetime updatedAt
    }
```

---

## 2. Cardinality Legend & Relationship Breakdown

| Relationship | Cardinality Syntax | Verbal Description | Referential Integrity Action |
| :--- | :---: | :--- | :--- |
| **`ROLE` to `USER`** | `||--o{` | One Role can belong to zero or many Users; One User has exactly one Role. | `ON DELETE RESTRICT` (Cannot delete a Role while Users are assigned to it). |
| **`ROLE` to `ROLE_PERMISSION`** | `||--o{` | One Role has zero or many Permission assignments. | `ON DELETE CASCADE` (Removing a Role revokes all its permission grants). |
| **`PERMISSION` to `ROLE_PERMISSION`**| `||--o{` | One Permission is mapped across zero or many Roles. | `ON DELETE CASCADE` (Removing a Permission removes it from all Roles). |
| **`USER` to `CUSTOMER_PROFILE`** | `||--o|` | One User has zero or exactly one CustomerProfile. | `ON DELETE CASCADE` (Deleting a User removes their customer profile). |
| **`USER` to `PROVIDER_PROFILE`** | `||--o|` | One User has zero or exactly one ProviderProfile. | `ON DELETE CASCADE` (Deleting a User removes their provider profile). |
| **`USER` (Auditor) to `PROVIDER_PROFILE`** | `|o--o{` | One User (auditor) can verify zero or many ProviderProfiles. | `ON DELETE SET NULL` (Deleting an auditor user keeps the verified record intact). |
| **`CATEGORY` to `CATEGORY` (Self)** | `|o--o{` | One Category can have zero or one parent Category; and zero or many subcategories. | `ON DELETE RESTRICT` (Cannot delete a parent Category if child subcategories exist). |
| **`CATEGORY` to `SERVICE`** | `||--o{` | One Category contains zero or many Services; One Service belongs to exactly one Category. | `ON DELETE RESTRICT` (Cannot delete a Category if it contains active Services). |
| **`PROVIDER_PROFILE` to `PROVIDER_SERVICE`** | `||--o{` | One Provider offers zero or many Services. | `ON DELETE CASCADE` (Deleting a Provider deletes their service listings). |
| **`SERVICE` to `PROVIDER_SERVICE`** | `||--o{` | One Service is offered by zero or many Providers. | `ON DELETE RESTRICT` (Cannot delete a Service if active Provider listings depend on it). |
| **`PROVIDER_PROFILE` to `PROVIDER_MARKETPLACE`** | `||--o{` | One Provider participates in zero or many Marketplaces. | `ON DELETE CASCADE` (Deleting a Provider removes their marketplace listings). |
| **`MARKETPLACE` to `PROVIDER_MARKETPLACE`** | `||--o{` | One Marketplace hosts zero or many Providers. | `ON DELETE RESTRICT` (Cannot delete a Marketplace if providers are actively listed). |

---

## 3. Extended Architecture: Future Entities Integration

The following diagram illustrates how the future entities identified in **TASK 3** (`ProviderDocument`, `Enquiry`, `ProviderResponse`, `Quotation`, and `LeadEvent`) cleanly connect with the core schema without breaking existing tables.

```mermaid
erDiagram
    PROVIDER_PROFILE ||--o{ PROVIDER_DOCUMENT : "submits_for_verification (1:N)"
    USER |o--o{ PROVIDER_DOCUMENT : "audits_document (0..1:N)"

    CUSTOMER_PROFILE ||--o{ ENQUIRY : "submits (1:N)"
    SERVICE ||--o{ ENQUIRY : "requested_for (1:N)"
    MARKETPLACE ||--o{ ENQUIRY : "routed_through (1:N)"
    PROVIDER_PROFILE |o--o{ ENQUIRY : "targeted_directly (0..1:N)"

    ENQUIRY ||--o{ PROVIDER_RESPONSE : "receives (1:N)"
    PROVIDER_PROFILE ||--o{ PROVIDER_RESPONSE : "dispatches (1:N)"

    ENQUIRY ||--o{ QUOTATION : "generates (1:N)"
    PROVIDER_PROFILE ||--o{ QUOTATION : "issues (1:N)"

    PROVIDER_PROFILE ||--o{ LEAD_EVENT : "attracts (1:N)"
    CUSTOMER_PROFILE |o--o{ LEAD_EVENT : "triggers (0..1:N)"
    MARKETPLACE |o--o{ LEAD_EVENT : "monitors (0..1:N)"
    SERVICE |o--o{ LEAD_EVENT : "associated_with (0..1:N)"

    PROVIDER_DOCUMENT {
        uuid id PK
        uuid providerId FK
        string documentType "BUSINESS_LICENSE, TAX, ISO, INSURANCE"
        string documentNumber "nullable"
        string fileUrl
        integer fileSize
        string mimeType
        string verificationStatus "PENDING, VERIFIED, REJECTED, EXPIRED"
        datetime verifiedAt "nullable"
        uuid verifiedBy FK "nullable"
        string rejectionNotes "nullable"
        datetime validUntil "nullable"
        datetime createdAt
        datetime updatedAt
    }

    ENQUIRY {
        uuid id PK
        uuid customerId FK
        uuid serviceId FK
        uuid marketplaceId FK
        uuid providerId FK "nullable (null = open marketplace broadcast)"
        string title
        string description
        string status "OPEN, IN_REVIEW, QUOTED, ACCEPTED, CLOSED, CANCELLED"
        decimal budgetEstimate "nullable"
        datetime targetCompletionDate "nullable"
        jsonb attachments "nullable"
        datetime createdAt
        datetime updatedAt
    }

    PROVIDER_RESPONSE {
        uuid id PK
        uuid enquiryId FK
        uuid providerId FK
        string status "VIEWED, ACCEPTED, DECLINED, RESPONDED"
        string declineReason "nullable"
        datetime respondedAt
        datetime createdAt
        datetime updatedAt
    }

    QUOTATION {
        uuid id PK
        uuid enquiryId FK
        uuid providerId FK
        string quoteNumber UK
        decimal totalAmount
        decimal taxAmount
        string currency
        string scopeOfWork
        string termsAndConditions "nullable"
        string status "DRAFT, SUBMITTED, ACCEPTED, REJECTED, EXPIRED"
        datetime validUntil
        datetime acceptedAt "nullable"
        string rejectionFeedback "nullable"
        datetime createdAt
        datetime updatedAt
    }

    LEAD_EVENT {
        uuid id PK
        uuid providerId FK
        uuid customerId FK "nullable"
        uuid marketplaceId FK "nullable"
        uuid serviceId FK "nullable"
        string eventType "PROFILE_VIEW, CONTACT_CLICK, ENQUIRY_SUBMITTED, QUOTE_ACCEPTED"
        jsonb metadata "nullable"
        string ipAddress "nullable"
        datetime timestamp
    }
```

---

## 4. Architectural Notes on Diagram Integrity

1. **Decoupling RBAC from Profiles**:
   A `User` links to `Role` for security and permissions, while linking to `CustomerProfile` or `ProviderProfile` for business data. This ensures administrative and security decisions remain isolated from business entity schemas.
2. **Strict Verification Boundary**:
   Notice that `PROVIDER_DOCUMENT` links to `PROVIDER_PROFILE`, and status changes require an auditor (`USER.id`). No automatic triggers promote a provider to `APPROVED`.
3. **Multi-Marketplace Join Topology**:
   `PROVIDER_MARKETPLACE` allows one provider to belong to multiple regional or vertical hubs with independent visibility toggles (`isListed`) and custom priorities (`listingPriority`).
