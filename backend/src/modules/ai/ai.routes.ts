import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { uploadReceiptImage } from "../../utils/upload.js";
import * as aiController from "./ai.controller.js";

export const aiRouter = Router();

aiRouter.use(authenticate);
aiRouter.use(authorize("OWNER", "MANAGER"));
aiRouter.get("/", aiController.list);
aiRouter.post("/", uploadReceiptImage, aiController.send);
aiRouter.post("/:messageId/apply", aiController.apply);
aiRouter.post("/:messageId/reject", aiController.reject);
