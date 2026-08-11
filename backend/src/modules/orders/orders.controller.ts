import type { Request, Response } from "express";
import { z } from "zod";
import * as ordersService from "./orders.service.js";
import { requireParam } from "../../utils/params.js";

export async function list(req: Request, res: Response) {
  res.json(await ordersService.listOrders(req.user!.tenantId));
}

export async function get(req: Request, res: Response) {
  res.json(await ordersService.getOrder(req.user!.tenantId, requireParam(req, "id")));
}

const createSchema = z.object({
  customerId: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function create(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  const order = await ordersService.createOrder({
    tenantId: req.user!.tenantId,
    createdById: req.user!.userId,
    ...body,
  });
  res.status(201).json(order);
}

const paySchema = z.object({
  method: z.enum(["CASH", "CARD", "TRANSFER"]),
});

export async function pay(req: Request, res: Response) {
  const body = paySchema.parse(req.body);
  const order = await ordersService.payOrder({
    tenantId: req.user!.tenantId,
    orderId: requireParam(req, "id"),
    userId: req.user!.userId,
    method: body.method,
  });
  res.json(order);
}

const voidSchema = z.object({
  reason: z.string().trim().min(1),
});

export async function voidOrder(req: Request, res: Response) {
  const body = voidSchema.parse(req.body);
  const order = await ordersService.voidOrder({
    tenantId: req.user!.tenantId,
    orderId: requireParam(req, "id"),
    userId: req.user!.userId,
    reason: body.reason,
  });
  res.json(order);
}
