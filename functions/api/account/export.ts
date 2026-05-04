import { eq } from 'drizzle-orm';
import type { Env, AuthData } from '../../types';
import { getDb } from '../../lib/db';
import { monthlyTask, timebox, userSettings, weeklyTask } from '../../lib/schema';
import { error } from '../../lib/response';

export const onRequestGet: PagesFunction<Env, string, AuthData> = async (ctx) => {
  if (!ctx.data.user) return error(401, 'unauthorized');
  const db = getDb(ctx.env);
  const userId = ctx.data.user.id;

  const [settings, timeboxes, weekly, monthly] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, userId)).get(),
    db.select().from(timebox).where(eq(timebox.userId, userId)).all(),
    db.select().from(weeklyTask).where(eq(weeklyTask.userId, userId)).all(),
    db.select().from(monthlyTask).where(eq(monthlyTask.userId, userId)).all(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: { id: ctx.data.user.id, email: ctx.data.user.email, username: ctx.data.user.username },
    settings,
    timeboxes,
    weeklyTasks: weekly,
    monthlyTasks: monthly,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="timebox-export.json"',
    },
  });
};
