import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import * as tenantController from "./tenant.controller.js";
import * as settlementController from "./settlement.controller.js";

export const tenantRouter = Router();

tenantRouter.use(authenticate);
tenantRouter.use(authorize("OWNER", "MANAGER"));
tenantRouter.get("/settings", tenantController.getSettings);
tenantRouter.patch("/settings", tenantController.updateSettings);

tenantRouter.get("/settlement", settlementController.getSettings);
tenantRouter.get("/settlement/banks", settlementController.listBanks);
// Changing where money is paid out to is owner-only — a misused manager
// account must not be able to redirect a vendor's payouts.
tenantRouter.post("/settlement/verify-account", authorize("OWNER"), settlementController.verifyAccount);
tenantRouter.patch("/settlement", authorize("OWNER"), settlementController.updateSettings);
