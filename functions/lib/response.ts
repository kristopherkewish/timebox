import { z } from 'zod';

export function ok(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function withSetCookie(res: Response, cookie: string): Response {
  const headers = new Headers(res.headers);
  headers.append('Set-Cookie', cookie);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export function error(status: number, message: string, details?: unknown): Response {
  return ok({ error: message, details }, { status });
}

export async function readJson<T>(req: Request, schema: z.ZodSchema<T>): Promise<{ data: T } | { response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { response: error(400, 'invalid_json') };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { response: error(400, 'invalid_body', result.error.flatten()) };
  }
  return { data: result.data };
}
