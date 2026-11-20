import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-guard";
import { Role, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dashboard
 * Protected Operations Admin Dashboard endpoint.
 * Accessible by ADMIN and SUPER_ADMIN roles.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, [Role.ADMIN, Role.SUPER_ADMIN]);
    if (auth.error) {
      return auth.error;
    }

    const [totalUsers, totalCustomers, totalProviders, pendingVerifications] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: Role.CUSTOMER } }),
        prisma.user.count({ where: { role: Role.PROVIDER } }),
        prisma.providerProfile.count({
          where: { verificationStatus: VerificationStatus.PENDING },
        }),
      ]);

    return NextResponse.json(
      {
        success: true,
        message: "Welcome to Operations Admin Dashboard",
        stats: {
          totalUsers,
          totalCustomers,
          totalProviders,
          pendingVerifications,
          activeComplaintsCount: 0,
          pendingLeadsCount: 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
