export class ApiError extends Error {
  status: number;
  details: unknown;
  code: string;
  constructor(status: number, code: string, details?: unknown) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, { ...init, headers, credentials: 'include' });
  const contentType = res.headers.get('Content-Type') ?? '';
  const body: unknown = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    const error = body as { error?: string; details?: unknown } | null;
    throw new ApiError(res.status, error?.error ?? 'http_error', error?.details);
  }
  return body as T;
}
