import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import * as payoutsController from "./payouts.controller.js";

export const payoutsRouter = Router();

payoutsRouter.use(authenticate);
payoutsRouter.use(authorize("OWNER", "MANAGER"));
payoutsRouter.get("/", payoutsController.list);
