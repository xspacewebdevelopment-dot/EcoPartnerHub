import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { handleFailedOtpAttempt } from "@/lib/otp-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, phone } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "6-digit verification code is required" },
        { status: 400 }
      );
    }

    let user = null;

    // 1. Check authenticated user
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const auth = await authenticateRequest(req);
      if (!auth.error) {
        user = auth.user;
      }
    }

    // 2. Fall back to phone lookup
    if (!user) {
      if (!phone) {
        return NextResponse.json(
          { success: false, error: "Authentication or phone number is required" },
          { status: 400 }
        );
      }

      user = await prisma.user.findUnique({
        where: { phone: phone.trim() },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "User not found with this phone number" },
          { status: 404 }
        );
      }
    }

    // 3. Find the most recent active (unused, non-expired) phone verification token
    const activeToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: { startsWith: `VERIFY_PHONE_${user.id}_` },
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No active verification code found. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // ── Failed attempt lockout check ──
    const expectedTokenString = `VERIFY_PHONE_${user.id}_${code.trim()}`;
    if (activeToken.token !== expectedTokenString) {
      // Wrong code — increment failed attempts (locks after 3)
      return handleFailedOtpAttempt(activeToken.id, activeToken.failedAttempts);
    }

    // 4. Correct code — update user and invalidate code in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true },
      }),
      prisma.passwordResetToken.update({
        where: { id: activeToken.id },
        data: { used: true },
      }),
    ]);

    await logAudit({
      action: "PHONE_VERIFIED_SUCCESS",
      userId: user.id,
      targetEntity: "User",
      targetId: user.id,
      metadata: { phone: user.phone },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Phone number verified successfully.",
        isPhoneVerified: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Confirm phone verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
