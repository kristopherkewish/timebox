import { z } from 'zod';
import { eq, or } from 'drizzle-orm';
import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { user } from '../../lib/schema';
import { createSession, createUser } from '../../lib/auth';
import { error, ok, readJson, withSetCookie } from '../../lib/response';

const Body = z.object({
  email: z.string().email().max(255),
  username: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'username may contain letters, digits, _, . or -'),
  password: z
    .string()
    .min(8)
    .max(200)
    .regex(/[a-z]/, 'must contain a lowercase letter')
    .regex(/[A-Z]/, 'must contain an uppercase letter')
    .regex(/[0-9]/, 'must contain a digit'),
  rememberMe: z.boolean().optional().default(false),
});

export const onRequestPost: PagesFunction<Env, string, AuthData> = async (ctx) => {
  const parsed = await readJson(ctx.request, Body);
  if ('response' in parsed) return parsed.response;
  const { email, username, password, rememberMe } = parsed.data;

  const db = getDb(ctx.env);
  const conflict = await db
    .select({ email: user.email, username: user.username })
    .from(user)
    .where(or(eq(user.email, email), eq(user.username, username)))
    .get();
  if (conflict) {
    const field = conflict.email === email ? 'email' : 'username';
    return error(409, `${field}_taken`);
  }

  const created = await createUser(ctx.env, { email, username, password });
  const session = await createSession(db, created.id, rememberMe ?? false);
  return withSetCookie(ok({ user: created }), session.cookie);
};
