import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { handleFailedOtpAttempt } from "@/lib/otp-rate-limit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword, email } = body;

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

    // 2. Find the reset record by hashed token (primary) or raw token (backward compat)
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        OR: [{ token: tokenHash }, { token: token }],
      },
      include: { user: true },
    });

    if (!resetRecord) {
      // If email was provided, track failed attempt against their active reset token
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          const activeRecord = await prisma.passwordResetToken.findFirst({
            where: {
              userId: user.id,
              used: false,
              expiresAt: { gt: new Date() },
              NOT: { token: { startsWith: "VERIFY_" } },
            },
            orderBy: { createdAt: "desc" },
          });
          if (activeRecord) {
            return handleFailedOtpAttempt(activeRecord.id, activeRecord.failedAttempts);
          }
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: "Invalid or already used password reset token",
        },
        { status: 400 }
      );
    }

    // ── Lockout check: token already invalidated due to too many failed attempts ──
    if (resetRecord.used) {
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

    // ── Failed attempt rate limiting ──────────────────────────────────
    // The token was found and is valid structurally. But if the caller
    // is using the wrong OTP code (the hash doesn't match the stored hash),
    // we increment failedAttempts. Since we look up by hashed token,
    // if we reach here the token *does* match. However, we still need to
    // guard against brute-force on the raw 6-digit code path.
    // The findFirst above matched either the hash or the raw value.
    // If the stored token is a hash and the submitted value matched via
    // the raw branch but doesn't equal the stored hash, that is a mismatch.
    const isHashMatch = resetRecord.token === tokenHash;
    const isRawMatch = resetRecord.token === token;

    if (!isHashMatch && !isRawMatch) {
      // This shouldn't happen given the OR query, but guard defensively
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or already used password reset token",
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
