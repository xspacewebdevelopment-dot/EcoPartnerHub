import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, email } = body;

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

    // 2. Fall back to email lookup
    if (!user) {
      if (!email) {
        return NextResponse.json(
          { success: false, error: "Authentication or email is required" },
          { status: 400 }
        );
      }

      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }
    }

    const tokenString = `VERIFY_EMAIL_${user.id}_${code.trim()}`;

    // 3. Find active token
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token: tokenString },
    });

    if (!tokenRecord || tokenRecord.used || tokenRecord.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Invalid or already used verification code" },
        { status: 400 }
      );
    }

    if (new Date() > tokenRecord.expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification code has expired. Please request a new code.",
        },
        { status: 400 }
      );
    }

    // 4. Update user and invalidate code in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      }),
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { used: true },
      }),
    ]);

    await logAudit({
      action: "EMAIL_VERIFIED_SUCCESS",
      userId: user.id,
      targetEntity: "User",
      targetId: user.id,
      metadata: { email: user.email },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Email address verified successfully.",
        isEmailVerified: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Confirm email verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
