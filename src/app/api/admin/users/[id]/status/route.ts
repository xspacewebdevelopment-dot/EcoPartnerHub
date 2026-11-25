import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-guard";
import { Role, AccountStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/users/[id]/status
 * Suspend or reactivate user accounts.
 * Accessible by ADMIN and SUPER_ADMIN.
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req, [Role.ADMIN, Role.SUPER_ADMIN]);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await props.params;
    const body = await req.json();
    const { status, reason } = body;

    if (!status || !Object.values(AccountStatus).includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Valid status required: [${Object.values(AccountStatus).join(", ")}]`,
        },
        { status: 400 }
      );
    }

    // Check target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Target user not found" },
        { status: 404 }
      );
    }

    // Super Admin accounts cannot be suspended by standard Admin
    if (
      targetUser.role === Role.SUPER_ADMIN &&
      auth.user.role !== Role.SUPER_ADMIN
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Only a Super Admin can alter another Super Admin account",
        },
        { status: 403 }
      );
    }

    // Update account status and increment tokenVersion if suspended to revoke active sessions
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        accountStatus: status as AccountStatus,
        tokenVersion:
          status === AccountStatus.SUSPENDED
            ? { increment: 1 }
            : targetUser.tokenVersion,
      },
    });

    await logAudit({
      action: `ACCOUNT_${status}`,
      userId: targetUser.id,
      actorId: auth.user.id,
      targetEntity: "User",
      targetId: targetUser.id,
      metadata: { reason: reason || "Admin action", newStatus: status },
    });

    return NextResponse.json(
      {
        success: true,
        message: `User account status updated to ${status}`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          accountStatus: updatedUser.accountStatus,
          updatedAt: updatedUser.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update user status error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
