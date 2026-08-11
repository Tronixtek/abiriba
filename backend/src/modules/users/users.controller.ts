import type { Request, Response } from "express";
import { z } from "zod";
import * as usersService from "./users.service.js";

export async function list(req: Request, res: Response) {
  const users = await usersService.listUsers(req.user!.tenantId);
  res.json(users);
}

const createSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(6),
  role: z.enum(["MANAGER", "STAFF"]),
});

export async function create(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  const user = await usersService.createStaffUser({
    tenantId: req.user!.tenantId,
    callerRole: req.user!.role,
    ...body,
  });
  res.status(201).json(user);
}
