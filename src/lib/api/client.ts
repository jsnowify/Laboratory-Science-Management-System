export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly fields?: Record<string, string[]>) {
    super(message);
  }
}

export function apiPath(path: string) {
  const normalized = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  if (!normalized.startsWith("/api/v1/")) throw new Error("Use a versioned LSMS API path");
  return normalized;
}

type QueryValue = string | number | boolean | undefined | null;

export async function apiRequest<T>(path: string, options: {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
} = {}): Promise<T> {
  const url = new URL(apiPath(path), globalThis.location?.origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: "no-store",
  }).catch((cause: unknown) => {
    if (options.signal?.aborted) throw cause;
    throw new ApiError(0, "NETWORK_ERROR", "Cannot connect to LSMS. Check your internet connection, then try again. Your changes have not been confirmed.");
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = typeof data === "object" && data !== null && "error" in data ? data.error : null;
    const detail = typeof error === "object" && error !== null ? error : null;
    const code = detail && "code" in detail && typeof detail.code === "string" ? detail.code : "REQUEST_FAILED";
    const fallback = response.status === 401 ? "Your session has expired. Sign in again to continue."
      : response.status === 403 ? "Your account cannot perform this action. Contact your laboratory administrator if you need access."
      : response.status === 409 ? "This record changed or conflicts with an existing record. Refresh the page and review your details."
      : "LSMS could not complete this request. Try again in a moment. If it continues, contact your laboratory administrator.";
    const message = detail && "message" in detail && typeof detail.message === "string" ? detail.message : fallback;
    const fields = detail && "fields" in detail && typeof detail.fields === "object" && detail.fields !== null
      ? detail.fields as Record<string, string[]> : undefined;
    throw new ApiError(response.status, code, message, fields);
  }
  return data as T;
}
