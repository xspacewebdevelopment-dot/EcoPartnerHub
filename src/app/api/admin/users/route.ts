import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-guard";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * Lists users on the platform with pagination and role filters.
 * Accessible by ADMIN and SUPER_ADMIN.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, [Role.ADMIN, Role.SUPER_ADMIN]);
    if (auth.error) {
      return auth.error;
    }

    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role");

    const whereClause: { role?: Role } = {};
    if (
      roleParam &&
      Object.values(Role).includes(roleParam as Role)
    ) {
      whereClause.role = roleParam as Role;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        accountStatus: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
        customerProfile: {
          select: {
            fullName: true,
            businessName: true,
            city: true,
          },
        },
        providerProfile: {
          select: {
            displayName: true,
            legalName: true,
            verificationStatus: true,
            verificationLevel: true,
            membershipStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        success: true,
        total: users.length,
        users,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin list users error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
