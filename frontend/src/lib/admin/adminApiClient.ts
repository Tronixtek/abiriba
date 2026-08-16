import { ApiError } from "@/lib/apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// Deliberately separate module-level state from lib/apiClient.ts — an
// admin session and a tenant session must never be able to clobber each
// other's access token if both were ever active in the same browser tab.
let accessToken: string | null = null;
let onAuthExpired: (() => void) | null = null;

export function setAdminAccessToken(token: string | null) {
  accessToken = token;
}

export function setOnAdminAuthExpired(handler: () => void) {
  onAuthExpired = handler;
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_BASE_URL}/admin/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = await res.json();
  accessToken = data.accessToken;
  return data.accessToken;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; retry?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, retry = true } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && path !== "/admin/auth/refresh") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, { method, body, retry: false });
    }
    onAuthExpired?.();
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const adminApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
};
