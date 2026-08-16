import type { NextFunction, Request, Response } from "express";
import { verifyAdminAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";

export function authenticateAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid Authorization header.");
  }
  try {
    req.admin = verifyAdminAccessToken(header.slice("Bearer ".length));
    next();
  } catch {
    throw new AppError(401, "Invalid or expired access token.");
  }
}
