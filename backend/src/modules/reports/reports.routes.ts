import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import * as reportsController from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.use(authenticate, authorize("OWNER", "MANAGER"));
reportsRouter.get("/sales", reportsController.getSales);
