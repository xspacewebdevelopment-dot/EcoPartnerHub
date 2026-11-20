import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { logAudit } from "@/lib/audit";
import { Role, EntityType, VerificationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      phone,
      legalName,
      displayName,
      entityType,
      operatingLocations,
      website,
      bio,
    } = body;

    // 1. Basic validation
    if (!email || !password || !legalName || !displayName) {
      return NextResponse.json(
        {
          success: false,
          error: "Email, password, legal name, and display name are required",
        },
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
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email address already exists",
        },
        { status: 409 }
      );
    }

    // 4. Duplicate phone check (409 Conflict)
    if (phone) {
      const normalizedPhone = phone.trim();
      const existingPhone = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingPhone) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this phone number already exists",
          },
          { status: 409 }
        );
      }
    }

    // 5. Validate entity type enum if provided
    let resolvedEntityType: EntityType = EntityType.PROPRIETORSHIP;
    if (entityType && Object.values(EntityType).includes(entityType)) {
      resolvedEntityType = entityType as EntityType;
    } else if (entityType === "PRIVATE_LIMITED" || entityType === "PVT_LTD") {
      resolvedEntityType = EntityType.COMPANY;
    }

    // 6. Hash password and create provider
    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        passwordHash,
        role: Role.PROVIDER,
        accountStatus: "ACTIVE",
        providerProfile: {
          create: {
            legalName: legalName.trim(),
            displayName: displayName.trim(),
            entityType: resolvedEntityType,
            operatingLocations: Array.isArray(operatingLocations)
              ? operatingLocations
              : [],
            website: website || null,
            bio: bio || null,
            membershipStatus: "PENDING",
            verificationLevel: 0, // Level 0 — Submitted (as per Blueprint)
            verificationStatus: VerificationStatus.PENDING,
          },
        },
      },
      include: {
        providerProfile: true,
      },
    });

    // 7. Sign JWT token
    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      tokenVersion: newUser.tokenVersion,
    });

    // 8. Audit log
    await logAudit({
      action: "PROVIDER_REGISTERED",
      userId: newUser.id,
      targetEntity: "User",
      targetId: newUser.id,
      metadata: {
        email: newUser.email,
        role: newUser.role,
        displayName: newUser.providerProfile?.displayName,
      },
    });

    // 9. Return 201 Created
    return NextResponse.json(
      {
        success: true,
        message: "Provider registered successfully",
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          accountStatus: newUser.accountStatus,
          providerProfile: newUser.providerProfile,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Provider registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
