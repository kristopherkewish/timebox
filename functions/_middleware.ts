import type { Env, AuthData } from './types';
import { getDb } from './lib/db';
import { readSession } from './lib/auth';
import { error } from './lib/response';

const PUBLIC_PATHS = new Set([
  '/api/auth/signup',
  '/api/auth/signin',
  '/api/auth/me',
]);

export const onRequest: PagesFunction<Env, string, AuthData> = async (ctx) => {
  const url = new URL(ctx.request.url);
  if (!url.pathname.startsWith('/api/')) {
    return ctx.next();
  }
  const db = getDb(ctx.env);
  const sessionInfo = await readSession(db, ctx.request).catch(() => null);
  if (sessionInfo) {
    ctx.data.user = sessionInfo.user;
    ctx.data.sessionId = sessionInfo.sessionId;
  }
  if (!sessionInfo && !PUBLIC_PATHS.has(url.pathname)) {
    return error(401, 'unauthorized');
  }
  return ctx.next();
};
