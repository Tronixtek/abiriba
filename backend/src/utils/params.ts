import type { Request } from "express";
import { AppError } from "./AppError.js";

/** Route params are typed `string | string[]` in Express 5; our routes never use repeated segments. */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(400, `Missing route parameter: ${name}`);
  }
  return value;
}
