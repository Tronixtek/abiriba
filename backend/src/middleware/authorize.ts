import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import type { Role } from "../shared/types.js";

/**
 * Single source of truth for the role matrix. Must run after `authenticate`.
 * This is the real security boundary — the frontend hiding nav links for a
 * role is UX only, this middleware is what actually enforces it.
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Not authenticated.");
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, `This action requires one of the following roles: ${roles.join(", ")}.`);
    }
    next();
  };
}
