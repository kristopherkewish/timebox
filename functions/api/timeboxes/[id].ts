import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { timebox } from '../../lib/schema';
import { error, ok, readJson } from '../../lib/response';

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  startMin: z.number().int().min(0).max(24 * 60).nullable().optional(),
  durationMin: z.number().int().min(1).max(24 * 60).optional(),
  notes: z.string().max(5000).nullable().optional(),
  completionState: z.enum(['upcoming', 'in-progress', 'completed', 'incomplete']).optional(),
  completionOverridden: z.boolean().optional(),
});

export const onRequestPatch: PagesFunction<Env, 'id', AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const id = String(ctx.params.id ?? '');
  if (!id) return error(400, 'missing_id');

  const parsed = await readJson(ctx.request, PatchBody);
  if ('response' in parsed) return parsed.response;
  const patch = parsed.data;

  const db = getDb(ctx.env);
  const existing = await db
    .select()
    .from(timebox)
    .where(and(eq(timebox.id, id), eq(timebox.userId, ctx.data.user.id)))
    .get();
  if (!existing) return error(404, 'not_found');

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.startMin !== undefined) updates.startMin = patch.startMin;
  if (patch.durationMin !== undefined) updates.durationMin = patch.durationMin;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.completionState !== undefined) updates.completionState = patch.completionState;
  if (patch.completionOverridden !== undefined)
    updates.completionOverridden = patch.completionOverridden ? 1 : 0;

  await db.update(timebox).set(updates).where(eq(timebox.id, id));
  const row = await db.select().from(timebox).where(eq(timebox.id, id)).get();
  return ok({
    id: row!.id,
    title: row!.title,
    startMin: row!.startMin,
    durationMin: row!.durationMin,
    notes: row!.notes,
    completionState: row!.completionState,
    completionOverridden: row!.completionOverridden ? 1 : 0,
  });
};

export const onRequestDelete: PagesFunction<Env, 'id', AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const id = String(ctx.params.id ?? '');
  if (!id) return error(400, 'missing_id');

  const db = getDb(ctx.env);
  const existing = await db
    .select()
    .from(timebox)
    .where(and(eq(timebox.id, id), eq(timebox.userId, ctx.data.user.id)))
    .get();
  if (!existing) return error(404, 'not_found');

  await db.delete(timebox).where(eq(timebox.id, id));
  return ok({ ok: true });
};
