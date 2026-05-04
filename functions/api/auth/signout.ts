import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { clearSessionCookie, deleteSession } from '../../lib/auth';
import { ok, withSetCookie } from '../../lib/response';

export const onRequestPost: PagesFunction<Env, string, AuthData> = async (ctx) => {
  const sid = ctx.data.sessionId;
  if (sid) {
    await deleteSession(getDb(ctx.env), sid);
  }
  return withSetCookie(ok({ ok: true }), clearSessionCookie());
};
