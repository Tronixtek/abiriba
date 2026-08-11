import type { Request, Response } from "express";
import { z } from "zod";
import * as publicService from "./public.service.js";
import { requireParam } from "../../utils/params.js";

export async function storefront(req: Request, res: Response) {
  res.json(await publicService.getStorefront(requireParam(req, "tenantId")));
}

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  customerPhone: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().positive().max(999),
      })
    )
    .min(1)
    .max(20),
});

export async function createOrder(req: Request, res: Response) {
  const body = createOrderSchema.parse(req.body);
  const order = await publicService.createPublicOrder({
    tenantId: requireParam(req, "tenantId"),
    items: body.items,
    customerName: body.customerName,
    customerEmail: body.customerEmail || undefined,
    customerPhone: body.customerPhone || undefined,
  });
  res.status(201).json(order);
}
