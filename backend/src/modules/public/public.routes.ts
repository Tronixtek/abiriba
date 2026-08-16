import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as publicController from "./public.controller.js";

export const publicRouter = Router();

// The only write endpoint in the app reachable without authentication —
// needs its own abuse guard since there's no staff session to rely on.
const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Generous but bounded — read-only search, just throttles scraping.
const marketplaceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

publicRouter.get("/stats", publicController.platformStats);
// Fixed literal paths must be registered before the "/:slug/..." routes
// below, so Express doesn't try to match "marketplace" as a slug.
publicRouter.get("/marketplace/cities", marketplaceLimiter, publicController.marketplaceCities);
publicRouter.get("/marketplace/search", marketplaceLimiter, publicController.marketplaceSearch);
publicRouter.get("/:slug/storefront", publicController.storefront);
publicRouter.get("/:slug/orders/:orderId", publicController.getOrder);
publicRouter.post("/:slug/orders", createOrderLimiter, publicController.createOrder);
