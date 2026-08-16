import type { Request, Response } from "express";
import { z } from "zod";
import * as publicService from "./public.service.js";
import { requireParam } from "../../utils/params.js";

export async function storefront(req: Request, res: Response) {
  res.json(await publicService.getStorefront(requireParam(req, "slug")));
}

export async function platformStats(_req: Request, res: Response) {
  res.json(await publicService.getPlatformStats());
}

export async function marketplaceCities(_req: Request, res: Response) {
  res.json(await publicService.listMarketplaceCities());
}

function parseCoordinate(raw: unknown): number | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function marketplaceSearch(req: Request, res: Response) {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  const city = typeof req.query.city === "string" && req.query.city.trim() ? req.query.city : undefined;
  const lat = parseCoordinate(req.query.lat);
  const lng = parseCoordinate(req.query.lng);
  res.json(await publicService.searchMarketplace({ query, city, lat, lng }));
}

export async function getOrder(req: Request, res: Response) {
  res.json(
    await publicService.getPublicOrder({
      slug: requireParam(req, "slug"),
      orderId: requireParam(req, "orderId"),
    })
  );
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
    slug: requireParam(req, "slug"),
    items: body.items,
    customerName: body.customerName,
    customerEmail: body.customerEmail || undefined,
    customerPhone: body.customerPhone || undefined,
  });
  res.status(201).json(order);
}
