
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";

// GET: Fetch services offered by the authenticated provider
export async function GET(req: Request) {
  try {
    const auth = await authenticateRequest(req, {
      allowedRoles: ["PROVIDER"],
    });

    if (!auth.success) {
      return auth.response;
    }

    const providerProfile = auth.user.providerProfile;

    if (!providerProfile || providerProfile.deletedAt !== null) {
      return NextResponse.json(
        { success: false, message: "Provider profile not found" },
        { status: 404 }
      );
    }

    const providerServices = await prisma.providerService.findMany({
      where: {
        providerId: providerProfile.id,
      },
      include: {
        service: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        count: providerServices.length,
        data: providerServices,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get provider services error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Add an existing service to the provider's profile
export async function POST(req: Request) {
  try {
    const auth = await authenticateRequest(req, {
      allowedRoles: ["PROVIDER"],
    });

    if (!auth.success) {
      return auth.response;
    }

    const providerProfile = auth.user.providerProfile;

    if (!providerProfile || providerProfile.deletedAt !== null) {
      return NextResponse.json(
        { success: false, message: "Provider profile not found" },
        { status: 404 }
      );
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      serviceId,
      customTitle,
      customDescription,
      pricingModel,
      startingPrice,
      currency,
      experienceYears,
    } = body as Record<string, unknown>;

    if (typeof serviceId !== "string" || !serviceId.trim()) {
      return NextResponse.json(
        { success: false, message: "serviceId is required" },
        { status: 400 }
      );
    }

    const validPricingModels = [
      "FIXED",
      "HOURLY",
      "CUSTOM_QUOTE",
      "STARTING_AT",
    ];

    if (
      pricingModel !== undefined &&
      (typeof pricingModel !== "string" ||
        !validPricingModels.includes(pricingModel))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid pricing model" },
        { status: 400 }
      );
    }

    if (
      startingPrice !== undefined &&
      startingPrice !== null &&
      (typeof startingPrice !== "number" ||
        !Number.isFinite(startingPrice) ||
        startingPrice < 0)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid starting price" },
        { status: 400 }
      );
    }

    if (
      experienceYears !== undefined &&
      experienceYears !== null &&
      (!Number.isInteger(experienceYears) ||
        (experienceYears as number) < 0)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid experience years" },
        { status: 400 }
      );
    }

    if (
      customTitle !== undefined &&
      customTitle !== null &&
      typeof customTitle !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid custom title" },
        { status: 400 }
      );
    }

    if (
      customDescription !== undefined &&
      customDescription !== null &&
      typeof customDescription !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid custom description" },
        { status: 400 }
      );
    }

    if (
      currency !== undefined &&
      currency !== null &&
      (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency))
    ) {
      return NextResponse.json(
        { success: false, message: "Currency must be a 3-letter code" },
        { status: 400 }
      );
    }

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        isActive: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, message: "Active service not found" },
        { status: 404 }
      );
    }

    const existingProviderService =
      await prisma.providerService.findUnique({
        where: {
          providerId_serviceId: {
            providerId: providerProfile.id,
            serviceId,
          },
        },
      });

    if (existingProviderService) {
      return NextResponse.json(
        { success: false, message: "Service already added by provider" },
        { status: 409 }
      );
    }

    const providerService = await prisma.providerService.create({
      data: {
        providerId: providerProfile.id,
        serviceId,
        customTitle: customTitle as string | null | undefined,
        customDescription: customDescription as
          | string
          | null
          | undefined,
        pricingModel:
          (pricingModel as
            | "FIXED"
            | "HOURLY"
            | "CUSTOM_QUOTE"
            | "STARTING_AT"
            | undefined) ?? "CUSTOM_QUOTE",
        startingPrice:
          startingPrice === undefined || startingPrice === null
            ? null
            : new Prisma.Decimal(startingPrice),
        currency: currency as string | null | undefined,
        experienceYears: experienceYears as number | null | undefined,
      },
      include: {
        service: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Service added successfully",
        data: providerService,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add provider service error:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, message: "Service already added by provider" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
