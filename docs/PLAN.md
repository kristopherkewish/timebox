# Timebox — Implementation Plan

This is the canonical roadmap. It supersedes any plan files outside the repo. When approach changes or assumptions are revisited, edit this file directly.

## Decisions

These were resolved with the user up front. Don't re-litigate without asking.

1. **Stack: Vite + React (SPA) + Cloudflare Pages + D1.** Direct continuation of the React handoff. Pages Functions (Workers runtime) for the API. Free at personal scale (5GB DB, 100k req/day, unlimited static).
2. **No notifications in v1.** Requirements §6, §6.4, §10.3 are dropped. Web Push + Service Worker scheduling is out of scope.
3. **Full auth per requirements §2.** Username/email + password, Argon2id hashing, cookie sessions, "remember me", change password, delete account.
4. **§11.1 "local storage" reinterpreted.** Server-side D1 per user (since auth + multi-device implies cross-device data). Cross-device follows for free.

## Architecture

### Repo layout

See `README.md` for the layout — single source of truth on directory structure.

### Tech choices

| Concern | Choice | Why |
|---|---|---|
| Build | Vite 5 + React 18 + TypeScript | Fast dev loop, direct fit for the JSX handoff |
| Routing | React Router v6 | Standard SPA routing |
| Server state | TanStack Query v5 | Caching + refetch + optimistic updates for CRUD |
| UI state | React local state + Zustand for cross-cutting | Avoid context-prop-drilling for theme/auth |
| Styling | Plain CSS (port `tokens.css` + `app.css` as-is) | Handoff CSS is production-quality |
| Drag-drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Accessible (keyboard nav per §12.3), supports custom snap modifiers |
| Forms | React Hook Form + Zod | Lightweight validation |
| Backend | Cloudflare Pages Functions (Workers runtime) | Co-located with frontend, free, edge-deployed |
| Database | Cloudflare D1 (SQLite at edge) | Free 5GB, 5M reads/day |
| ORM | Drizzle ORM | TypeScript-first, plays well with D1, lightweight |
| Auth | Cookie sessions, hand-rolled (~150 LOC) | Lucia v3 is good but adds dependency surface; cookies + sessions table is simple enough |
| Password hashing | `@noble/hashes` Argon2id | Pure JS, runs in Workers, matches §12.4 |
| Deployment | Cloudflare Pages via Wrangler | `wrangler pages deploy` |
| Cost | $0/month at personal scale | All within free tiers |

### Data model

All entities scoped to `User`. Foreign keys cascade on user delete (per §2.3).

```sql
CREATE TABLE user (
  id              TEXT PRIMARY KEY,                    -- UUID
  email           TEXT NOT NULL UNIQUE,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,                       -- Argon2id
  created_at      INTEGER NOT NULL                     -- unix ms
);

CREATE TABLE session (
  id              TEXT PRIMARY KEY,                    -- 32-byte random, base64url
  user_id         TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  expires_at      INTEGER NOT NULL,
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_session_user ON session(user_id);

CREATE TABLE user_settings (
  user_id                   TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  theme                     TEXT NOT NULL DEFAULT 'light',     -- 'light' | 'dark'
  accent                    TEXT NOT NULL DEFAULT 'orange',    -- one of 9 presets
  default_increment_min     INTEGER NOT NULL DEFAULT 15,
  day_start_min             INTEGER NOT NULL DEFAULT 360,      -- 6:00 AM
  day_end_min               INTEGER NOT NULL DEFAULT 1320,     -- 10:00 PM
  allow_overlap             INTEGER NOT NULL DEFAULT 0,
  first_day_of_week         INTEGER NOT NULL DEFAULT 1         -- 1=Mon, 0=Sun
);

CREATE TABLE timebox (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  date                     TEXT NOT NULL,             -- 'YYYY-MM-DD' in user's local TZ
  title                    TEXT NOT NULL,
  start_min                INTEGER,                   -- NULL = inbox; non-null = timeline
  duration_min             INTEGER NOT NULL,
  notes                    TEXT,
  completion_state         TEXT NOT NULL DEFAULT 'upcoming',  -- 'upcoming' | 'in-progress' | 'completed' | 'incomplete'
  completion_overridden    INTEGER NOT NULL DEFAULT 0,
  sort_order               INTEGER NOT NULL DEFAULT 0,
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);
CREATE INDEX idx_timebox_user_date ON timebox(user_id, date);

CREATE TABLE weekly_task (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  week_start        TEXT NOT NULL,                    -- 'YYYY-MM-DD'
  day_of_week       INTEGER,                          -- NULL=pool; 0–6
  title             TEXT NOT NULL,
  notes             TEXT,
  kind              TEXT NOT NULL DEFAULT 'default',  -- 'default' | 'muted' | 'success' | 'info'
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE INDEX idx_weekly_user_week ON weekly_task(user_id, week_start);

CREATE TABLE monthly_task (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  month_start       TEXT NOT NULL,                    -- 'YYYY-MM-01'
  week_index        INTEGER,                          -- NULL=pool; 0–5
  title             TEXT NOT NULL,
  notes             TEXT,
  kind              TEXT NOT NULL DEFAULT 'default',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE INDEX idx_monthly_user_month ON monthly_task(user_id, month_start);
```

