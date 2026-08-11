import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import * as customersController from "./customers.controller.js";

export const customersRouter = Router();

customersRouter.use(authenticate);
customersRouter.get("/", customersController.list);
customersRouter.post("/", customersController.create);
