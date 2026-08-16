import type { Request, Response } from "express";
import { z } from "zod";
import * as adminAuthService from "./admin-auth.service.js";
import { signAdminAccessToken, signAdminRefreshToken, verifyAdminRefreshToken } from "../../../utils/jwt.js";
import { AppError } from "../../../utils/AppError.js";
import { env } from "../../../config/env.js";

const REFRESH_COOKIE = "adminRefreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    // See tenant auth.controller.ts for why this must be "none" cross-site in production.
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    path: "/admin",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

function issueTokens(res: Response, claims: { adminId: string }) {
  const accessToken = signAdminAccessToken(claims);
  const refreshToken = signAdminRefreshToken(claims);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
}

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const admin = await adminAuthService.login(body.email, body.password);
  const accessToken = issueTokens(res, { adminId: admin.id });
  res.json({
    accessToken,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    throw new AppError(401, "No refresh token.");
  }
  let claims;
  try {
    claims = verifyAdminRefreshToken(token);
  } catch {
    throw new AppError(401, "Invalid or expired refresh token.");
  }
  const admin = await adminAuthService.getAdminById(claims.adminId);
  const accessToken = issueTokens(res, { adminId: admin.id });
  res.json({
    accessToken,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/admin" });
  res.status(204).send();
}
