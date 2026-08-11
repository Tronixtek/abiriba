import type { Request, Response } from "express";
import { z } from "zod";
import * as reportsService from "./reports.service.js";

const querySchema = z.object({
  range: z.enum(["day", "week", "month"]),
  date: z.string().optional(),
});

export async function getSales(req: Request, res: Response) {
  const query = querySchema.parse(req.query);
  const report = await reportsService.getSalesReport({ tenantId: req.user!.tenantId, ...query });
  res.json(report);
}
