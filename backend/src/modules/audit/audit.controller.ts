import type { Request, Response } from "express";
import * as auditService from "./audit.service.js";

export async function list(req: Request, res: Response) {
  res.json(await auditService.listStockAdjustments(req.user!.tenantId));
}