UUIDs (text) for stable IDs (per §11.2 — sync-ready). Moments stored as unix-ms timestamps (UTC). Times-of-day stored as minutes-since-local-midnight (int) — matches the JSX prototype's data shape and simplifies pixel math.

**Timezone handling (§12.2):** the `date` column is the user's local calendar date; the daily timeline renders in the user's local timezone via `Intl.DateTimeFormat`. `created_at`/`updated_at`/`expires_at` are unix-ms (UTC). The user's plan does not shift across time zones — May 4 stays May 4 wherever they sign in.

### Auth flow

1. **Sign-up** (`POST /api/auth/signup`): receives `{email, username, password}`. Validate password strength (≥8 chars, mixed case, ≥1 number — Zod). Argon2id hash. Insert `user` + default `user_settings`. Create `session`. `Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=...`.
2. **Sign-in** (`POST /api/auth/signin`): receives `{usernameOrEmail, password, rememberMe}`. Verify hash. Create session. `Max-Age = rememberMe ? 30d : session-cookie`.
3. **Sign-out** (`POST /api/auth/signout`): delete session row + clear cookie.
4. **Middleware** (`functions/_middleware.ts`): on every `/api/*` request, read `sid` cookie → look up session → attach `user` to context. Reject if missing/expired. Allowlist: signup, signin, me.
5. **`/api/auth/me`**: returns the current user (or 401). The SPA calls this on load to decide "show shell or sign-in page".
6. **Change password** (`POST /api/auth/change-password`): requires current password; rotates hash; invalidates all other sessions for the user.
7. **Delete account** (`DELETE /api/account/delete`): requires current password; cascades all data via FK.

### Theming

`styles/tokens.css` and `styles/app.css` from the handoff are copied verbatim into `src/styles/`. Two additions:

- `src/styles/fonts.css` declares `@font-face` for Geist + Geist Mono variable fonts at `/fonts/Geist-Variable.woff2` and `/fonts/GeistMono-Variable.woff2` (self-hosted in `public/fonts/`).
- `<html data-theme data-accent>` attributes set by `ThemeProvider` (`src/lib/theme.tsx`). The existing CSS selectors `[data-theme="dark"]` and `[data-accent="blue"]` etc. take care of the rest. Live switch is just an attribute change — no reload.

### Drag-and-drop with dnd-kit

The trickiest interaction. Approach:

- **Timeline** is a `<DndContext>` with a custom `Modifier` that snaps the drag-overlay's Y to the configured increment.
- **Inbox cards** are `<Draggable>` with `data: {type: 'task', id}`.
- **Timebox blocks** are `<Draggable>` (for moving) + separate `<Draggable>` per resize handle.
- **TimelinePanel** is a `<Droppable>`; `onDragOver` computes snapped target time from cursor Y and exposes via context for the drop ghost + drop label.
- Conflict detection runs in `onDragOver`; if conflict + `allowOverlap=false`, ghost goes warn-coloured and drop is rejected in `onDragEnd`.
- Drop **off** the timeline returns the timebox to the inbox (`start_min = NULL`).
- Resize: separate `useDraggable` instances on top/bottom handles. Same snap modifier; different update logic.
- Keyboard equivalent (§12.3): dnd-kit's `KeyboardSensor`. Up/Down arrows move selected block by 1 increment; Shift+Up/Down resizes via custom keyboard handler when block is focused.

### Time math

