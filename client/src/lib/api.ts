export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "include",
    headers: body instanceof FormData ? {} : { "Content-Type": "application/json" },
  };

  if (body !== undefined) {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(url, init);

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
