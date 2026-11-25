import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/me
 * Retrieves current authenticated user profile details.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.error) {
      return auth.error;
    }

    const { user } = auth;

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          accountStatus: user.accountStatus,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          customerProfile: user.customerProfile,
          providerProfile: user.providerProfile,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get user details error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/me
 * Updates current authenticated user profile details.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.error) {
      return auth.error;
    }

    const { user } = auth;
    const body = await req.json();
    const { phone, customerProfile, providerProfile } = body;

    // Optional phone update with duplicate check
    if (phone && phone !== user.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: phone.trim() },
      });
      if (existingPhone && existingPhone.id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this phone number already exists",
          },
          { status: 409 }
        );
      }
    }

    // Update customer profile if user is a customer
    if (user.role === "CUSTOMER" && customerProfile) {
      await prisma.customerProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: customerProfile.fullName,
          businessName: customerProfile.businessName,
          businessType: customerProfile.businessType,
          city: customerProfile.city,
          marketplacePresence: customerProfile.marketplacePresence,
        },
        create: {
          userId: user.id,
          fullName: customerProfile.fullName,
          businessName: customerProfile.businessName,
          businessType: customerProfile.businessType,
          city: customerProfile.city,
          marketplacePresence: customerProfile.marketplacePresence || [],
        },
      });
    }

    // Update provider profile if user is a provider
    if (user.role === "PROVIDER" && providerProfile) {
      await prisma.providerProfile.upsert({
        where: { userId: user.id },
        update: {
          displayName: providerProfile.displayName,
          legalName: providerProfile.legalName,
          bio: providerProfile.bio,
          website: providerProfile.website,
          operatingLocations: providerProfile.operatingLocations,
        },
        create: {
          userId: user.id,
          displayName: providerProfile.displayName || "Provider",
          legalName: providerProfile.legalName || "Provider Legal",
          bio: providerProfile.bio,
          website: providerProfile.website,
          operatingLocations: providerProfile.operatingLocations || [],
        },
      });
    }

    // Update user root fields
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        phone: phone !== undefined ? phone : user.phone,
      },
      include: {
        customerProfile: true,
        providerProfile: true,
      },
    });

    await logAudit({
      action: "USER_PROFILE_UPDATED",
      userId: user.id,
      targetEntity: "User",
      targetId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          accountStatus: updatedUser.accountStatus,
          customerProfile: updatedUser.customerProfile,
          providerProfile: updatedUser.providerProfile,
          updatedAt: updatedUser.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update user details error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
