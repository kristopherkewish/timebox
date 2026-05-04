import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { monthlyTask } from '../../lib/schema';
import { uuid } from '../../lib/ids';
import { error, ok, readJson } from '../../lib/response';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const PostBody = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).nullable().optional(),
  weekIndex: z.number().int().min(0).max(5).nullable().optional(),
  kind: z.enum(['default', 'muted', 'success', 'info']).optional(),
});

export interface MonthlyTaskRow {
  id: string;
  title: string;
  notes: string | null;
  weekIndex: number | null;
  kind: 'default' | 'muted' | 'success' | 'info';
}

function rowToApi(row: typeof monthlyTask.$inferSelect): MonthlyTaskRow {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? null,
    weekIndex: row.weekIndex ?? null,
    kind: (row.kind as MonthlyTaskRow['kind']) ?? 'default',
  };
}

export const onRequestGet: PagesFunction<Env, 'monthStart', AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const monthStart = String(ctx.params.monthStart ?? '');
  if (!ISO.test(monthStart) || !monthStart.endsWith('-01')) return error(400, 'invalid_month_start');

  const db = getDb(ctx.env);
  const rows = await db
    .select()
    .from(monthlyTask)
    .where(and(eq(monthlyTask.userId, ctx.data.user.id), eq(monthlyTask.monthStart, monthStart)))
    .all();

  const pool: MonthlyTaskRow[] = [];
  const byWeek: Record<number, MonthlyTaskRow[]> = {};
  for (const r of rows) {
    const api = rowToApi(r);
    if (api.weekIndex == null) pool.push(api);
    else (byWeek[api.weekIndex] ??= []).push(api);
  }

  return ok({ monthStart, pool, byWeek });
};

export const onRequestPost: PagesFunction<Env, 'monthStart', AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const monthStart = String(ctx.params.monthStart ?? '');
  if (!ISO.test(monthStart) || !monthStart.endsWith('-01')) return error(400, 'invalid_month_start');

  const parsed = await readJson(ctx.request, PostBody);
  if ('response' in parsed) return parsed.response;

  const db = getDb(ctx.env);
  const id = uuid();
  const now = Date.now();
  await db.insert(monthlyTask).values({
    id,
    userId: ctx.data.user.id,
    monthStart,
    title: parsed.data.title,
    notes: parsed.data.notes ?? null,
    weekIndex: parsed.data.weekIndex ?? null,
    kind: parsed.data.kind ?? 'default',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  });
  const row = await db.select().from(monthlyTask).where(eq(monthlyTask.id, id)).get();
  return ok(rowToApi(row!));
};
