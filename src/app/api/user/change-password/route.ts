import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";
import {
  comparePassword,
  hashPassword,
  validatePasswordStrength,
} from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.error) {
      return auth.error;
    }

    const { user } = auth;
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Current password and new password are required",
        },
        { status: 400 }
      );
    }

    // 1. Verify current password
    const isCurrentValid = await comparePassword(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Incorrect current password",
          message: "Incorrect current password",
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    // 2. Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.message },
        { status: 400 }
      );
    }

    // 3. Hash new password, increment tokenVersion (invalidates old sessions)
    const newHash = await hashPassword(newPassword);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
      },
    });

    // 4. Issue a new token for the current session
    const newToken = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      tokenVersion: updatedUser.tokenVersion,
    });

    await logAudit({
      action: "USER_PASSWORD_CHANGED",
      userId: user.id,
      targetEntity: "User",
      targetId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Password changed successfully",
        token: newToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
