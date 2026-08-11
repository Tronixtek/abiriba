import { Router } from "express";
import * as authController from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/signup", authController.signup);
authRouter.post("/login", authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
