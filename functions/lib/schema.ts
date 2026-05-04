import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => ({
    byUser: index('idx_session_user').on(t.userId),
  }),
);

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  theme: text('theme').notNull().default('light'),
  accent: text('accent').notNull().default('orange'),
  defaultIncrementMin: integer('default_increment_min').notNull().default(15),
  dayStartMin: integer('day_start_min').notNull().default(360),
  dayEndMin: integer('day_end_min').notNull().default(1320),
  allowOverlap: integer('allow_overlap').notNull().default(0),
  firstDayOfWeek: integer('first_day_of_week').notNull().default(1),
});

export const timebox = sqliteTable(
  'timebox',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    title: text('title').notNull(),
    startMin: integer('start_min'),
    durationMin: integer('duration_min').notNull(),
    notes: text('notes'),
    completionState: text('completion_state').notNull().default('upcoming'),
    completionOverridden: integer('completion_overridden').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    byUserDate: index('idx_timebox_user_date').on(t.userId, t.date),
  }),
);

export const weeklyTask = sqliteTable(
  'weekly_task',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    weekStart: text('week_start').notNull(),
    dayOfWeek: integer('day_of_week'),
    title: text('title').notNull(),
    notes: text('notes'),
    kind: text('kind').notNull().default('default'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    byUserWeek: index('idx_weekly_user_week').on(t.userId, t.weekStart),
  }),
);

export const monthlyTask = sqliteTable(
  'monthly_task',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    monthStart: text('month_start').notNull(),
    weekIndex: integer('week_index'),
    title: text('title').notNull(),
    notes: text('notes'),
    kind: text('kind').notNull().default('default'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    byUserMonth: index('idx_monthly_user_month').on(t.userId, t.monthStart),
  }),
);
