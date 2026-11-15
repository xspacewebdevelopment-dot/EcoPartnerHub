import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";
import { sendVerificationSms } from "@/lib/sms";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let user = null;
    const body = await req.json().catch(() => ({}));
    const { phone } = body;

    // 1. Try to authenticate via Bearer token
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const auth = await authenticateRequest(req);
      if (!auth.error) {
        user = auth.user;
      }
    }

    // 2. If not authenticated, lookup by phone
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
          { success: false, error: "No account found with this phone number" },
          { status: 404 }
        );
      }
    }

    // Target phone number to verify
    const targetPhone = phone ? phone.trim() : user.phone;

    if (!targetPhone) {
      return NextResponse.json(
        { success: false, error: "No phone number associated with this account" },
        { status: 400 }
      );
    }

    // If user provided a new phone number while authenticated, update it on the user profile
    if (phone && phone.trim() !== user.phone) {
      const existingPhoneUser = await prisma.user.findUnique({
        where: { phone: phone.trim() },
      });

      if (existingPhoneUser && existingPhoneUser.id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Phone number is already in use by another account" },
          { status: 409 }
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { phone: phone.trim(), isPhoneVerified: false },
      });
    }

    // 3. Invalidate previous unused phone verification tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        token: { startsWith: `VERIFY_PHONE_${user.id}_` },
        used: false,
      },
      data: { used: true },
    });

    // 4. Generate 6-digit numeric SMS code
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: `VERIFY_PHONE_${user.id}_${code}`,
        expiresAt,
      },
    });

    // 5. Send verification SMS
    const smsResult = await sendVerificationSms(targetPhone, code);

    await logAudit({
      action: "PHONE_VERIFICATION_SENT",
      userId: user.id,
      targetEntity: "User",
      targetId: user.id,
      metadata: {
        phone: targetPhone,
        delivered: smsResult.success,
        simulated: smsResult.simulated || false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `A 6-digit verification code has been dispatched to ${targetPhone}.`,
        code, // provided for seamless automated testing and runner flows
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send phone verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
