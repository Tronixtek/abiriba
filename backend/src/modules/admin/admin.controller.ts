import type { Request, Response } from "express";
import { z } from "zod";
import * as adminService from "./admin.service.js";
import { requireParam } from "../../utils/params.js";
import { AppError } from "../../utils/AppError.js";

export async function stats(_req: Request, res: Response) {
  res.json(await adminService.getPlatformStats());
}

const trendsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

export async function trends(req: Request, res: Response) {
  const result = trendsQuerySchema.safeParse(req.query);
  if (!result.success) {
    throw new AppError(400, "Invalid days parameter (must be 1-90).");
  }
  res.json(await adminService.getGrowthTrends(result.data.days));
}

export async function tenants(_req: Request, res: Response) {
  res.json(await adminService.listTenants());
}

export async function tenantDetail(req: Request, res: Response) {
  res.json(await adminService.getTenantDetail(requireParam(req, "id")));
}
