import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as adminAuthController from "./admin-auth.controller.js";

export const adminAuthRouter = Router();

// No signup route exists here, ever — the only way to create an AdminUser
// is the local `scripts/create-admin.ts` CLI. Login is rate-limited since
// it's the highest-privilege credential check in the app.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

adminAuthRouter.post("/login", loginLimiter, adminAuthController.login);
adminAuthRouter.post("/refresh", adminAuthController.refresh);
adminAuthRouter.post("/logout", adminAuthController.logout);
