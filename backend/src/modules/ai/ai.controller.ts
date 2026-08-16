import type { Request, Response } from "express";
import { z } from "zod";
import * as aiService from "./ai.service.js";
import { requireParam } from "../../utils/params.js";
import { AppError } from "../../utils/AppError.js";

export async function list(req: Request, res: Response) {
  res.json(await aiService.listChatMessages(req.user!.tenantId));
}

const sendSchema = z.object({
  message: z.string().trim().optional(),
});

export async function send(req: Request, res: Response) {
  const body = sendSchema.parse(req.body);
  if (!body.message && !req.file) {
    throw new AppError(400, "Send a message or attach a receipt photo.");
  }
  const assistantMessage = await aiService.sendChatMessage({
    tenantId: req.user!.tenantId,
    userId: req.user!.userId,
    text: body.message,
    imageFile: req.file,
  });
  res.status(201).json(assistantMessage);
}

const applySchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative().optional(),
        include: z.boolean(),
      })
    )
    .min(1),
});

export async function apply(req: Request, res: Response) {
  const body = applySchema.parse(req.body);
  const result = await aiService.applyProposal({
    tenantId: req.user!.tenantId,
    userId: req.user!.userId,
    messageId: requireParam(req, "messageId"),
    items: body.items,
  });
  res.json(result);
}

export async function reject(req: Request, res: Response) {
  const message = await aiService.rejectProposal({
    tenantId: req.user!.tenantId,
    userId: req.user!.userId,
    messageId: requireParam(req, "messageId"),
  });
  res.json(message);
}
