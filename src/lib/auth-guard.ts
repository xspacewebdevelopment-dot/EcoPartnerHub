import { NextResponse } from "next/server";
import { Prisma, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  verifyToken,
  type DecodedToken,
  JsonWebTokenError,
  TokenExpiredError,
  NotBeforeError,
} from "@/lib/jwt";

/**
 * User record fetched from the database with related role and provider profile.
 */
export type AuthenticatedUser = Prisma.UserGetPayload<{
  include: {
    role: true;
    providerProfile: true;
  };
}>;

/**
 * Successful authentication result.
 */
export interface AuthSuccess {
  success: true;
  user: AuthenticatedUser;
  payload: DecodedToken;
  response: null;
}

/**
 * Failed authentication result containing an appropriate NextResponse.
 */
export interface AuthFailure {
  success: false;
  user: null;
  payload: null;
  response: NextResponse;
}

/**
 * Discriminated union representing the outcome of authenticateRequest.
 */
export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Options for authenticateRequest.
 *
 * - Omitting `allowedRoles` (or passing an empty array) permits any authenticated,
 *   active user regardless of role.
 * - Providing one or more role codes restricts access to those roles only (403 otherwise).
 */
export interface AuthGuardOptions {
  /**
   * Optional array of allowed role codes (e.g. ['PROVIDER', 'ADMIN']).
   * If omitted or empty, any authenticated active user is permitted.
   * If provided, users whose role code is not in this list receive 403 Forbidden.
   */
  allowedRoles?: string[];
}

/**
 * Creates a standardized AuthFailure response with safe client error messages.
 */
function createAuthFailure(status: 401 | 403, message: string): AuthFailure {
  return {
    success: false,
    user: null,
    payload: null,
    response: NextResponse.json({ success: false, error: message }, { status }),
  };
}

/**
 * Authenticates an incoming Next.js API request via JWT Bearer token and verifies the user against PostgreSQL.
 *
 * Security & Validation Steps:
 * 1. Reads and requires the 'Authorization: Bearer <token>' header (401 on missing or malformed).
 * 2. Verifies the token using verifyToken() from @/lib/jwt (401 on expired, invalid, or malformed claims).
 * 3. Fetches the current user from PostgreSQL including 'role' and 'providerProfile' relations (401 if user not found).
 * 4. Ensures the user's database status is ACTIVE and not soft-deleted (403 on inactive/suspended/deactivated).
 * 5. Compares JWT email, roleId, and roleCode with the current database state to prevent stale token privilege (401 on mismatch).
 * 6. If allowedRoles is provided and non-empty, checks the user's role code against that list (403 if not permitted).
 *    Omitting or passing an empty allowedRoles permits any authenticated active user.
 *
 * Note: Database connection or query errors are NOT caught here; they propagate naturally to the route handler.
 *
 * @param req Standard Next.js Request or NextRequest.
 * @param options Optional configuration object or array of allowed role codes.
 * @returns Discriminated union: AuthSuccess (user, payload, no error) or AuthFailure (null user/payload, NextResponse error).
 */
export async function authenticateRequest(
  req: Request,
  options?: AuthGuardOptions | string[]
): Promise<AuthResult> {
  const allowedRoles = Array.isArray(options)
    ? options
    : options?.allowedRoles;

  // 1. Read Authorization header
  const authHeader = req.headers.get("authorization")?.trim();
  if (!authHeader) {
    return createAuthFailure(401, "Missing Authorization header");
  }

  // 2. Validate Bearer format
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1].trim()) {
    return createAuthFailure(
      401,
      "Invalid Authorization header format. Expected 'Bearer <token>'"
    );
  }
  const token = match[1].trim();

  // 3. Verify JWT token
  let payload: DecodedToken;
  try {
    payload = verifyToken(token);
  } catch (err) {
    if (
      err instanceof TokenExpiredError ||
      err instanceof JsonWebTokenError ||
      err instanceof NotBeforeError
    ) {
      const message =
        err instanceof TokenExpiredError
          ? "Token has expired"
          : "Invalid token";
      return createAuthFailure(401, message);
    }
    // Unexpected server configuration or runtime errors propagate to route handler
    throw err;
  }

  // 4. Fetch user from PostgreSQL including role and providerProfile relations.
  // Database connection failures are NOT intercepted here to prevent masking infrastructure outages.
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      role: true,
      providerProfile: true,
    },
  });

  // 5. Ensure user exists
  if (!user) {
    return createAuthFailure(401, "User not found");
  }

  // 6. Ensure user account is ACTIVE in database and not soft-deleted
  if (user.status !== UserStatus.ACTIVE || user.deletedAt !== null) {
    return createAuthFailure(403, "User account is not active");
  }

  // 7. Verify identity and role integrity between JWT claims and database state.
  // Catches stale tokens issued before an email change, role reassignment, or privilege revocation.
  if (
    payload.email !== user.email ||
    payload.roleId !== user.roleId ||
    payload.roleId !== user.role.id ||
    payload.roleCode !== user.role.code
  ) {
    return createAuthFailure(401, "Token claims do not match current account state");
  }

  // 8. Enforce allowed roles if specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role.code)) {
      return createAuthFailure(403, "Forbidden: insufficient permissions");
    }
  }

  // 9. Authentication successful
  return {
    success: true,
    user,
    payload,
    response: null,
  };
}
