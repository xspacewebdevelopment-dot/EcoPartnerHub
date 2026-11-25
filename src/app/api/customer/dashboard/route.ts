import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-guard";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/dashboard
 * Protected Customer Dashboard endpoint.
 * Only accessible by users with the CUSTOMER role.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, [Role.CUSTOMER]);
    if (auth.error) {
      return auth.error;
    }

    const { user } = auth;

    return NextResponse.json(
      {
        success: true,
        message: "Welcome to Customer Dashboard",
        dashboard: {
          customerId: user.id,
          businessName: user.customerProfile?.businessName || "Not Set",
          activeEnquiriesCount: 0,
          savedProvidersCount: 0,
          shortlistedServicesCount: 0,
          recentActivities: [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Customer dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
