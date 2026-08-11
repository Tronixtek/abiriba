import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid Authorization header.");
  }
  try {
    req.user = verifyAccessToken(header.slice("Bearer ".length));
    next();
  } catch {
    throw new AppError(401, "Invalid or expired access token.");
  }
}
