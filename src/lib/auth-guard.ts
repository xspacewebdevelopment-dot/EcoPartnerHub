import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, JWTPayload } from "@/lib/jwt";
import { Role, User, CustomerProfile, ProviderProfile } from "@prisma/client";

export type AuthenticatedUser = User & {
  customerProfile: CustomerProfile | null;
  providerProfile: ProviderProfile | null;
};

interface AuthSuccess {
  user: AuthenticatedUser;
  payload: JWTPayload;
  error: null;
}

interface AuthFailure {
  user: null;
  payload: null;
  error: NextResponse;
}

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Extracts and verifies the bearer token from the Authorization header.
 * Verifies the database user, account status, token version (for revocation),
 * and checks role permissions if allowedRoles are provided.
 */
export async function authenticateRequest(
  req: NextRequest,
  allowedRoles?: Role[]
): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      user: null,
      payload: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Access token is missing or malformed",
          message: "Unauthorized: Access token is missing or malformed",
          statusCode: 401,
        },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token || token === "null" || token === "undefined") {
    return {
      user: null,
      payload: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Access token is missing or malformed",
          message: "Unauthorized: Access token is missing or malformed",
          statusCode: 401,
        },
        { status: 401 }
      ),
    };
  }

  const payload = verifyToken(token);

  if (!payload) {
    return {
      user: null,
      payload: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or expired token",
          message: "Unauthorized: Invalid or expired token",
          statusCode: 401,
        },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      customerProfile: true,
      providerProfile: true,
    },
  });

  if (!user) {
    return {
      user: null,
      payload: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: User not found",
          message: "Unauthorized: User not found",
          statusCode: 401,
        },
        { status: 401 }
      ),
    };
  }

  // Check token version to verify session invalidation / logout
  if (user.tokenVersion !== payload.tokenVersion) {
    return {
      user: null,
      payload: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Session has expired or been revoked. Please log in again.",
          message: "Unauthorized: Session has expired or been revoked. Please log in again.",
          statusCode: 401,
        },
        { status: 401 }
      ),
    };
  }

  // Check if account is suspended
  if (user.accountStatus === "SUSPENDED") {
    return {
      user: null,
      payload: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Forbidden: Account is suspended. Please contact platform operations.",
          message: "Forbidden: Account is suspended. Please contact platform operations.",
          statusCode: 403,
        },
        { status: 403 }
      ),
    };
  }

  // Role-based permission check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return {
        user: null,
        payload: null,
        error: NextResponse.json(
          {
            success: false,
            error: `Forbidden: Access denied. Required role: [${allowedRoles.join(
              ", "
            )}], your role: ${user.role}`,
            message: `Forbidden: Access denied. Required role: [${allowedRoles.join(
              ", "
            )}], your role: ${user.role}`,
            statusCode: 403,
          },
          { status: 403 }
        ),
      };
    }
  }

  return {
    user,
    payload,
    error: null,
  };
}
