import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { uploadProductImage } from "../../utils/upload.js";
import * as productsController from "./products.controller.js";

export const productsRouter = Router();

productsRouter.use(authenticate);
productsRouter.get("/", productsController.list);
productsRouter.get("/low-stock", authorize("OWNER", "MANAGER"), productsController.lowStock);
productsRouter.post("/", authorize("OWNER", "MANAGER"), productsController.create);
productsRouter.patch("/:id", authorize("OWNER", "MANAGER"), productsController.update);
productsRouter.post("/:id/adjust-stock", authorize("OWNER", "MANAGER"), productsController.adjustStock);
productsRouter.post("/:id/images", authorize("OWNER", "MANAGER"), uploadProductImage, productsController.uploadImage);
productsRouter.delete("/:id/images/:imageId", authorize("OWNER", "MANAGER"), productsController.deleteImage);
