import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import * as auditController from "./audit.controller.js";

export const auditRouter = Router();

auditRouter.use(authenticate, authorize("OWNER", "MANAGER"));
auditRouter.get("/stock-adjustments", auditController.list);
