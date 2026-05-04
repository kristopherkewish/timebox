import { z } from 'zod';
import { eq, or } from 'drizzle-orm';
import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { user } from '../../lib/schema';
import { createSession, verifyPassword } from '../../lib/auth';
import { error, ok, readJson, withSetCookie } from '../../lib/response';

const Body = z.object({
  usernameOrEmail: z.string().min(1).max(255),
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional().default(false),
});

export const onRequestPost: PagesFunction<Env, string, AuthData> = async (ctx) => {
  const parsed = await readJson(ctx.request, Body);
  if ('response' in parsed) return parsed.response;
  const { usernameOrEmail, password, rememberMe } = parsed.data;

  const db = getDb(ctx.env);
  const found = await db
    .select()
    .from(user)
    .where(or(eq(user.username, usernameOrEmail), eq(user.email, usernameOrEmail)))
    .get();
  if (!found || !verifyPassword(password, found.passwordHash)) {
    return error(401, 'invalid_credentials');
  }
  const session = await createSession(db, found.id, rememberMe ?? false);
  return withSetCookie(
    ok({ user: { id: found.id, email: found.email, username: found.username } }),
    session.cookie,
  );
};
