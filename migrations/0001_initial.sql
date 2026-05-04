-- Timebox initial schema. Generated for Phase 2.
-- Times-of-day are minutes-since-local-midnight. Moments are unix-ms (UTC).
-- The `date`/`week_start`/`month_start` columns are user-local calendar dates.

CREATE TABLE IF NOT EXISTS user (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  expires_at      INTEGER NOT NULL,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_user ON session(user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id                   TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  theme                     TEXT NOT NULL DEFAULT 'light',
  accent                    TEXT NOT NULL DEFAULT 'orange',
  default_increment_min     INTEGER NOT NULL DEFAULT 15,
  day_start_min             INTEGER NOT NULL DEFAULT 360,
  day_end_min               INTEGER NOT NULL DEFAULT 1320,
  allow_overlap             INTEGER NOT NULL DEFAULT 0,
  first_day_of_week         INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS timebox (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  date                     TEXT NOT NULL,
  title                    TEXT NOT NULL,
  start_min                INTEGER,
  duration_min             INTEGER NOT NULL,
  notes                    TEXT,
  completion_state         TEXT NOT NULL DEFAULT 'upcoming',
  completion_overridden    INTEGER NOT NULL DEFAULT 0,
  sort_order               INTEGER NOT NULL DEFAULT 0,
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_timebox_user_date ON timebox(user_id, date);

CREATE TABLE IF NOT EXISTS weekly_task (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  week_start        TEXT NOT NULL,
  day_of_week       INTEGER,
  title             TEXT NOT NULL,
  notes             TEXT,
  kind              TEXT NOT NULL DEFAULT 'default',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_weekly_user_week ON weekly_task(user_id, week_start);

CREATE TABLE IF NOT EXISTS monthly_task (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  month_start       TEXT NOT NULL,
  week_index        INTEGER,
  title             TEXT NOT NULL,
  notes             TEXT,
  kind              TEXT NOT NULL DEFAULT 'default',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_monthly_user_month ON monthly_task(user_id, month_start);
