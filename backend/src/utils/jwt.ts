import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { JwtClaims } from "../shared/types.js";

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
