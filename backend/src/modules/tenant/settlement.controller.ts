import type { Request, Response } from "express";
import { z } from "zod";
import * as settlementService from "./settlement.service.js";

const accountNumber = z.string().trim().regex(/^\d{10}$/, "Account number must be 10 digits.");

export async function getSettings(req: Request, res: Response) {
  res.json(await settlementService.getSettlementSettings(req.user!.tenantId));
}

export async function listBanks(_req: Request, res: Response) {
  res.json(await settlementService.listSettlementBanks());
}

const verifySchema = z.object({
  bankCode: z.string().trim().min(1),
  accountNumber,
});

export async function verifyAccount(req: Request, res: Response) {
  const body = verifySchema.parse(req.body);
  res.json(await settlementService.verifySettlementAccount(body));
}

const updateSchema = z.object({
  settlementMode: z.enum(["INSTANT", "END_OF_DAY"]),
  bankCode: z.string().trim().min(1).optional(),
  accountNumber: accountNumber.optional(),
});

export async function updateSettings(req: Request, res: Response) {
  const body = updateSchema.parse(req.body);
  res.json(await settlementService.updateSettlementSettings({ tenantId: req.user!.tenantId, ...body }));
}