`src/lib/time.ts` — exact ports from `daily.jsx`:

```ts
export const fmtTime = (mins: number) => { /* exact port */ };
export const fmtTimeShort = (mins: number) => { /* exact port */ };
export const fmtDur = (mins: number) => { /* exact port */ };
```

`src/lib/timeline.ts`:

```ts
export const snapToIncrement = (mins: number, inc: number) => Math.round(mins / inc) * inc;
export const minutesToPx = (mins: number, dayStart: number, hourPx: number) =>
  ((mins - dayStart) / 60) * hourPx;
export const pxToMinutes = (y: number, dayStart: number, hourPx: number, inc: number) =>
  snapToIncrement(dayStart + (y / hourPx) * 60, inc);
export const detectConflict = (
  blocks: Timebox[], start: number, dur: number, excludeId?: string
) => blocks.some(b =>
  b.id !== excludeId && b.startMin != null &&
  start < b.startMin + b.durationMin && start + dur > b.startMin
);
```

`src/lib/completion.ts`:

```ts
export const deriveState = (now: number, block: Timebox): BlockState => {
  if (block.completionOverridden) return block.completionState;
  const start = startOf(block);  const end = start + block.durationMin * 60_000;
  if (now >= end) return 'completed';
  if (now >= start) return 'in-progress';
  return 'upcoming';
};
```

All three modules are pure → unit-tested in `tests/lib/`.

### State reconciliation

§4.1 requires elapsed timeboxes auto-complete even if the app wasn't open. Web equivalent: every page load (and every minute via interval while the daily view is mounted), `useDaily()` recomputes `state` for visible blocks via `deriveState`. For past dates, the server lazily promotes any non-overridden `'upcoming'` block to `'completed'` on first read after the date is past — single `UPDATE` in the `GET /api/daily/[date]` handler. Silent (per §14.5).

---

## Phases

Each phase ends with a runnable, demoable state. Phases are sequential.

Status is tracked in `docs/PROGRESS.md` — update there as work proceeds.

### Phase 1 — Foundation (~3–5 days)

1. Scaffold Vite + React + TS project. Install dependencies.
2. Cloudflare setup: `wrangler.toml` declaring D1 binding (`DB`); user runs `wrangler d1 create timebox-db` and pastes ID.
3. Copy `styles/tokens.css` and `styles/app.css` from the handoff into `src/styles/`. Self-host Geist + Geist Mono variable woff2 in `public/fonts/`. Note: the `geist` npm package is Next-only (imports `next/font/local`) — extract the woff2 files manually and write @font-face declarations.
4. Build `ThemeProvider` (sets `data-theme`/`data-accent` on `<html>`).
5. Port `components/shell.jsx` to real components: `<TitleBar>`, `<Rail>`, `<Header>`. Web title bar drops the simulated min/max/close buttons — keep only the app icon + "Timebox" wordmark.
6. React Router with routes: `/sign-in`, `/sign-up`, `/`, `/week`, `/month`, `/settings`. Auth gate redirects to `/sign-in` for unauthenticated users.
7. Stub API endpoints in `functions/api/` returning hardcoded data shaped per `sample-data.jsx`. Wire `useDaily()`/etc. to TanStack Query.

**End state:** App runs locally via `wrangler pages dev`. Sign-in placeholder shows; navigation works; theme switch works against placeholder data.

### Phase 2 — Auth + persistence (~5–7 days)

1. Initial migration (`migrations/0001_initial.sql`) covering all tables.
2. Drizzle schema in `functions/lib/schema.ts` matching the SQL.
3. `functions/lib/auth.ts`: `hashPassword`, `verifyPassword` using `@noble/hashes/argon2`. `createSession(userId, rememberMe)`. `readSession(req)`.
4. Implement endpoints:
   - `POST /api/auth/signup`
   - `POST /api/auth/signin`
   - `POST /api/auth/signout`
   - `GET /api/auth/me`
   - `POST /api/auth/change-password`
   - `DELETE /api/account/delete`
5. `_middleware.ts` reads `sid` cookie; rejects unauthorized `/api/*` (allowlist signup + signin + me).
6. SPA: `<SignInPage>`, `<SignUpPage>`, `<ChangePasswordModal>`, `<DeleteAccountModal>`. `useAuth()` backed by TanStack Query.
7. Settings page skeleton with auth-related sections.

