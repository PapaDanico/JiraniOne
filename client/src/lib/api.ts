export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

// On a dead or badly degraded connection (common on Kenyan 3G), fetch()
// doesn't reject quickly — it can hang for tens of seconds waiting on TCP
// retries before ever surfacing a network error. Without a bound, callers
// that treat "the request never left the device" as a signal (e.g. the
// maintenance form's offline-draft fallback) would never see it. 20s is
// generous enough for a multi-photo upload on 3G, but not unbounded.
const REQUEST_TIMEOUT_MS = 20_000;

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const init: RequestInit = {
    method,
    credentials: "include",
    signal: controller.signal,
    headers: body instanceof FormData ? {} : { "Content-Type": "application/json" },
  };

  if (body !== undefined) {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, err.error ?? "Request failed", err.details);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<{ data: T }>("GET", url),
  post: <T>(url: string, body?: unknown) => request<{ data: T }>("POST", url, body),
  patch: <T>(url: string, body?: unknown) => request<{ data: T }>("PATCH", url, body),
  delete: <T>(url: string) => request<{ data: T }>("DELETE", url),
  upload: <T>(url: string, formData: FormData) => request<{ data: T }>("POST", url, formData),
};
