import { env } from "../config/env.js";
import { AppError } from "./AppError.js";

// SafeHaven MFB API client. The quirks handled below were confirmed live
// against this same production account by an earlier integration — they
// aren't in SafeHaven's public docs.

interface TokenResponse {
  access_token?: string;
  // NOT the client_id we sent — a session-scoped id SafeHaven expects back
  // as the ClientID header on every subsequent call.
  client_id?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
  message?: string;
}

let cachedToken: { accessToken: string; clientId: string; expiresAt: number } | null = null;

async function getAccessToken() {
  // 30s margin so a token can't expire mid-request.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken;

  const res = await fetch(`${env.SAFE_HAVEN_BASE_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.SAFE_HAVEN_CLIENT_ID,
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: env.SAFE_HAVEN_CLIENT_ASSERTION,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  // A rejected assertion can come back as HTTP 201 with an `error` body, so
  // res.ok alone isn't enough.
  if (!res.ok || body.error || !body.access_token || !body.client_id) {
    console.error("SafeHaven auth failed", res.status, body.error_description || body.message || body.error);
    throw new AppError(502, "The payment provider is unavailable right now. Please try again shortly.");
  }
  cachedToken = {
    accessToken: body.access_token,
    clientId: body.client_id,
    expiresAt: Date.now() + (body.expires_in ?? 0) * 1000,
  };
  return cachedToken;
}

interface Envelope<T> {
  statusCode?: number;
  message?: string;
  data?: T;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { accessToken, clientId } = await getAccessToken();
  const res = await fetch(`${env.SAFE_HAVEN_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ClientID: clientId,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (res.status === 401) cachedToken = null;
  const body = (await res.json().catch(() => ({}))) as Envelope<T>;
  // Logical failures ("Client not found", "Security violation", ...) come
  // back as HTTP 200/201 with statusCode >= 400 inside the body.
  if (!res.ok || (body.statusCode !== undefined && body.statusCode >= 400) || body.data === undefined) {
    throw new AppError(400, body.message || `Payment provider request failed (${res.status}).`);
  }
  return body.data;
}

export interface Bank {
  code: string;
  name: string;
}

export async function listBanks(): Promise<Bank[]> {
  const banks = await call<{ name: string; bankCode: string }[]>("/transfers/banks");
  return banks.map((b) => ({ code: b.bankCode, name: b.name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function nameEnquiry(input: { bankCode: string; accountNumber: string }) {
  return call<{ accountName: string; sessionId: string }>("/transfers/name-enquiry", {
    method: "POST",
    body: JSON.stringify({ bankCode: input.bankCode, accountNumber: input.accountNumber }),
  });
}

export interface VirtualAccount {
  _id: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  expiryDate?: string;
  status: string;
}

// settlementAccount must be at SafeHaven's own institution — an external
// bank code is rejected ("Invalid settlement bank code") — so collections
// always land in the platform account, and vendors are paid out separately.
export function createVirtualAccount(input: { amount: number; callbackUrl: string; validForSeconds: number }) {
  return call<VirtualAccount>("/virtual-accounts/", {
    method: "POST",
    body: JSON.stringify({
      validFor: input.validForSeconds,
      callbackUrl: input.callbackUrl,
      amountControl: "Fixed",
      amount: input.amount,
      settlementAccount: {
        bankCode: env.SAFE_HAVEN_PLATFORM_BANK_CODE,
        accountNumber: env.SAFE_HAVEN_PLATFORM_ACCOUNT_NUMBER,
      },
    }),
  });
}

export interface VirtualAccountTransaction {
  _id: string;
  amount: number;
  fees: number;
  status: string;
}

// The independent "did this virtual account actually get paid" check. A 400
// with an empty body is the normal "nothing paid yet" answer, so every
// failure resolves to null — fails closed, never read as paid.
export async function getVirtualAccountTransaction(virtualAccountId: string): Promise<VirtualAccountTransaction | null> {
  try {
    return await call<VirtualAccountTransaction>(`/virtual-accounts/${encodeURIComponent(virtualAccountId)}/transaction`);
  } catch (err) {
    if (!(err instanceof AppError && err.status === 400)) {
      console.error("SafeHaven transaction check failed", virtualAccountId, err);
    }
    return null;
  }
}

export interface TransferResult {
  sessionId: string;
  status: string;
  amount: number;
  fees: number;
}

export function transfer(input: {
  nameEnquiryReference: string;
  debitAccountNumber: string;
  beneficiaryBankCode: string;
  beneficiaryAccountNumber: string;
  narration: string;
  amount: number;
  paymentReference: string;
}) {
  return call<TransferResult>("/transfers", {
    method: "POST",
    body: JSON.stringify({ ...input, saveBeneficiary: false }),
  });
}
