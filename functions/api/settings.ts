import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { Env, AuthData } from '../types';
import { getDb } from '../lib/db';
import { userSettings } from '../lib/schema';
import { error, ok, readJson } from '../lib/response';

interface SettingsResponse {
  theme: 'light' | 'dark';
  accent: string;
  defaultIncrementMin: number;
  dayStartMin: number;
  dayEndMin: number;
  allowOverlap: boolean;
  firstDayOfWeek: number;
}

const ACCENTS = [
  'orange', 'amber', 'green', 'teal', 'blue', 'indigo', 'violet', 'rose', 'slate',
] as const;
const INCREMENTS = [5, 10, 15, 30, 60] as const;

const PatchBody = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  accent: z.enum(ACCENTS).optional(),
  defaultIncrementMin: z.number().int().refine(
    (n) => (INCREMENTS as readonly number[]).includes(n),
    { message: 'invalid increment' },
  ).optional(),
  dayStartMin: z.number().int().min(0).max(24 * 60 - 60).optional(),
  dayEndMin: z.number().int().min(60).max(24 * 60).optional(),
  allowOverlap: z.boolean().optional(),
  firstDayOfWeek: z.number().int().min(0).max(6).optional(),
});

function rowToResponse(row: typeof userSettings.$inferSelect): SettingsResponse {
  return {
    theme: row.theme === 'dark' ? 'dark' : 'light',
    accent: row.accent,
    defaultIncrementMin: row.defaultIncrementMin,
    dayStartMin: row.dayStartMin,
    dayEndMin: row.dayEndMin,
    allowOverlap: row.allowOverlap === 1,
    firstDayOfWeek: row.firstDayOfWeek,
  };
}

export const onRequestGet: PagesFunction<Env, string, AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const db = getDb(ctx.env);
  let row = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, ctx.data.user.id))
    .get();
  if (!row) {
    await db.insert(userSettings).values({ userId: ctx.data.user.id });
    row = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.data.user.id))
      .get();
  }
  return ok(rowToResponse(row!));
};

export const onRequestPatch: PagesFunction<Env, string, AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const parsed = await readJson(ctx.request, PatchBody);
  if ('response' in parsed) return parsed.response;

  const updates: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    updates[k === 'allowOverlap' ? 'allowOverlap' : k] =
      typeof v === 'boolean' ? (v ? 1 : 0) : v;
  }

  const db = getDb(ctx.env);
  if (Object.keys(updates).length > 0) {
    const exists = await db
      .select({ userId: userSettings.userId })
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.data.user.id))
      .get();
    if (!exists) {
      await db.insert(userSettings).values({ userId: ctx.data.user.id, ...updates });
    } else {
      await db
        .update(userSettings)
        .set(updates)
        .where(eq(userSettings.userId, ctx.data.user.id));
    }
  }

  const row = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, ctx.data.user.id))
    .get();
  return ok(rowToResponse(row!));
};
