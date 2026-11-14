import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Reset token and new password are required" },
        { status: 400 }
      );
    }

    // 1. Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    // 2. Find and validate the reset token
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.used) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or already used password reset token",
        },
        { status: 400 }
      );
    }

    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Password reset token has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // 3. Hash new password and update user + invalidate existing sessions
    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 }, // invalidates previous JWT sessions
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    await logAudit({
      action: "PASSWORD_RESET_COMPLETED",
      userId: resetRecord.userId,
      targetEntity: "User",
      targetId: resetRecord.userId,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Password has been reset successfully. Please log in with your new password.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during password reset" },
      { status: 500 }
    );
  }
}
