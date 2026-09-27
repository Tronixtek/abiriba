import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  ADMIN_JWT_ACCESS_SECRET: z.string().min(16),
  ADMIN_JWT_REFRESH_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Shop Record <no-reply@example.com>"),
  GOOGLE_API_KEY: z.string().min(1),
  SAFE_HAVEN_BASE_URL: z.string().url().default("https://api.safehavenmfb.com"),
  SAFE_HAVEN_CLIENT_ID: z.string().min(1),
  SAFE_HAVEN_CLIENT_ASSERTION: z.string().min(1),
  SAFE_HAVEN_PLATFORM_ACCOUNT_NUMBER: z.string().min(1),
  SAFE_HAVEN_PLATFORM_BANK_CODE: z.string().min(1),
  // Public base URL of this API — SafeHaven's webhook callbackUrl is built
  // from it, and must be https.
  BACKEND_PUBLIC_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
