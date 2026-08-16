import type { Request, Response } from "express";
import { z } from "zod";
import * as productsService from "./products.service.js";
import { requireParam } from "../../utils/params.js";
import { AppError } from "../../utils/AppError.js";

export async function list(req: Request, res: Response) {
  res.json(await productsService.listProducts(req.user!.tenantId));
}

export async function lowStock(req: Request, res: Response) {
  res.json(await productsService.getLowStockProducts(req.user!.tenantId));
}

const createSchema = z.object({
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().default(5),
});

export async function create(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  const product = await productsService.createProduct({ tenantId: req.user!.tenantId, ...body });
  res.status(201).json(product);
}

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  price: z.number().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export async function update(req: Request, res: Response) {
  const body = updateSchema.parse(req.body);
  const product = await productsService.updateProduct({
    tenantId: req.user!.tenantId,
    productId: requireParam(req, "id"),
    ...body,
  });
  res.json(product);
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError(400, "No image file provided.");
  }
  const productId = requireParam(req, "id");
  const url = `/uploads/products/${req.user!.tenantId}/${req.file.filename}`;
  const product = await productsService.addProductImage({
    tenantId: req.user!.tenantId,
    productId,
    url,
  });
  res.json(product);
}

export async function deleteImage(req: Request, res: Response) {
  const product = await productsService.deleteProductImage({
    tenantId: req.user!.tenantId,
    productId: requireParam(req, "id"),
    imageId: requireParam(req, "imageId"),
  });
  res.json(product);
}

const adjustStockSchema = z.object({
  delta: z.number().int().refine((n) => n !== 0, "delta must be non-zero"),
  reason: z.enum(["RESTOCK", "MANUAL_CORRECTION"]),
  note: z.string().trim().optional(),
});

export async function adjustStock(req: Request, res: Response) {
  const body = adjustStockSchema.parse(req.body);
  const product = await productsService.adjustStock({
    tenantId: req.user!.tenantId,
    userId: req.user!.userId,
    productId: requireParam(req, "id"),
    ...body,
  });
  res.json(product);
}
