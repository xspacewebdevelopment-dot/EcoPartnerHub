
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH: Partially update a provider's marketplace association
export async function PATCH(req: Request, context: RouteContext) {
  try {
    // Authenticate provider
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

    const { id } = await context.params;

    // Find association belonging to this provider
    const existingAssociation =
      await prisma.providerMarketplace.findFirst({
        where: {
          id,
          providerId: providerProfile.id,
        },
      });

    if (!existingAssociation) {
      return NextResponse.json(
        { success: false, message: "Marketplace association not found" },
        { status: 404 }
      );
    }

    // Safely parse JSON request body
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

    const data = body as Record<string, unknown>;

    // Only allow these fields to be updated
    const allowedFields = ["isListed", "listingPriority"];
    const providedFields = Object.keys(data);

    if (
      providedFields.length === 0 ||
      providedFields.some(
        (field) => !allowedFields.includes(field)
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Provide valid fields to update" },
        { status: 400 }
      );
    }

    const updateData: {
      isListed?: boolean;
      listingPriority?: number;
    } = {};

    // Validate isListed
    if ("isListed" in data) {
      if (typeof data.isListed !== "boolean") {
        return NextResponse.json(
          { success: false, message: "isListed must be a boolean" },
          { status: 400 }
        );
      }

      updateData.isListed = data.isListed;
    }

    // Validate listingPriority
    if ("listingPriority" in data) {
      if (
        typeof data.listingPriority !== "number" ||
        !Number.isInteger(data.listingPriority) ||
        data.listingPriority < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "listingPriority must be a non-negative integer",
          },
          { status: 400 }
        );
      }

      updateData.listingPriority = data.listingPriority;
    }

    // Update provider marketplace association
    const updatedAssociation =
      await prisma.providerMarketplace.update({
        where: {
          id: existingAssociation.id,
        },
        data: updateData,
        include: {
          marketplace: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Marketplace association updated successfully",
        data: updatedAssociation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update provider marketplace error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a provider's marketplace association
export async function DELETE(req: Request, context: RouteContext) {
  try {
    // Authenticate provider
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

    const { id } = await context.params;

    // Verify association ownership
    const existingAssociation =
      await prisma.providerMarketplace.findFirst({
        where: {
          id,
          providerId: providerProfile.id,
        },
      });

    if (!existingAssociation) {
      return NextResponse.json(
        { success: false, message: "Marketplace association not found" },
        { status: 404 }
      );
    }

    // Delete association
    await prisma.providerMarketplace.delete({
      where: {
        id: existingAssociation.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Marketplace association removed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete provider marketplace error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
