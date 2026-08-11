import type { Request, Response } from "express";
import { z } from "zod";
import * as authService from "./auth.service.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import { AppError } from "../../utils/AppError.js";
import { env } from "../../config/env.js";

const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/auth",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

function issueTokens(res: Response, claims: { userId: string; tenantId: string; role: "OWNER" | "MANAGER" | "STAFF" }) {
  const accessToken = signAccessToken(claims);
  const refreshToken = signRefreshToken(claims);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
}

const signupSchema = z.object({
  businessName: z.string().trim().min(1),
  ownerName: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export async function signup(req: Request, res: Response) {
  const body = signupSchema.parse(req.body);
  const { tenant, user } = await authService.signupBusiness(body);
  const accessToken = issueTokens(res, { userId: user.id, tenantId: tenant.id, role: user.role });
  res.status(201).json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: tenant.id },
  });
}

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const user = await authService.login(body.email, body.password);
  const accessToken = issueTokens(res, { userId: user.id, tenantId: user.tenantId, role: user.role });
  res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    throw new AppError(401, "No refresh token.");
  }
  let claims;
  try {
    claims = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, "Invalid or expired refresh token.");
  }
  const user = await authService.getUserById(claims.userId);
  const accessToken = issueTokens(res, { userId: user.id, tenantId: user.tenantId, role: user.role });
  res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
  });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
  res.status(204).send();
}