**End state:** A user can sign up, sign in, sign out, change password, delete account. Session survives reload. Remember-me extends to 30 days.

### Phase 3 — Daily view core (~7–10 days)

1. **Inbox panel** — port from `daily.jsx`. 280px wide; "Unscheduled" title + count pill; `<InboxCard>` list; "Add a task…" tile. CRUD via API.
2. **Timeline view** — stats strip, `ScrollViewer` with absolute-positioned grid, hour grid + dashed/solid quarter gridlines + hour labels (port JSX exactly), 96px/hour default.
3. **Timebox block** — port from `daily.jsx`. Absolute positioning via `top` and `height` from `minutesToPx`. State classes: `upcoming`/`in-progress`/`completed`/`dragging`/`ghost`.
4. **Now-line + past wash** — re-render every 30s.
5. **Drag-and-drop** with `<DndContext>`, modifiers, sensors. Drop label and ghost block from dnd-kit's `over`/`active` state.
6. **Conflict handling** (§3.5).
7. **Resize handles** — top/bottom 28×4px.
8. **Configurable increments** (§3.3) — change re-renders gridlines + snap; durations preserved.
9. **Date navigation** — header chevrons + date picker drive `?date=YYYY-MM-DD` route param.
10. **Notes modal** — flyout with title, time range, textarea.
11. **Past-task confirm** (§3.6) — confirm dialog when editing a timebox whose end is in the past.

**End state:** Daily view fully functional. Pixel-faithful against `Timebox.html`.

### Phase 4 — Completion + reconciliation (~2–3 days)

1. State derivation in `src/lib/completion.ts`. Re-derive on every render plus 30s interval.
2. **Manual override**: clicking the check stub sets `completion_overridden=1` + `completion_state='completed'` (or `incomplete` if currently complete). PATCH to API.
3. **Lazy server-side promotion**: `GET /api/daily/[date]` for past dates issues a single `UPDATE` setting `completion_state='completed'` for non-overridden `'upcoming'` rows. Idempotent, silent.
4. State transition CSS (200ms cross-fade, check stub scale-in) — already in `app.css`; verify it works after React re-render.

**End state:** Past timeboxes auto-complete. Manual overrides persist.

### Phase 5 — Weekly planner (~3–5 days)

`src/components/weekly/` ports `planners.jsx` `WeeklyView`:

1. 280px **Weekly pool** — same chrome as inbox; cards have **no duration** (§8.2).
2. **7-day grid** — 7 equal columns; column header = DOW eyebrow + day-number; today's column tints `--accent`; weekend headers use `--surface-2`.
3. Cards: 3px accent left border; `kind` variants (`muted`/`success`/`info`).
4. `<DndContext>` for pool→day. Drop sets `weekly_task.day_of_week`. **No promotion to daily** (§8.2).
5. Drop ghost on hovered column.
6. Endpoints: `GET/POST/PATCH/DELETE /api/weekly/[weekStart]`.
7. Week navigation + "This Week" shortcut. First-day-of-week respects `user_settings.first_day_of_week`.

### Phase 6 — Monthly planner (~3–5 days)

`src/components/monthly/` ports `planners.jsx` `MonthlyView`:

1. 280px **Monthly pool**.
2. **Vertical list of week cards** — explicitly NOT a calendar grid.
3. Each week card: 14px radius, two-column inner grid (180px meta + flex body). Meta = "Week 19" / "May 4 – May 10" / "3 tasks".
4. Body = stack of task cards with 3px accent left border; `kind` variants.
5. **Current week**: 1px accent box-shadow ring; eyebrow + week number tinted accent; drop-ghost card at body bottom.
6. Empty weeks: dashed-border placeholder.
7. `<DndContext>` for pool→week. Drop sets `monthly_task.week_index`. **No promotion to weekly** (§9.2).
8. Endpoints: `GET/POST/PATCH/DELETE /api/monthly/[monthStart]`.
9. Month navigation + "This Month" shortcut.

### Phase 7 — Settings + polish + accessibility (~3–5 days)

`src/pages/SettingsPage.tsx` covering each section in §10 (minus §10.3 notifications):

