
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";

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
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "provider";
}

// Generate a unique slug
async function generateUniqueSlug(businessName: string): Promise<string> {
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
                errors.push(`${field} is required and must be a non-empty string`);
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

        if (
            contactEmail &&
            !emailRegex.test(contactEmail)
        ) {
            errors.push("Please provide a valid contact email");
        }

        // Country validation (ISO alpha-2 format)
        if (
            country &&
            !/^[A-Za-z]{2}$/.test(country)
        ) {
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
                    message: "A provider profile with this information already exists",
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



export async function GET(req: Request) {
  try {
    // Step 1: Authenticate the provider
    const auth = await authenticateRequest(req, {
      allowedRoles: ["PROVIDER"],
    });

    if (!auth.success) {
      return auth.response;
    }

    // Step 2: Get the provider profile
    const profile = auth.user.providerProfile;

    // Step 3: Check whether profile exists
    if (!profile || profile.deletedAt !== null) {
      return NextResponse.json(
        {
          success: false,
          message: "Provider profile not found",
        },
        { status: 404 }
      );
    }

    // Step 4: Return the profile
    return NextResponse.json(
      {
        success: true,
        message: "Provider profile fetched successfully",
        data: profile,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Get provider profile error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}


export async function PUT(req: Request) {
  try {
    // 1. Authenticate the provider
    const auth = await authenticateRequest(req, {
      allowedRoles: ["PROVIDER"],
    });

    if (!auth.success) {
      return auth.response;
    }

    // 2. Check whether the provider has a profile
    const existingProfile = auth.user.providerProfile;

    if (!existingProfile || existingProfile.deletedAt !== null) {
      return NextResponse.json(
        {
          success: false,
          message: "Provider profile not found",
        },
        { status: 404 }
      );
    }

    // 3. Read request body
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON body",
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

    // 4. Define permitted fields
    const requiredFields = [
      "businessName",
      "description",
      "contactEmail",
      "contactPhone",
      "city",
      "state",
      "postalCode",
      "country",
    ];

    const nullableFields = [
      "legalEntityName",
      "registrationNumber",
      "taxId",
      "tagline",
      "logoUrl",
      "bannerUrl",
      "website",
      "addressLine1",
    ];

    const allowedFields = [
      ...requiredFields,
      ...nullableFields,
      "latitude",
      "longitude",
    ];

    // 5. Check that at least one field was supplied
    const suppliedFields = allowedFields.filter((field) =>
      Object.prototype.hasOwnProperty.call(body, field)
    );

    if (suppliedFields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one valid field is required",
        },
        { status: 400 }
      );
    }

    const errors: string[] = [];

    // 6. Validate string fields
    for (const field of [...requiredFields, ...nullableFields]) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) {
        continue;
      }

      const value = body[field];

      if (nullableFields.includes(field) && value === null) {
        continue;
      }

      if (
        typeof value !== "string" ||
        value.trim().length === 0
      ) {
        errors.push(`${field} must be a non-empty string`);
      }
    }

    // 7. Validate email
    if (
      typeof body.contactEmail === "string" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        body.contactEmail.trim()
      )
    ) {
      errors.push("contactEmail must be a valid email address");
    }

    // 8. Validate country code
    if (
      typeof body.country === "string" &&
      !/^[A-Za-z]{2}$/.test(body.country.trim())
    ) {
      errors.push("country must be a two-letter ISO country code");
    }

    // 9. Validate coordinates
    for (const field of ["latitude", "longitude"] as const) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) {
        continue;
      }

      const value = body[field];

      if (value !== null && (
        typeof value !== "number" ||
        !Number.isFinite(value)
      )) {
        errors.push(`${field} must be a valid number or null`);
      }
    }

    if (
      typeof body.latitude === "number" &&
      (body.latitude < -90 || body.latitude > 90)
    ) {
      errors.push("latitude must be between -90 and 90");
    }

    if (
      typeof body.longitude === "number" &&
      (body.longitude < -180 || body.longitude > 180)
    ) {
      errors.push("longitude must be between -180 and 180");
    }

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

    // 10. Prepare only permitted fields for updating
    const updateData: Prisma.ProviderProfileUpdateInput = {};

    for (const field of suppliedFields) {
      if (field === "latitude" || field === "longitude") {
        updateData[field] = body[field] as number | null;
      } else if (field === "country") {
        updateData.country = (
          body.country as string
        ).trim().toUpperCase();
      } else if (nullableFields.includes(field)) {
        updateData[field as
          | "legalEntityName"
          | "registrationNumber"
          | "taxId"
          | "tagline"
          | "logoUrl"
          | "bannerUrl"
          | "website"
          | "addressLine1"
        ] = body[field] as string | null;
      } else {
        updateData[field as
          | "businessName"
          | "description"
          | "contactEmail"
          | "contactPhone"
          | "city"
          | "state"
          | "postalCode"
        ] = (body[field] as string).trim();
      }
    }

    // 11. Update slug if business name changes
    if (
      typeof body.businessName === "string" &&
      body.businessName.trim() !== existingProfile.businessName
    ) {
      updateData.slug = await generateUniqueSlug(
        body.businessName.trim()
      );
    }

    // 12. Update database record
    const updatedProfile = await prisma.providerProfile.update({
      where: {
        id: existingProfile.id,
      },
      data: updateData,
    });

    // 13. Return updated profile
    return NextResponse.json(
      {
        success: true,
        message: "Provider profile updated successfully",
        data: updatedProfile,
      },
      { status: 200 }
    );

  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A unique field already exists",
        },
        { status: 409 }
      );
    }

    console.error("Update provider profile error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}



// DELETE: Soft delete provider profile
export async function DELETE(req: Request) {
  try {
    // 1. Authenticate provider
    const auth = await authenticateRequest(req, {
      allowedRoles: ["PROVIDER"],
    });

    if (!auth.success) {
      return auth.response;
    }

    // 2. Find existing provider profile
    const existingProfile = auth.user.providerProfile;

    if (!existingProfile || existingProfile.deletedAt !== null) {
      return NextResponse.json(
        {
          success: false,
          message: "Provider profile not found",
        },
        { status: 404 }
      );
    }

    // 3. Perform soft delete
    const deletedProfile = await prisma.providerProfile.update({
      where: {
        id: existingProfile.id,
      },
      data: {
        deletedAt: new Date(),
        isPubliclyVisible: false,
      },
    });

    // 4. Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Provider profile deleted successfully",
        data: {
          id: deletedProfile.id,
          businessName: deletedProfile.businessName,
          deletedAt: deletedProfile.deletedAt,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Delete provider profile error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
