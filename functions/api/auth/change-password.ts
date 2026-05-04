import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { user } from '../../lib/schema';
import { deleteOtherSessions, hashPassword, verifyPassword } from '../../lib/auth';
import { error, ok, readJson } from '../../lib/response';

const Body = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z
    .string()
    .min(8)
    .max(200)
    .regex(/[a-z]/, 'must contain a lowercase letter')
    .regex(/[A-Z]/, 'must contain an uppercase letter')
    .regex(/[0-9]/, 'must contain a digit'),
});

export const onRequestPost: PagesFunction<Env, string, AuthData> = async (ctx) => {
  if (!ctx.data.user || !ctx.data.sessionId) return error(401, 'unauthorized');
  const parsed = await readJson(ctx.request, Body);
  if ('response' in parsed) return parsed.response;
  const { currentPassword, newPassword } = parsed.data;

  const db = getDb(ctx.env);
  const row = await db.select().from(user).where(eq(user.id, ctx.data.user.id)).get();
  if (!row || !verifyPassword(currentPassword, row.passwordHash)) {
    return error(401, 'invalid_password');
  }
  const newHash = hashPassword(newPassword);
  await db.update(user).set({ passwordHash: newHash }).where(eq(user.id, row.id));
  await deleteOtherSessions(db, row.id, ctx.data.sessionId);
  return ok({ ok: true });
};
