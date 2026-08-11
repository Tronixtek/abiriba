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

publicRouter.get("/:tenantId/storefront", publicController.storefront);
publicRouter.post("/:tenantId/orders", createOrderLimiter, publicController.createOrder);
