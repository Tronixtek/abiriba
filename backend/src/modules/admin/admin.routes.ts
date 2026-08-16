import { Router } from "express";
import { authenticateAdmin } from "../../middleware/authenticateAdmin.js";
import * as adminController from "./admin.controller.js";

export const adminRouter = Router();

adminRouter.use(authenticateAdmin);
adminRouter.get("/stats", adminController.stats);
adminRouter.get("/stats/trends", adminController.trends);
adminRouter.get("/tenants", adminController.tenants);
adminRouter.get("/tenants/:id", adminController.tenantDetail);
