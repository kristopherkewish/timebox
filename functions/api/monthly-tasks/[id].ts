import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { monthlyTask } from '../../lib/schema';
import { error, ok, readJson } from '../../lib/response';

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).nullable().optional(),
  weekIndex: z.number().int().min(0).max(5).nullable().optional(),
  kind: z.enum(['default', 'muted', 'success', 'info']).optional(),
});

export const onRequestPatch: PagesFunction<Env, 'id', AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const id = String(ctx.params.id ?? '');
  const parsed = await readJson(ctx.request, PatchBody);
  if ('response' in parsed) return parsed.response;

  const db = getDb(ctx.env);
  const existing = await db
    .select()
    .from(monthlyTask)
    .where(and(eq(monthlyTask.id, id), eq(monthlyTask.userId, ctx.data.user.id)))
    .get();
  if (!existing) return error(404, 'not_found');

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) updates[k] = v;
  await db.update(monthlyTask).set(updates).where(eq(monthlyTask.id, id));
  const row = await db.select().from(monthlyTask).where(eq(monthlyTask.id, id)).get();
  return ok({
    id: row!.id,
    title: row!.title,
    notes: row!.notes,
    weekIndex: row!.weekIndex,
    kind: row!.kind,
  });
};

export const onRequestDelete: PagesFunction<Env, 'id', AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const id = String(ctx.params.id ?? '');
  const db = getDb(ctx.env);
  const existing = await db
    .select()
    .from(monthlyTask)
    .where(and(eq(monthlyTask.id, id), eq(monthlyTask.userId, ctx.data.user.id)))
    .get();
  if (!existing) return error(404, 'not_found');
  await db.delete(monthlyTask).where(eq(monthlyTask.id, id));
  return ok({ ok: true });
};
