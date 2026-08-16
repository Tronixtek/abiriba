import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import * as tenantController from "./tenant.controller.js";

export const tenantRouter = Router();

tenantRouter.use(authenticate);
tenantRouter.use(authorize("OWNER", "MANAGER"));
tenantRouter.get("/settings", tenantController.getSettings);
tenantRouter.patch("/settings", tenantController.updateSettings);
