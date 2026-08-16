import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AdminJwtClaims, JwtClaims } from "../shared/types.js";

export function signAccessToken(claims: JwtClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"] });
}

export function signRefreshToken(claims: JwtClaims): string {
  return jwt.sign(claims, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): JwtClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtClaims;
}

export function verifyRefreshToken(token: string): JwtClaims {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtClaims;
}

/**
 * Signed with a completely separate secret from the tenant-user tokens
 * above, so an admin token can never verify as a tenant token (or vice
 * versa) even if a claims-shape check elsewhere were buggy.
 */
export function signAdminAccessToken(claims: AdminJwtClaims): string {
  return jwt.sign(claims, env.ADMIN_JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function signAdminRefreshToken(claims: AdminJwtClaims): string {
  return jwt.sign(claims, env.ADMIN_JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAdminAccessToken(token: string): AdminJwtClaims {
  return jwt.verify(token, env.ADMIN_JWT_ACCESS_SECRET) as AdminJwtClaims;
}

export function verifyAdminRefreshToken(token: string): AdminJwtClaims {
  return jwt.verify(token, env.ADMIN_JWT_REFRESH_SECRET) as AdminJwtClaims;
}
