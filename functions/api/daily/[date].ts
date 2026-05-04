import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { timebox } from '../../lib/schema';
import { uuid } from '../../lib/ids';
import { error, ok, readJson } from '../../lib/response';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DailyResponse {
  date: string;
  inbox: TimeboxRow[];
  timeline: TimeboxRow[];
}

export interface TimeboxRow {
  id: string;
  title: string;
  startMin: number | null;
  durationMin: number;
  notes: string | null;
  completionState: 'upcoming' | 'in-progress' | 'completed' | 'incomplete';
  completionOverridden: 0 | 1;
}

const PostBody = z.object({
  title: z.string().min(1).max(200),
  durationMin: z.number().int().min(1).max(24 * 60),
  startMin: z.number().int().min(0).max(24 * 60).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

function rowToApi(row: typeof timebox.$inferSelect): TimeboxRow {
  return {
    id: row.id,
    title: row.title,
    startMin: row.startMin ?? null,
    durationMin: row.durationMin,
    notes: row.notes ?? null,
    completionState: row.completionState as TimeboxRow['completionState'],
    completionOverridden: (row.completionOverridden ? 1 : 0) as 0 | 1,
  };
}

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const onRequestGet: PagesFunction<Env, 'date', AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const date = String(ctx.params.date ?? '');
  if (!ISO_DATE.test(date)) return error(400, 'invalid_date');

  const db = getDb(ctx.env);
  const userId = ctx.data.user.id;

  // Lazy server-side promotion: any non-overridden 'upcoming' row whose
  // *date* is strictly past gets flipped to 'completed' on read. Idempotent.
  const today = todayLocalISO();
  if (date < today) {
    await db
      .update(timebox)
      .set({ completionState: 'completed', updatedAt: Date.now() })
      .where(
        and(
          eq(timebox.userId, userId),
          eq(timebox.date, date),
          eq(timebox.completionState, 'upcoming'),
          eq(timebox.completionOverridden, 0),
        ),
      );
  }

  const rows = await db
    .select()
    .from(timebox)
    .where(and(eq(timebox.userId, userId), eq(timebox.date, date)))
    .all();

  const inbox: TimeboxRow[] = [];
  const timeline: TimeboxRow[] = [];
  for (const r of rows) {
    (r.startMin == null ? inbox : timeline).push(rowToApi(r));
  }
  inbox.sort((a, b) => a.id.localeCompare(b.id));
  timeline.sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0));

  return ok({ date, inbox, timeline } satisfies DailyResponse);
};

export const onRequestPost: PagesFunction<Env, 'date', AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const date = String(ctx.params.date ?? '');
  if (!ISO_DATE.test(date)) return error(400, 'invalid_date');

  const parsed = await readJson(ctx.request, PostBody);
  if ('response' in parsed) return parsed.response;

  const db = getDb(ctx.env);
  const id = uuid();
  const now = Date.now();
  await db.insert(timebox).values({
    id,
    userId: ctx.data.user.id,
    date,
    title: parsed.data.title,
    startMin: parsed.data.startMin ?? null,
    durationMin: parsed.data.durationMin,
    notes: parsed.data.notes ?? null,
    completionState: 'upcoming',
    completionOverridden: 0,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  });
  const row = await db.select().from(timebox).where(eq(timebox.id, id)).get();
  return ok(rowToApi(row!));
};
