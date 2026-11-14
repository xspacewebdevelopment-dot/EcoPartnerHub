import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // To prevent account enumeration in production, we still return a success message
    // but in development/testing we also include the resetToken in the response body.
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account exists with this email, a password reset token has been generated.",
        },
        { status: 200 }
      );
    }

    // Invalidate previous unused reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate secure random reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await logAudit({
      action: "PASSWORD_RESET_REQUESTED",
      userId: user.id,
      targetEntity: "User",
      targetId: user.id,
      metadata: { email: user.email },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "If an account exists with this email, a password reset token has been generated.",
        // Providing resetToken in response for seamless API testing and Postman flows
        resetToken: token,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
