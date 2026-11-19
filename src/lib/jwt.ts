import jwt, {
  type SignOptions,
  type VerifyOptions,
  JsonWebTokenError,
  TokenExpiredError,
  NotBeforeError,
} from "jsonwebtoken";
import { UserStatus } from "@prisma/client";

/**
 * Retrieves the JWT secret from the environment.
 * Strict: Never uses a hardcoded fallback secret.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error(
      "JWT_SECRET is not configured in environment variables. Please define JWT_SECRET in your .env file."
    );
  }
  return secret;
}

/**
 * Core user payload stored within the signed JWT.
 * Compatible with the relational database schema:
 * - `userId`: User.id (UUID)
 * - `email`: User.email
 * - `roleId`: User.roleId (foreign key referencing Role.id)
 * - `roleCode`: Role.code (canonical machine code, e.g. 'ADMIN', 'PROVIDER', 'CUSTOMER')
 * - `status`: Optional account status (UserStatus enum: ACTIVE, PENDING_VERIFICATION, etc.)
 *
 * NOTE:
 * - Role is a relational model, not an enum. `roleCode` is the single canonical role claim.
 * - `tokenVersion` is intentionally not included as the schema does not support it.
 */
export interface JwtUserPayload {
  userId: string;
  email: string;
  roleId: string;
  roleCode: string;
  status?: UserStatus;
}

/**
 * Standard alias for the JWT payload.
 */
export type TokenPayload = JwtUserPayload;

/**
 * Decoded token containing custom user claims and standard RFC 7519 registered claims.
 */
export interface DecodedToken extends JwtUserPayload {
  iat?: number;
  exp?: number;
  sub?: string;
  iss?: string;
  aud?: string | string[];
  nbf?: number;
  jti?: string;
}

/**
 * Validates that a decoded JWT object contains all required claims with correct types.
 *
 * @throws JsonWebTokenError if any validation check fails
 */
function validateDecodedPayload(decoded: unknown): asserts decoded is DecodedToken {
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new JsonWebTokenError("Invalid token payload: expected a non-null object");
  }

  const payload = decoded as Record<string, unknown>;

  if (typeof payload.userId !== "string" || payload.userId.trim() === "") {
    throw new JsonWebTokenError("Invalid token payload: 'userId' must be a non-empty string");
  }

  if (typeof payload.email !== "string" || payload.email.trim() === "") {
    throw new JsonWebTokenError("Invalid token payload: 'email' must be a non-empty string");
  }

  if (typeof payload.roleId !== "string" || payload.roleId.trim() === "") {
    throw new JsonWebTokenError("Invalid token payload: 'roleId' must be a non-empty string");
  }

  if (typeof payload.roleCode !== "string" || payload.roleCode.trim() === "") {
    throw new JsonWebTokenError("Invalid token payload: 'roleCode' must be a non-empty string");
  }

  if (
    payload.status !== undefined &&
    (typeof payload.status !== "string" || !Object.values(UserStatus).includes(payload.status as UserStatus))
  ) {
    throw new JsonWebTokenError(
      `Invalid token payload: 'status' must be a valid UserStatus (${Object.values(UserStatus).join(", ")})`
    );
  }
}

/**
 * Helper to construct a standard JwtUserPayload from a Prisma User record and its related Role.
 */
export function createJwtPayloadFromUser(
  user: { id: string; email: string; roleId: string; status?: UserStatus },
  role: { code: string }
): JwtUserPayload {
  return {
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleCode: role.code,
    ...(user.status ? { status: user.status } : {}),
  };
}

/**
 * Signs a JWT with the configured JWT_SECRET and expiration.
 *
 * @param payload The user token payload
 * @param options Optional jsonwebtoken SignOptions
 * @returns Signed JWT string
 * @throws Error if JWT_SECRET is missing or token signing fails
 */
export function signToken(
  payload: JwtUserPayload,
  options?: SignOptions
): string {
  const secret = getJwtSecret();
  const defaultExpiresIn = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"];

  const hasExp = "exp" in (payload as unknown as object);
  const signOptions: SignOptions = {
    ...(!hasExp && defaultExpiresIn ? { expiresIn: defaultExpiresIn } : {}),
    ...options,
  };

  return jwt.sign(payload, secret, signOptions);
}

/**
 * Verifies a JWT against the configured JWT_SECRET and validates payload claims.
 *
 * Runtime validation ensures:
 * - Decoded payload is a non-null object
 * - `userId`, `email`, `roleId`, and `roleCode` are non-empty strings
 * - If `status` is present, it is a valid UserStatus enum value
 *
 * @param token The JWT string to verify
 * @param options Optional jsonwebtoken VerifyOptions
 * @returns Decoded and validated token payload
 * @throws JsonWebTokenError if signature, format, or payload claims are invalid
 * @throws TokenExpiredError if token has expired
 * @throws NotBeforeError if token is not active yet
 * @throws Error if JWT_SECRET is not configured
 */
export function verifyToken(
  token: string,
  options?: VerifyOptions
): DecodedToken {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret, options);

  validateDecodedPayload(decoded);

  return decoded;
}

// Re-export common jsonwebtoken types and error classes for consumer convenience
export { JsonWebTokenError, TokenExpiredError, NotBeforeError };
export type { SignOptions, VerifyOptions };
