import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { AppError } from "./AppError.js";
import { prisma } from "../db/prismaClient.js";

export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const PRODUCTS_DIR = path.join(UPLOADS_DIR, "products");
const RECEIPTS_DIR = path.join(UPLOADS_DIR, "receipts");
export const MAX_PRODUCT_IMAGES = 3;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tenantId = req.user!.tenantId;
    const dir = path.join(PRODUCTS_DIR, tenantId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = EXT_BY_MIME[file.mimetype] ?? ".jpg";
    const random = Math.random().toString(36).slice(2, 8);
    cb(null, `${req.params.id}-${Date.now()}-${random}${ext}`);
  },
});

export const uploadProductImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      cb(new AppError(400, "Image must be JPEG, PNG, or WEBP."));
      return;
    }
    // Gate the count before the file ever touches disk, rather than
    // writing it and rejecting afterward.
    prisma.productImage
      .count({ where: { productId: req.params.id as string } })
      .then((count) => {
        if (count >= MAX_PRODUCT_IMAGES) {
          cb(new AppError(400, `A product can have at most ${MAX_PRODUCT_IMAGES} photos.`));
        } else {
          cb(null, true);
        }
      })
      .catch((err: unknown) => cb(err as Error));
  },
}).single("image");

const receiptStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tenantId = req.user!.tenantId;
    const dir = path.join(RECEIPTS_DIR, tenantId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = EXT_BY_MIME[file.mimetype] ?? ".jpg";
    const random = Math.random().toString(36).slice(2, 8);
    cb(null, `${Date.now()}-${random}${ext}`);
  },
});

export const uploadReceiptImage = multer({
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      cb(new AppError(400, "Image must be JPEG, PNG, or WEBP."));
      return;
    }
    cb(null, true);
  },
}).single("image");
