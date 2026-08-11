import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import * as usersController from "./users.controller.js";

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.get("/", authorize("OWNER", "MANAGER"), usersController.list);
usersRouter.post("/", authorize("OWNER", "MANAGER"), usersController.create);
