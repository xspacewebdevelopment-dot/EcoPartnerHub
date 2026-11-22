import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// ─── Rate-Limit Constants ──────────────────────────────────────────────
const RESEND_COOLDOWN_SECONDS = 60; // Minimum gap between consecutive OTP sends
const MAX_RESENDS_PER_HOUR = 5; // Maximum OTP requests per user per rolling hour
const MAX_FAILED_ATTEMPTS = 3; // Lock the OTP after this many incorrect guesses

// ─── Resend Frequency Guard ────────────────────────────────────────────
/**
 * Checks whether the user is sending OTP requests too frequently.
 * Returns a 429 NextResponse if rate-limited, or null if the request is allowed.
 *
 * @param userId   – The user requesting a new OTP
 * @param tokenPrefix – Optional prefix filter (e.g. "VERIFY_EMAIL_" or "VERIFY_PHONE_")
 *                       to scope rate limiting to a specific OTP type. If omitted,
 *                       only password-reset tokens (hashed, no prefix) are checked.
 */
export async function checkResendRateLimit(
  userId: string,
  tokenPrefix?: string
): Promise<NextResponse | null> {
  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - RESEND_COOLDOWN_SECONDS * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Build the where clause with optional token prefix filter
  const baseWhere: Record<string, unknown> = { userId };
  if (tokenPrefix) {
    baseWhere.token = { startsWith: tokenPrefix };
  } else {
    // For password-reset tokens (SHA-256 hashes), exclude verification-prefixed tokens
    baseWhere.token = {
      not: { startsWith: "VERIFY_" },
    };
  }

  // 1. Check 60-second cooldown: was the last token created within the cooldown window?
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: {
      ...baseWhere,
      createdAt: { gte: cooldownCutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (recentToken) {
    const waitSeconds = Math.ceil(
      (recentToken.createdAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000 - now.getTime()) / 1000
    );
    return NextResponse.json(
      {
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        retryAfterSeconds: waitSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(waitSeconds) },
      }
    );
  }

  // 2. Check hourly cap: count tokens created in the last 60 minutes
  const hourlyCount = await prisma.passwordResetToken.count({
    where: {
      ...baseWhere,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (hourlyCount >= MAX_RESENDS_PER_HOUR) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many code requests. Maximum ${MAX_RESENDS_PER_HOUR} requests per hour. Please try again later.`,
        retryAfterSeconds: 3600,
      },
      {
        status: 429,
        headers: { "Retry-After": "3600" },
      }
    );
  }

  return null; // No rate limit hit — proceed
}

// ─── Failed Attempt Guard ──────────────────────────────────────────────
/**
 * Increments the failedAttempts counter on a token record.
 * If the counter reaches MAX_FAILED_ATTEMPTS, the token is permanently
 * invalidated (marked as used).
 *
 * @returns A 429 NextResponse if the token is now locked, or a 400
 *          NextResponse indicating the wrong code with remaining attempts.
 */
export async function handleFailedOtpAttempt(
  tokenRecordId: string,
  currentFailedAttempts: number
): Promise<NextResponse> {
  const newCount = currentFailedAttempts + 1;

  if (newCount >= MAX_FAILED_ATTEMPTS) {
    // Lock the token permanently
    await prisma.passwordResetToken.update({
      where: { id: tokenRecordId },
      data: { used: true, failedAttempts: newCount },
    });

    return NextResponse.json(
      {
        success: false,
        error: `Too many incorrect attempts (${MAX_FAILED_ATTEMPTS}). This code has been invalidated. Please request a new one.`,
        locked: true,
      },
      { status: 429 }
    );
  }

  // Increment the counter but keep the token active
  await prisma.passwordResetToken.update({
    where: { id: tokenRecordId },
    data: { failedAttempts: newCount },
  });

  const remaining = MAX_FAILED_ATTEMPTS - newCount;
  return NextResponse.json(
    {
      success: false,
      error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before this code is locked.`,
      attemptsRemaining: remaining,
    },
    { status: 400 }
  );
}

export { MAX_FAILED_ATTEMPTS, RESEND_COOLDOWN_SECONDS, MAX_RESENDS_PER_HOUR };
