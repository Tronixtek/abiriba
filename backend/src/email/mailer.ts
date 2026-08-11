import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export function getTransport() {
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return cachedTransport;
}
