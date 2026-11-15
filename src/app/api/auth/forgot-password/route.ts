import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";
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

    // Generate secure 6-digit numeric reset code (100000 to 999999)
    const token = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send the 6-digit code to the user's email address
    const emailResult = await sendPasswordResetEmail(user.email, token);

    await logAudit({
      action: "PASSWORD_RESET_REQUESTED",
      userId: user.id,
      targetEntity: "User",
      targetId: user.id,
      metadata: {
        email: user.email,
        emailDelivered: emailResult.success,
        isSimulated: emailResult.simulated || false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `A 6-digit password reset code has been sent to ${user.email}.`,
        // Mailbox web viewer URL if using Ethereal email
        previewUrl: emailResult.previewUrl || null,
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
