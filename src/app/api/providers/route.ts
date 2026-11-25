
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";
import {
  ProviderVerificationStatus,
  ListingStatus,
  Prisma,
} from "@prisma/client";

// Check whether the request body is a valid JSON object
function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

// Generate a URL-friendly slug from the business name
function slugify(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "provider"
  );
}

// Generate a unique slug
async function generateUniqueSlug(
  businessName: string
): Promise<string> {
  const baseSlug = slugify(businessName);

  let slug = baseSlug;
  let counter = 2;

  while (
    await prisma.providerProfile.findUnique({
      where: { slug },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// GET: Discover approved and publicly visible providers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Read query parameters
    const search = searchParams.get("search")?.trim();
    const serviceId = searchParams.get("serviceId")?.trim();
    const marketplaceId = searchParams.get("marketplaceId")?.trim();
    const city = searchParams.get("city")?.trim();
    const state = searchParams.get("state")?.trim();

    // Pagination
    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 10);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid pagination parameters. Page must be positive and limit must be between 1 and 100.",
        },
        { status: 400 }
      );
    }

    // Sorting
    const sortBy = searchParams.get("sortBy") ?? "rating";
    const sortOrder = searchParams.get("sortOrder") ?? "desc";

    if (!["rating", "businessName", "createdAt"].includes(sortBy)) {
      return NextResponse.json(
        { success: false, message: "Invalid sortBy value" },
        { status: 400 }
      );
    }

    if (!["asc", "desc"].includes(sortOrder)) {
      return NextResponse.json(
        { success: false, message: "Invalid sortOrder value" },
        { status: 400 }
      );
    }

    // Build provider filters
    const where: Prisma.ProviderProfileWhereInput = {
      verificationStatus: ProviderVerificationStatus.APPROVED,
      isPubliclyVisible: true,
      deletedAt: null,
    };

    // Search by business name, description, tagline or location
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tagline: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by location
    if (city) {
      where.city = { equals: city, mode: "insensitive" };
    }

    if (state) {
      where.state = { equals: state, mode: "insensitive" };
    }

    // Filter by active provider service
    if (serviceId) {
      where.services = {
        some: {
          serviceId,
          status: ListingStatus.ACTIVE,
          service: {
            isActive: true,
          },
        },
      };
    }

    // Filter by listed marketplace
    if (marketplaceId) {
      where.marketplaces = {
        some: {
          marketplaceId,
          isListed: true,
          marketplace: {
            isActive: true,
          },
        },
      };
    }

    // Fetch total matching providers
    const total = await prisma.providerProfile.count({
      where,
    });

    // Fetch providers
    const providers = await prisma.providerProfile.findMany({
      where,
      select: {
        id: true,
        businessName: true,
        slug: true,
        description: true,
        tagline: true,
        logoUrl: true,
        bannerUrl: true,
        website: true,
        city: true,
        state: true,
        country: true,
        rating: true,
        reviewCount: true,
        membershipTier: true,
        verifiedAt: true,

        services: {
          where: {
            status: ListingStatus.ACTIVE,
            service: {
              isActive: true,
            },
          },
          select: {
            id: true,
            customTitle: true,
            customDescription: true,
            pricingModel: true,
            startingPrice: true,
            currency: true,
            service: {
              select: {
                id: true,
                name: true,
                slug: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },

        marketplaces: {
          where: {
            isListed: true,
            marketplace: {
              isActive: true,
            },
          },
          select: {
            id: true,
            listingPriority: true,
            marketplace: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                regionCode: true,
              },
            },
          },
        },
      },

      orderBy: [
        {
          [sortBy]: sortOrder,
        },
        {
          id: "asc",
        },
      ],

      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        success: true,
        message: "Providers fetched successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        data: providers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Discover providers error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// POST: Create a provider profile
export async function POST(req: Request) {
  try {
    // 1. Authenticate the user and verify PROVIDER role
    const auth = await authenticateRequest(req, {
      allowedRoles: ["PROVIDER"],
    });

    if (!auth.success) {
      return auth.response;
    }

    // 2. Check whether the provider already has a profile
    if (auth.user.providerProfile !== null) {
      return NextResponse.json(
        {
          success: false,
          message: "Provider profile already exists",
        },
        { status: 409 }
      );
    }

    // 3. Read the request body
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body",
        },
        { status: 400 }
      );
    }

    if (!isObject(body)) {
      return NextResponse.json(
        {
          success: false,
          message: "Request body must be a JSON object",
        },
        { status: 400 }
      );
    }

    // 4. Validate request fields
    const errors: string[] = [];

    // Validate required string fields
    const requiredString = (field: string): string => {
      const value = body[field];

      if (typeof value !== "string" || value.trim() === "") {
        errors.push(
          `${field} is required and must be a non-empty string`
        );
        return "";
      }

      return value.trim();
    };

    // Validate optional string fields
    const optionalString = (field: string): string | undefined => {
      if (!(field in body)) {
        return undefined;
      }

      const value = body[field];

      if (typeof value !== "string") {
        errors.push(`${field} must be a string`);
        return undefined;
      }

      return value.trim() || undefined;
    };

    // Validate optional numeric coordinates
    const optionalCoordinate = (
      field: string,
      min: number,
      max: number
    ): number | undefined => {
      if (!(field in body)) {
        return undefined;
      }

      const value = body[field];

      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max
      ) {
        errors.push(
          `${field} must be a valid number between ${min} and ${max}`
        );
        return undefined;
      }

      return value;
    };

    // Required fields
    const businessName = requiredString("businessName");
    const description = requiredString("description");
    const contactEmail = requiredString("contactEmail");
    const contactPhone = requiredString("contactPhone");
    const city = requiredString("city");
    const state = requiredString("state");
    const postalCode = requiredString("postalCode");
    const country = requiredString("country");

    // Optional fields
    const legalEntityName = optionalString("legalEntityName");
    const registrationNumber = optionalString("registrationNumber");
    const taxId = optionalString("taxId");
    const tagline = optionalString("tagline");
    const logoUrl = optionalString("logoUrl");
    const bannerUrl = optionalString("bannerUrl");
    const website = optionalString("website");
    const addressLine1 = optionalString("addressLine1");

    const latitude = optionalCoordinate("latitude", -90, 90);
    const longitude = optionalCoordinate("longitude", -180, 180);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (contactEmail && !emailRegex.test(contactEmail)) {
      errors.push("Please provide a valid contact email");
    }

    // Country validation (ISO alpha-2 format)
    if (country && !/^[A-Za-z]{2}$/.test(country)) {
      errors.push("Country must be a two-letter ISO alpha-2 code");
    }

    // Return all validation errors together
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors,
        },
        { status: 400 }
      );
    }

    // 5. Generate a unique slug
    const slug = await generateUniqueSlug(businessName);

    // 6. Create provider profile in the database
    const providerProfile = await prisma.providerProfile.create({
      data: {
        userId: auth.user.id,
        businessName,
        slug,
        description,
        contactEmail,
        contactPhone,
        city,
        state,
        postalCode,
        country: country.toUpperCase(),

        ...(legalEntityName !== undefined && { legalEntityName }),
        ...(registrationNumber !== undefined && { registrationNumber }),
        ...(taxId !== undefined && { taxId }),
        ...(tagline !== undefined && { tagline }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(website !== undefined && { website }),
        ...(addressLine1 !== undefined && { addressLine1 }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
      },
    });

    // 7. Return successful response
    return NextResponse.json(
      {
        success: true,
        message: "Provider profile created successfully",
        data: providerProfile,
      },
      { status: 201 }
    );
  } catch (error) {
    // 8. Handle Prisma unique constraint errors
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A provider profile with this information already exists",
        },
        { status: 409 }
      );
    }

    // Log unexpected errors on the server
    console.error("Provider profile creation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
