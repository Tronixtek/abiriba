import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { publicRouter } from "./modules/public/public.routes.js";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { tenantRouter } from "./modules/tenant/tenant.routes.js";
import { adminAuthRouter } from "./modules/admin/auth/admin-auth.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { UPLOADS_DIR } from "./utils/upload.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Publicly readable — product photos are meant to be seen by customers on
// the storefront, same trust level as the rest of the public storefront data.
app.use("/uploads", express.static(UPLOADS_DIR));

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/products", productsRouter);
app.use("/customers", customersRouter);
app.use("/orders", ordersRouter);
app.use("/reports", reportsRouter);
app.use("/audit", auditRouter);
app.use("/public", publicRouter);
app.use("/ai", aiRouter);
app.use("/tenant", tenantRouter);
app.use("/admin/auth", adminAuthRouter);
app.use("/admin", adminRouter);

app.use(errorHandler);
