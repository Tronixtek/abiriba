import type { Request, Response } from "express";
import { z } from "zod";
import * as tenantService from "./tenant.service.js";

export async function getSettings(req: Request, res: Response) {
  res.json(await tenantService.getMarketplaceSettings(req.user!.tenantId));
}

const updateSchema = z.object({
  marketplaceEnabled: z.boolean(),
  country: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  lga: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  street: z.string().trim().min(1).optional(),
  streetNumber: z.string().trim().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function updateSettings(req: Request, res: Response) {
  const body = updateSchema.parse(req.body);
  const settings = await tenantService.updateMarketplaceSettings({
    tenantId: req.user!.tenantId,
    ...body,
  });
  res.json(settings);
}
