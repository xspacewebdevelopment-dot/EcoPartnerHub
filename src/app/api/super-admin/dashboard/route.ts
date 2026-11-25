import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-guard";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/dashboard
 * Protected Platform Management Dashboard endpoint.
 * Strictly restricted to SUPER_ADMIN.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, [Role.SUPER_ADMIN]);
    if (auth.error) {
      return auth.error;
    }

    const [usersByRole, recentAuditLogs, totalAuditLogs] = await Promise.all([
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { timestamp: "desc" },
      }),
      prisma.auditLog.count(),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Welcome to Super Admin Platform Management Dashboard",
        platformOverview: {
          rolesDistribution: usersByRole,
          totalAuditEvents: totalAuditLogs,
          recentAuditLogs,
          systemHealth: "Operational",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Super Admin dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
