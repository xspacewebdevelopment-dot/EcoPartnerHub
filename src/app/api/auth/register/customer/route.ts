import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { logAudit } from "@/lib/audit";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      phone,
      fullName,
      businessName,
      businessType,
      city,
      marketplacePresence,
    } = body;

    // 1. Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // 2. Password strength validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    // 3. Duplicate email check (409 Conflict)
    const normalizedEmail = email.toLowerCase().trim();
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email address already exists",
          message: "An account with this email address already exists",
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    // 4. Duplicate phone check (409 Conflict if phone provided)
    if (phone) {
      const normalizedPhone = phone.trim();
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone: {
            equals: normalizedPhone,
            mode: "insensitive",
          },
        },
      });

      if (existingPhone) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this phone number already exists",
            message: "An account with this phone number already exists",
            statusCode: 409,
          },
          { status: 409 }
        );
      }
    }

    // 5. Hash password and create customer user with customer profile
    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        passwordHash,
        role: Role.CUSTOMER,
        accountStatus: "ACTIVE",
        customerProfile: {
          create: {
            fullName: fullName || null,
            businessName: businessName || null,
            businessType: businessType || null,
            city: city || null,
            marketplacePresence: Array.isArray(marketplacePresence)
              ? marketplacePresence
              : [],
          },
        },
      },
      include: {
        customerProfile: true,
      },
    });

    // 6. Generate JWT token
    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      tokenVersion: newUser.tokenVersion,
    });

    // 7. Audit log
    await logAudit({
      action: "CUSTOMER_REGISTERED",
      userId: newUser.id,
      targetEntity: "User",
      targetId: newUser.id,
      metadata: { email: newUser.email, role: newUser.role },
    });

    // 8. Return response (201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Customer registered successfully",
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          accountStatus: newUser.accountStatus,
          customerProfile: newUser.customerProfile,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Customer registration error:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const target = (error as { meta?: { target?: string[] } }).meta?.target;
      const isPhone = Array.isArray(target) && target.includes("phone");
      return NextResponse.json(
        {
          success: false,
          error: isPhone
            ? "An account with this phone number already exists"
            : "An account with this email address already exists",
          message: isPhone
            ? "An account with this phone number already exists"
            : "An account with this email address already exists",
          statusCode: 409,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error during registration", message: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
