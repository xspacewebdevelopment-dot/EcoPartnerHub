
import { NextResponse } from "next/server";
import { Prisma, ListingStatus, PricingModel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const validStatuses = Object.values(ListingStatus);
const validPricingModels = Object.values(PricingModel);

// PATCH: Partially update a provider's own service listing
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const auth = await authenticateRequest(req, {
      allowedRoles: ["PROVIDER"],
    });

    if (!auth.success) return auth.response;

    const providerProfile = auth.user.providerProfile;

    if (!providerProfile || providerProfile.deletedAt !== null) {
      return NextResponse.json(
        { success: false, message: "Provider profile not found" },
        { status: 404 }
      );
    }

    const { id } = await context.params;

    const existingListing = await prisma.providerService.findFirst({
      where: {
        id,
        providerId: providerProfile.id,
      },
    });

    if (!existingListing) {
      return NextResponse.json(
        { success: false, message: "Service listing not found" },
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

    const data = body as Record<string, unknown>;
    const allowedFields = [
      "customTitle",
      "customDescription",
      "pricingModel",
      "startingPrice",
      "currency",
      "experienceYears",
      "status",
    ];

    const providedFields = Object.keys(data);

    if (
      providedFields.length === 0 ||
      providedFields.some((field) => !allowedFields.includes(field))
    ) {
      return NextResponse.json(
        { success: false, message: "Provide valid fields to update" },
        { status: 400 }
      );
    }

    const updateData: Prisma.ProviderServiceUpdateInput = {};

    if ("customTitle" in data) {
      if (data.customTitle !== null && typeof data.customTitle !== "string") {
        return NextResponse.json(
          { success: false, message: "customTitle must be a string or null" },
          { status: 400 }
        );
      }
      updateData.customTitle = data.customTitle as string | null;
    }

    if ("customDescription" in data) {
      if (
        data.customDescription !== null &&
        typeof data.customDescription !== "string"
      ) {
        return NextResponse.json(
          { success: false, message: "customDescription must be a string or null" },
          { status: 400 }
        );
      }
      updateData.customDescription = data.customDescription as string | null;
    }

    if ("pricingModel" in data) {
      if (
        typeof data.pricingModel !== "string" ||
        !validPricingModels.includes(data.pricingModel as PricingModel)
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid pricingModel" },
          { status: 400 }
        );
      }
      updateData.pricingModel = data.pricingModel as PricingModel;
    }

    if ("startingPrice" in data) {
      if (
        data.startingPrice !== null &&
        (typeof data.startingPrice !== "number" ||
          !Number.isFinite(data.startingPrice) ||
          data.startingPrice < 0)
      ) {
        return NextResponse.json(
          { success: false, message: "startingPrice must be a non-negative number or null" },
          { status: 400 }
        );
      }
      updateData.startingPrice =
        data.startingPrice === null
          ? null
          : new Prisma.Decimal(data.startingPrice as number);
    }

    if ("currency" in data) {
      if (
        data.currency !== null &&
        (typeof data.currency !== "string" ||
          !/^[A-Z]{3}$/.test(data.currency))
      ) {
        return NextResponse.json(
          { success: false, message: "currency must be a 3-letter uppercase code or null" },
          { status: 400 }
        );
      }
      updateData.currency = data.currency as string | null;
    }

    if ("experienceYears" in data) {
      if (
        data.experienceYears !== null &&
        (typeof data.experienceYears !== "number" ||
          !Number.isInteger(data.experienceYears) ||
          data.experienceYears < 0)
      ) {
        return NextResponse.json(
          { success: false, message: "experienceYears must be a non-negative integer or null" },
          { status: 400 }
        );
      }
      updateData.experienceYears = data.experienceYears as number | null;
    }

    if ("status" in data) {
      if (
        typeof data.status !== "string" ||
        !validStatuses.includes(data.status as ListingStatus)
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid listing status" },
          { status: 400 }
        );
      }
      updateData.status = data.status as ListingStatus;
    }

    const updatedListing = await prisma.providerService.update({
      where: { id: existingListing.id },
      data: updateData,
      include: {
        service: {
          include: { category: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Service listing updated successfully",
        data: updatedListing,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update provider service error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a provider's own service listing
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const auth = await authenticateRequest(req, {
      allowedRoles: ["PROVIDER"],
    });

    if (!auth.success) return auth.response;

    const providerProfile = auth.user.providerProfile;

    if (!providerProfile || providerProfile.deletedAt !== null) {
      return NextResponse.json(
        { success: false, message: "Provider profile not found" },
        { status: 404 }
      );
    }

    const { id } = await context.params;

    const existingListing = await prisma.providerService.findFirst({
      where: {
        id,
        providerId: providerProfile.id,
      },
    });

    if (!existingListing) {
      return NextResponse.json(
        { success: false, message: "Service listing not found" },
        { status: 404 }
      );
    }

    await prisma.providerService.delete({
      where: { id: existingListing.id },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Service listing removed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete provider service error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
