import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-guard";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/provider/dashboard
 * Protected Provider Dashboard endpoint.
 * Only accessible by users with the PROVIDER role.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, [Role.PROVIDER]);
    if (auth.error) {
      return auth.error;
    }

    const { user } = auth;

    return NextResponse.json(
      {
        success: true,
        message: "Welcome to Provider Dashboard",
        dashboard: {
          providerId: user.id,
          displayName: user.providerProfile?.displayName || "Provider",
          verificationLevel: user.providerProfile?.verificationLevel ?? 0,
          verificationStatus: user.providerProfile?.verificationStatus ?? "PENDING",
          membershipStatus: user.providerProfile?.membershipStatus ?? "PENDING",
          leadsCount: 0,
          pendingEnquiriesCount: 0,
          responseRate: "N/A",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Provider dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
