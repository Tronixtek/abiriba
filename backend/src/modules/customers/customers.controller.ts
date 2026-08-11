import type { Request, Response } from "express";
import { z } from "zod";
import * as customersService from "./customers.service.js";

export async function list(req: Request, res: Response) {
  res.json(await customersService.listCustomers(req.user!.tenantId));
}

const createSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
});

export async function create(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  const customer = await customersService.createCustomer({
    tenantId: req.user!.tenantId,
    name: body.name,
    email: body.email || undefined,
    phone: body.phone || undefined,
  });
  res.status(201).json(customer);
}
