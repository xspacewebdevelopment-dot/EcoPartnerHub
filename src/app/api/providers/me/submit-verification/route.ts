
import { NextResponse } from "next/server";
import { ProviderVerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    // 1. Authenticate provider
    const auth = await authenticateRequest(req, {
      allowedRoles: ["PROVIDER"],
    });

    if (!auth.success) {
      return auth.response;
    }

    const profile = auth.user.providerProfile;

    if (!profile || profile.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Provider profile not found" },
        { status: 404 }
      );
    }

    // 2. Parse optional request body
    let submissionNotes: string | null = null;
    const rawBody = await req.text();

    if (rawBody.trim()) {
      let body: unknown;

      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid JSON body" },
          { status: 400 }
        );
      }

      if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body)
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid request body" },
          { status: 400 }
        );
      }

      const notes = (body as Record<string, unknown>).submissionNotes;

      if (notes !== undefined && typeof notes !== "string") {
        return NextResponse.json(
          { success: false, message: "submissionNotes must be a string" },
          { status: 400 }
        );
      }

      submissionNotes =
        typeof notes === "string" ? notes.trim() || null : null;
    }

    // 3. Validate required profile information
    if (
      !profile.businessName.trim() ||
      !profile.description.trim() ||
      !profile.taxId?.trim() ||
      !profile.registrationNumber?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Complete business name, description, tax ID and registration number before submitting.",
        },
        { status: 400 }
      );
    }

    // 4. Check attached services
    const serviceCount = await prisma.providerService.count({
      where: { providerId: profile.id },
    });

    if (serviceCount < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Add at least one service before submitting verification.",
        },
        { status: 400 }
      );
    }

    // 5. Validate current verification status
    const allowedStatuses: ProviderVerificationStatus[] = [
      ProviderVerificationStatus.DRAFT,
      ProviderVerificationStatus.ACTION_REQUIRED,
      ProviderVerificationStatus.REJECTED,
    ];

    if (!allowedStatuses.includes(profile.verificationStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: "Your profile cannot be submitted in its current status.",
          currentStatus: profile.verificationStatus,
        },
        { status: 409 }
      );
    }

    // 6. Update profile and create audit log atomically
    const result = await prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.providerProfile.update({
        where: { id: profile.id },
        data: {
          verificationStatus: ProviderVerificationStatus.PENDING_REVIEW,
          isPubliclyVisible: false,
        },
      });

      await tx.providerVerificationAuditLog.create({
        data: {
          providerId: profile.id,
          previousStatus: profile.verificationStatus,
          newStatus: ProviderVerificationStatus.PENDING_REVIEW,
          action: "SUBMITTED_FOR_VERIFICATION",
          changedById: auth.user.id,
          reason: submissionNotes,
        },
      });

      return updatedProfile;
    });

    // 7. Success response
    return NextResponse.json(
      {
        success: true,
        message: "Verification submitted successfully.",
        data: {
          providerId: result.id,
          status: result.verificationStatus,
          submittedAt: result.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Provider verification submission error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit verification.",
      },
      { status: 500 }
    );
  }
}