1. **Appearance** — theme dropdown (Light/Dark) + accent picker (9 chips). Live preview; persisted via `PATCH /api/settings`.
2. **Timeline** (§10.2) — default increment (5/10/15/30/60), visible range start + end hour, allow-overlap toggle.
3. **Week and Calendar** (§10.4) — first-day-of-week.
4. **Account** (§10.5) — change password, sign out, delete account.
5. **Export data** (§11.3, nice-to-have) — `GET /api/account/export` returns JSON of all four tables.
6. **Accessibility pass** (§12.3) — tab order, keyboard drag (arrows + shift+arrows), `aria-label` on icon buttons, `<label>` on form inputs, contrast spot-check across all 18 theme/accent combos, focus outlines on all themes.

### Phase 8 — Deployment (~1–2 days)

1. Production D1 created via Wrangler; `wrangler d1 migrations apply timebox-db --remote`.
2. `SESSION_SECRET` set as a Cloudflare Pages env var (cheap insurance even though current sessions use random IDs in DB).
3. `wrangler pages deploy` from CI or local. URL is `*.pages.dev`.
4. Custom domain (optional) attached via Cloudflare DNS.
5. Smoke test on production: sign up, plan a day, sign out, sign in from a different browser, see same data.

**End state:** Live on a public URL, $0/month.

---

## Verification

End-to-end manual test plan after each phase. (Phase 1 verification details are in `docs/PROGRESS.md`.)

**Phase 2**
- Sign up with `kris@example.com` / `kris` / `Password1` → redirected into the app.
- Reload → still signed in.
- Sign out → redirected to `/sign-in`. Hit `/api/auth/me` directly → 401.
- Sign in with "remember me" off → close browser, reopen → signed out. With it on → still signed in.
- Change password → old password rejected on subsequent sign-in.
- Delete account → all rows for that user gone (`wrangler d1 execute`).
- Two parallel users in two browsers see only their own data.

**Phase 3**
- Add a task in inbox → drag onto timeline → drops at snapped time; drop label shows correct time during drag.
- Resize from top edge: start changes, end held. Bottom: end changes, start held.
- Drop into occupied slot → ghost turns warn-coloured, drop rejected. Toggle `allow_overlap` → drop succeeds.
- Change increment 15→5 in settings → gridlines re-render; durations unchanged.
- Now-line ticks every 30s; past-wash overlay grows below it.
- Edit a past timebox → confirmation dialog.
- Compare against `Timebox.html` side-by-side → pixel-faithful.

**Phase 4**
- Add a timebox at 9:00 AM yesterday in the DB; load yesterday's view → block shows as completed (server promoted on read).
- Mark today's lunch block "incomplete"; reload → state preserved.

**Phase 5/6**
- Weekly: drag pool task to Wednesday → persists; navigate weeks → tasks isolated per week.
- Monthly: drag pool task to "Week 20" → renders inside that week card; current-week ring visible.

**Phase 7**
- Cycle every theme + accent combo via settings → no glitches; all text readable.
- Keyboard-only: Tab through daily view, focus a block, Up/Down moves by 1 increment, Shift+Up/Down resizes.
- Export data → JSON file with all four entity types.
- Delete account → confirmation, then redirected to sign-in; data gone.

**Phase 8**
- Production URL works in fresh browser profile (no cached state).
- Performance: timeline renders <1s on typical laptop (§12.1). Drag at 60fps. Day/week/month nav <500ms.

**Unit tests** (`tests/lib/`, Vitest, on every commit):
- `time.test.ts` — parity with `fmtTime`/`fmtTimeShort`/`fmtDur` against JSX values.
- `timeline.test.ts` — snap rounds correctly at every increment; conflict detection covers full overlap, partial overlap, edge-touching (not a conflict).
- `completion.test.ts` — state derivation honours override flag; flips correctly across now-boundary.

---

## Translation notes (requirements doc → web app)

Sections that need re-interpretation since the spec was written for native Windows:

- **§1.3 Target Platform** — "modern browser" instead of Windows 10/11. Target Chrome, Edge, Firefox, Safari latest. Optimised for desktop widths (≥1200px); mobile is v2.
- **§6 Notifications (entire section)** — **dropped from v1** per user decision. §10.3 dropped too.
- **§6.4 Background behaviour** — moot without notifications.
- **§11.1 Local storage** — translated to "stored on the user's account, server-side in D1". Cross-device follows.
- **§12.4 Security** — Argon2id; HTTPS via Cloudflare; HTTP-only Secure SameSite=Strict session cookies; D1 access only via Pages Functions runtime.
