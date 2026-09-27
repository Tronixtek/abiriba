import type { Request, Response } from "express";
import * as payoutsService from "./payouts.service.js";

export async function list(req: Request, res: Response) {
  res.json(await payoutsService.listPayouts(req.user!.tenantId));
}
