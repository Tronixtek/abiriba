import type { Request, Response } from "express";
import { z } from "zod";
import * as reportsService from "./reports.service.js";
import { AppError } from "../../utils/AppError.js";

const querySchema = z.object({
  range: z.enum(["day", "week", "month"]),
  date: z.string().optional(),
});

export async function getSales(req: Request, res: Response) {
  const query = querySchema.parse(req.query);
  const report = await reportsService.getSalesReport({ tenantId: req.user!.tenantId, ...query });
  res.json(report);
}

const trendsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

export async function getSalesTrends(req: Request, res: Response) {
  const result = trendsQuerySchema.safeParse(req.query);
  if (!result.success) {
    throw new AppError(400, "Invalid days parameter (must be 1-90).");
  }
  const trends = await reportsService.getSalesTrends({ tenantId: req.user!.tenantId, days: result.data.days });
  res.json(trends);
}
