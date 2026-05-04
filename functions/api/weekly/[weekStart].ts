import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { weeklyTask } from '../../lib/schema';
import { uuid } from '../../lib/ids';
import { error, ok, readJson } from '../../lib/response';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const PostBody = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  kind: z.enum(['default', 'muted', 'success', 'info']).optional(),
});

export interface WeeklyTaskRow {
  id: string;
  title: string;
  notes: string | null;
  dayOfWeek: number | null;
  kind: 'default' | 'muted' | 'success' | 'info';
}

function rowToApi(row: typeof weeklyTask.$inferSelect): WeeklyTaskRow {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? null,
    dayOfWeek: row.dayOfWeek ?? null,
    kind: (row.kind as WeeklyTaskRow['kind']) ?? 'default',
  };
}

export const onRequestGet: PagesFunction<Env, 'weekStart', AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const weekStart = String(ctx.params.weekStart ?? '');
  if (!ISO.test(weekStart)) return error(400, 'invalid_week_start');

  const db = getDb(ctx.env);
  const rows = await db
    .select()
    .from(weeklyTask)
    .where(and(eq(weeklyTask.userId, ctx.data.user.id), eq(weeklyTask.weekStart, weekStart)))
    .all();

  const pool: WeeklyTaskRow[] = [];
  const days: { dayOfWeek: number; tasks: WeeklyTaskRow[] }[] = Array.from(
    { length: 7 },
    (_, i) => ({ dayOfWeek: i, tasks: [] }),
  );
  for (const r of rows) {
    const api = rowToApi(r);
    if (api.dayOfWeek == null) pool.push(api);
    else days[api.dayOfWeek]?.tasks.push(api);
  }

  return ok({ weekStart, pool, days });
};

export const onRequestPost: PagesFunction<Env, 'weekStart', AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const weekStart = String(ctx.params.weekStart ?? '');
  if (!ISO.test(weekStart)) return error(400, 'invalid_week_start');

  const parsed = await readJson(ctx.request, PostBody);
  if ('response' in parsed) return parsed.response;

  const db = getDb(ctx.env);
  const id = uuid();
  const now = Date.now();
  await db.insert(weeklyTask).values({
    id,
    userId: ctx.data.user.id,
    weekStart,
    title: parsed.data.title,
    notes: parsed.data.notes ?? null,
    dayOfWeek: parsed.data.dayOfWeek ?? null,
    kind: parsed.data.kind ?? 'default',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  });
  const row = await db.select().from(weeklyTask).where(eq(weeklyTask.id, id)).get();
  return ok(rowToApi(row!));
};
