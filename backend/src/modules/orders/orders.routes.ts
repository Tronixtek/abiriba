import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import * as ordersController from "./orders.controller.js";

export const ordersRouter = Router();

ordersRouter.use(authenticate);
ordersRouter.get("/", ordersController.list);
ordersRouter.get("/:id", ordersController.get);
ordersRouter.post("/", ordersController.create);
ordersRouter.post("/:id/pay", ordersController.pay);
ordersRouter.post("/:id/void", authorize("OWNER", "MANAGER"), ordersController.voidOrder);
