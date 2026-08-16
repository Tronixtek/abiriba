export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Product image paths come back as server-relative (e.g. /uploads/...); resolve to an absolute URL for <img src>. */
export function resolveUploadUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${API_BASE_URL}${path}`;
}

let accessToken: string | null = null;
let onAuthExpired: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Called when a refresh attempt fails — lets AuthContext force a sign-out. */
export function setOnAuthExpired(handler: () => void) {
  onAuthExpired = handler;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
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

  const isFormData = body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      // FormData sets its own multipart Content-Type (with boundary) — never override it.
      ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  // /auth/refresh 401ing means there's no valid session — retrying it would
  // just call the same endpoint again for the same result.
  if (res.status === 401 && retry && path !== "/auth/refresh") {
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

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", body: formData }),
};
