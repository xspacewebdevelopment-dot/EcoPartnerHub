import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

const JWT_SECRET =
  process.env.JWT_SECRET || "ecom_partner_hub_super_secret_jwt_key_2026_default";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  tokenVersion: number;
}

/**
 * Signs a JWT token containing userId, email, role, and tokenVersion.
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verifies a JWT token and returns the decoded payload, or null if invalid/expired.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}
