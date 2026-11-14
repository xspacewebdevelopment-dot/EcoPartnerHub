import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-guard";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/super-admin/admins
 * Creates an authorized ADMIN user account.
 * Restricted strictly to SUPER_ADMIN.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req, [Role.SUPER_ADMIN]);
    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();
    const { email, password, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email address already exists",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newAdmin = await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        passwordHash,
        role: Role.ADMIN,
        accountStatus: "ACTIVE",
        isEmailVerified: true,
      },
    });

    await logAudit({
      action: "ADMIN_ACCOUNT_CREATED",
      userId: newAdmin.id,
      actorId: auth.user.id,
      targetEntity: "User",
      targetId: newAdmin.id,
      metadata: { createdBySuperAdmin: auth.user.email },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Admin account created successfully",
        admin: {
          id: newAdmin.id,
          email: newAdmin.email,
          role: newAdmin.role,
          accountStatus: newAdmin.accountStatus,
          createdAt: newAdmin.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
