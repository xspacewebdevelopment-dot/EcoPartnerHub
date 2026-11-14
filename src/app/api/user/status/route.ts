import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/status
 * Returns current user's account status and verification state.
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
        status: {
          userId: user.id,
          role: user.role,
          accountStatus: user.accountStatus,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          membershipStatus: user.providerProfile?.membershipStatus ?? null,
          verificationStatus:
            user.providerProfile?.verificationStatus ??
            (user.customerProfile?.isBusinessVerified ? "VERIFIED" : "UNVERIFIED"),
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get account status error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
