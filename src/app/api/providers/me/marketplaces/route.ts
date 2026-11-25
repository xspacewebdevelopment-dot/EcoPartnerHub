
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";

// GET: Fetch marketplaces associated with the authenticated provider
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

    const providerMarketplaces =
      await prisma.providerMarketplace.findMany({
        where: {
          providerId: providerProfile.id,
        },
        include: {
          marketplace: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json(
      {
        success: true,
        count: providerMarketplaces.length,
        data: providerMarketplaces,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get provider marketplaces error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Add a marketplace to the authenticated provider's profile
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

    // Parse JSON request body safely
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    // Validate request body
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { marketplaceId, isListed, listingPriority } =
      body as Record<string, unknown>;

    // Validate marketplaceId
    if (
      typeof marketplaceId !== "string" ||
      !marketplaceId.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "marketplaceId is required" },
        { status: 400 }
      );
    }

    // Remove unnecessary spaces from marketplaceId
    const normalizedMarketplaceId = marketplaceId.trim();

    // Validate isListed
    if (
      isListed !== undefined &&
      typeof isListed !== "boolean"
    ) {
      return NextResponse.json(
        { success: false, message: "isListed must be a boolean" },
        { status: 400 }
      );
    }

    // Validate listingPriority
    if (
      listingPriority !== undefined &&
      (
        typeof listingPriority !== "number" ||
        !Number.isInteger(listingPriority) ||
        listingPriority < 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "listingPriority must be a non-negative integer",
        },
        { status: 400 }
      );
    }

    // Check whether marketplace exists and is active
    const marketplace = await prisma.marketplace.findFirst({
      where: {
        id: normalizedMarketplaceId,
        isActive: true,
      },
    });

    if (!marketplace) {
      return NextResponse.json(
        { success: false, message: "Active marketplace not found" },
        { status: 404 }
      );
    }

    // Create provider-marketplace association
    const providerMarketplace =
      await prisma.providerMarketplace.create({
        data: {
          providerId: providerProfile.id,
          marketplaceId: normalizedMarketplaceId,
          isListed: isListed ?? true,
          listingPriority: listingPriority ?? 0,
        },
        include: {
          marketplace: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Marketplace added successfully",
        data: providerMarketplace,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add provider marketplace error:", error);

    // Handle duplicate marketplace association
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Marketplace already added by provider",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
