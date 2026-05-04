import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { user } from '../../lib/schema';
import { clearSessionCookie, verifyPassword } from '../../lib/auth';
import { error, ok, readJson, withSetCookie } from '../../lib/response';

const Body = z.object({
  password: z.string().min(1).max(200),
});

export const onRequestDelete: PagesFunction<Env, string, AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const parsed = await readJson(ctx.request, Body);
  if ('response' in parsed) return parsed.response;
  const { password } = parsed.data;

  const db = getDb(ctx.env);
  const row = await db.select().from(user).where(eq(user.id, ctx.data.user.id)).get();
  if (!row || !verifyPassword(password, row.passwordHash)) {
    return error(401, 'invalid_password');
  }
  await db.delete(user).where(eq(user.id, row.id));
  return withSetCookie(ok({ ok: true }), clearSessionCookie());
};
