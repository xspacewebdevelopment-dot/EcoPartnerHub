import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.error) {
      return auth.error;
    }

    const { user } = auth;

    // Increment tokenVersion in database to invalidate all active JWTs for this user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });

    await logAudit({
      action: "USER_LOGOUT",
      userId: user.id,
      targetEntity: "User",
      targetId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Successfully logged out. All active sessions have been invalidated.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during logout" },
      { status: 500 }
    );
  }
}
