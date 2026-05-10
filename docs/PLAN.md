# Timebox — Implementation Plan

This is the canonical roadmap. It supersedes any plan files outside the repo. When approach changes or assumptions are revisited, edit this file directly.

## Decisions

These were resolved with the user up front. Don't re-litigate without asking.

1. **Stack: Vite + React (SPA) + Cloudflare Pages + D1.** Direct continuation of the React handoff. Pages Functions (Workers runtime) for the API. Free at personal scale (5GB DB, 100k req/day, unlimited static).
2. **No notifications in v1.** Requirements §6, §6.4, §10.3 are dropped. Web Push + Service Worker scheduling is out of scope.
3. **Full auth per requirements §2.** Username/email + password, Argon2id hashing, cookie sessions, "remember me", change password, delete account.
4. **§11.1 "local storage" reinterpreted.** Server-side D1 per user (since auth + multi-device implies cross-device data). Cross-device follows for free.
5. **Mobile = single SPA, two shells (Phase 9+).** One Vite build, one Cloudflare Pages project, one set of `/api/*` Functions. `App.tsx` selects `<DesktopShell>` or `<MobileShell>` from `matchMedia('(max-width: 820px)')`; both shells are `React.lazy` so only the active one ships. Routes are the same paths in both shells (`/`, `/week`, `/month`, `/settings`). Two SPAs would fork auth, theme, settings, and the QueryClient — the non-shareable layer (markup, mobile CSS namespace, sheet/FAB/tab-bar primitives) is the same surface area either way, so the duplication isn't bought back.

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

Phase 10 adds a fourth pure module:

`src/lib/scheduler.ts` — recommended-slot finder for the mobile schedule sheet:

```ts
export type Slot = { startMin: number; sub: string };
export const findSlots = (
  now: number,                                  // minutes since local midnight
  blocks: Timebox[],                            // today's scheduled blocks
  durationMin: number,
  cfg: { dayStart: number; dayEnd: number; increment: number; allowOverlap: boolean }
): { recommended: Slot | null; alternatives: Slot[] };
```

Walks the day's free intervals from `max(now, dayStart)` to `dayEnd`, snapping starts to `increment`. Returns the next interval that fits as `recommended` and up to 3 later free slots as `alternatives`, anchored to "after X" / "before Y" sub-labels for the schedule-sheet rows.

### State reconciliation

§4.1 requires elapsed timeboxes auto-complete even if the app wasn't open. Web equivalent: every page load (and every minute via interval while the daily view is mounted), `useDaily()` recomputes `state` for visible blocks via `deriveState`. For past dates, the server lazily promotes any non-overridden `'upcoming'` block to `'completed'` on first read after the date is past — single `UPDATE` in the `GET /api/daily/[date]` handler. Silent (per §14.5).

### Mobile shell architecture (Phase 9+)

Sources: `Personal Timebox App Mobile/design_handoff_timebox_mobile/` (`README.md`, `styles/mobile.css`, `components/mobile.jsx`).

**Shell selector.** `App.tsx` reads `matchMedia('(max-width: 820px)')` (with a `?shell=mobile|desktop` override for forced testing) and renders one of two lazy-loaded shells. Cookie auth, theme, settings, QueryClient, and React Router live above the shell split — they don't fork. Tablets (>820px) fall back to desktop until a tablet shell is added.

**Routes.** Same paths in both shells (`/`, `/week`, `/month`, `/settings`); a `/me` alias maps to `/settings` on mobile. Auth pages (`/sign-in`, `/sign-up`) render outside both shells and reflow via media queries in `extensions.css` rather than getting a mobile port.

**File layout.**
```
src/
  components/
    desktop/          # current daily/weekly/monthly/shell/icons moved under here
    mobile/           # new
      shell/          MobileShell.tsx, TabBar.tsx
      sheet/          BottomSheet.tsx, QuickAddSheet.tsx,
                      BlockDetailSheet.tsx, ScheduleSheet.tsx
      pool/           PoolStrip.tsx, PoolCard.tsx, PoolCompose.tsx
      today/          MobileToday.tsx, MobileTimeline.tsx, MobileBlock.tsx
      week/           MobileWeek.tsx, WeekStrip.tsx, WeekCard.tsx
      month/          MobileMonth.tsx, MonthWeekCard.tsx
      me/             MePage.tsx
  styles/
    mobile.css        # verbatim copy of design_handoff_timebox_mobile/styles/mobile.css
  hooks/
    useSheet.ts       # mobile-only Zustand: { kind, payload } | null (one open at a time)
    useFreshIds.ts    # mobile-only: Set<string> with per-id 2s expiry
  lib/
    scheduler.ts      # new pure fn: recommended-slot finder
```

**Reusable primitives.** Three things are explicitly built once and parameterised, per the design's implementation notes:

- `<BottomSheet>` — handle, head, body slot, optional CTA, scrim. Used by Quick add, Block detail, and Schedule. Don't fork three sheet impls.
- `<PoolStrip>` — parameterised by `scope: 'day' | 'week' | 'month'`. Only the title label and the underlying task filter change.
- `<MobileBlock>` — single component, visual variants via `done` / `live` / `fresh` state. Same 3px-left-bar vocabulary spans `.tbm-block`, `.tbm-pool-card`, `.tbm-week-task`, `.tbm-month-task`.

**State.** Server-backed state stays in the existing TanStack Query hooks (`useDaily`, `useWeekly`, `useMonthly`, `useSettings`, `useAuth`) — no fork. Mobile-only ephemeral stores: `useSheet` (single sheet slot), `useFreshIds` (auto-expiring set). Inline pool composer is local component state.

**Backend.** **No schema changes, no new endpoints.** Mobile capture writes a `timebox` with `start_min = NULL` (lands in pool); schedule sheet sets `start_min`. Both already supported by the existing daily endpoints. Recommended-slot computation is a pure client function over the day's already-loaded `timebox` rows.

**CSS.** `mobile.css` copied verbatim like `tokens.css` and `app.css`. Loaded inside `MobileShell` via a side-effect `import './mobile.css'` so the desktop bundle stays clean. Class namespace is `.tbm-*` and does not collide with the desktop `.tb-*` namespace; both can coexist if both shells were ever rendered together (they aren't, but the isolation is real).

**Drag-and-drop.** dnd-kit is reused with `TouchSensor` + `PointerSensor`. The canonical happy path on mobile is **tap pool card → schedule sheet → pick recommended slot**, not drag — drag is the secondary path per the design's 5-step storyboard. Resize handles are not designed for mobile; resize is via the Block detail sheet's duration field instead.

**Touch targets.** Every tappable element ≥44×44 logical px. 40×40 visual icon buttons get a `::before` 44px hit halo; 32×32 sheet-close and 32×32 slot-pick buttons are wrapped in a 44px hit area.

**Safe-area insets.** Tab bar and FAB use `env(safe-area-inset-bottom)` so they sit above the iOS home indicator when installed as a PWA or on Safari with the URL bar collapsed.

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

### Phase 9 — Mobile shell foundation (~3–5 days)

1. Move `components/{daily,weekly,monthly,shell,icons}/` → `components/desktop/...`. Update imports in one pass. No behaviour change.
2. `App.tsx`: `React.lazy` both `<DesktopShell>` and `<MobileShell>`; gate by `matchMedia('(max-width: 820px)')`. Add `?shell=mobile|desktop` query override that wins over the media query (testing aid).
3. `MobileShell.tsx` — `.tbm` root, safe-area insets, hosts the route subtree (`<Outlet/>`) and the tab bar.
4. `TabBar.tsx` — 4 tabs (Today / Week / Month / Me) backed by NavLink. Active uses `--ink`; inactive `--ink-3`. Frosted background per `mobile.css`.
5. Copy `Personal Timebox App Mobile/design_handoff_timebox_mobile/styles/mobile.css` verbatim into `src/styles/mobile.css`. Side-effect import inside `MobileShell`.
6. `BottomSheet.tsx` — handle (drag-to-dismiss past 40%), head (title + close), body slot, optional sticky CTA, scrim (`rgba(15,15,15,0.32)`). Animates 250–300ms ease-out on open, reverses on close.
7. `useSheet` (Zustand) — `{ kind: 'quickAdd' | 'block' | 'schedule', payload?: any } | null`. Single slot.
8. `useFreshIds` (Zustand) — `Set<string>` with per-id 2s `setTimeout` cleanup; survives re-renders, cleared on route change.
9. Auth pages (`SignInPage`, `SignUpPage`) reflow under 540px in `extensions.css` (panels stack, fill viewport, no inset shadow).
10. Placeholder `<MePage>` route at `/me` (redirects to `/settings` for now) — kept so the tab bar's 4th tab has somewhere to land.

**End state:** App opens on a phone; tab bar switches between empty Today / Week / Month placeholder routes and the Me page; `<BottomSheet>` opens and dismisses; auth pages render correctly under 540px; theme/accent persist across the shell switch.

### Phase 10 — Mobile Today (~5–7 days)

1. **Today page chrome** — header (`MON · WEEK 19` eyebrow + title + chevrons), subhead (segmented Day/Week/Month + live pill), stats strip (Scheduled / Done / Focus, tabular-nums values).
2. **PoolStrip** (scope=`day`) — horizontal-scroll strip; pool cards (200px wide); dashed `+ Add` tile that swaps in the **inline compose card** (240px); compose captures title + duration only and `POST`s a `timebox` with `start_min = NULL`. Fresh state on the new card via `useFreshIds`.
3. **Mobile timeline** — `.tbm-timeline` with 80px hour rows, dashed q1/q2/q3 gridlines, past-wash overlay, now-line with chip label. Reuses `lib/timeline.ts` math.
4. **MobileBlock** — absolute positioning via `top` / `height` from `minutesToPx`. State variants `done` / `live` / `fresh`. Tap opens **Block detail sheet**.
5. **FAB** — fixed bottom-right above tab bar; opens **QuickAdd sheet**.
6. **QuickAdd sheet** — title input (`tbm-input`), duration chips, Day / Time / Tag / Notes field rows, sticky accent CTA. Submits via existing daily `POST` (with `start_min` if Time was set, else pool).
7. **Schedule sheet** — opens on tap of a pool card. Recommended slot row (accent-bordered) + 3–4 alternatives + drag-hint footer + sticky `Schedule for X:XX pm` CTA. Pick → `PATCH /api/timeboxes/[id]` to set `start_min`. Sheet dismisses; the new block animates in via `useFreshIds` for ~2s.
8. **Recommended slot finder** — `src/lib/scheduler.ts`. Pure fn over `(now, blocks, durationMin, cfg)` returning `{ recommended, alternatives[] }`. Tested in `tests/lib/scheduler.test.ts`.
9. **BlockDetail sheet** — read-mostly fields (Time / Tag / Notes). If `live`: timer card with `Pause` / `+5 min` / `Done`; sticky `Mark complete` CTA. If not live: footer-row `Delete block` (left) / `Edit` (right) text links.
10. **Pool→timeline drag** (secondary path) — long-press lifts the pool card; dnd-kit `TouchSensor` + `PointerSensor`; existing snap modifier; drop sets `start_min`. Conflict + `allowOverlap=false` → drop rejected with the same warn-coloured ghost as desktop.
11. Wire and test the canonical 5-step capture-and-schedule flow E2E (Add tile → composer → fresh pool card → tap → schedule sheet → pick → fresh block on timeline).

**End state:** Mobile Today is functionally complete; canonical capture-and-schedule flow tested end-to-end against `Timebox Mobile.html`.

### Phase 11 — Mobile Week + Month (~3–5 days)

1. **Week page** — header (`WEEK 19 · MAY 4 – 10`), subhead segmented (Week active), week strip (7 day pills with task pips, today filled `--ink`, weekend num faded).
2. **PoolStrip** (scope=`week`) above the week-card list.
3. **Week-card** rows — one per day, head with day-num / DOW / count, body with `.tbm-week-task` rows; dashed empty-state when zero tasks. Today's card gets accent border + 1px accent ring.
4. **Pool→day drag** for Week — `weekly_task.day_of_week` mutation via existing `PATCH /api/weekly-tasks/[id]`.
5. **Month page** — header (`MAY 2026`), subhead segmented (Month active), month-pool strip, vertical list of `.tbm-month-week` cards. Current week gets the accent ring.
6. **Pool→week drag** for Month — `monthly_task.week_index` mutation via existing `PATCH /api/monthly-tasks/[id]`.
7. **Subhead segmented control** — wired to NavLink so it mirrors the tab bar exactly.
8. **QuickAdd in week/month scope** — composer captures into the active scope's pool only (no scheduling, per requirements §8.2 / §9.2). The QuickAdd sheet's Day/Time fields are hidden when `scope !== 'day'`.

**End state:** All three planning views work on mobile; per-period pool isolation verified; no cross-promotion between scopes.

### Phase 12 — Mobile Me + polish + verification (~3–5 days)

1. **MePage** — Settings (Appearance, Timeline, Week & Calendar, Account) re-laid out for narrow viewport. Reuses `useSettings` and the existing `<ChangePasswordModal>` / `<DeleteAccountModal>` / export action — those modals get a mobile media query in `extensions.css` so they take the full sheet area at <540px.
2. **Sheet drag-to-dismiss** — pointer-drag on `.tbm-sheet-handle`; threshold 40% of sheet height; spring-back if released earlier.
3. **Touch-target audit** — every interactive element ≥44×44 logical px (visual 40px buttons get a `::before` 44px hit halo; 32px sheet-close + 32px slot-pick wrapped in a 44px hit area).
4. **State animations** — pulsing dot on the live block (1s ease-in-out, opacity 1 → 0.4 → 1), fresh halo decay, completion check scale-in (~150ms).
5. **Safe-area insets** — `env(safe-area-inset-bottom)` on tab bar (`52px + 10px` safe pad) and FAB (`bottom: calc(78px + env(safe-area-inset-bottom))`).
6. **Themes × accents pass** — visual verification across 18 combinations on Today / Week / Month / Me.
7. **Performance pass** — Chrome DevTools mobile emulator (iPhone 14 Pro, slow 4G): timeline TTI <2s, 60fps scroll on the timeline, no jank during sheet open/close.
8. **Smoke test on a real device** — user runs this; deploy under same `*.pages.dev` URL; sign in on phone, run the 5-step flow, switch tabs, change theme.

**End state:** Mobile parity with the design at the level desktop has parity now. Auth, settings, and all CRUD reuse the same code path; only shell + view chrome differ.

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

**Phase 9**
- Open the app at viewport ≤820px → mobile shell mounts; tab bar visible; Today / Week / Month / Me reachable.
- `?shell=desktop` on a phone forces desktop shell; `?shell=mobile` on a wide window forces mobile shell. Removing the param reverts to media-query selection.
- Auth pages render correctly at 393×852 (no horizontal scroll, inputs full-width).
- Open and dismiss a `<BottomSheet>` via tap-scrim and via close button; theme + accent persist across the shell switch.

**Phase 10**
- 5-step flow on a phone-sized viewport: tap `+ Add` → composer focuses → enter title + pick 25m → Save → new pool card lands with `NEW` badge for ~2s → tap card → schedule sheet opens with a sensible recommended slot → pick recommended → sheet dismisses → block lands fresh on the timeline at the chosen time.
- Tap a live block → BlockDetail opens with a running timer; tap **Done** → state flips to `completed`, sheet closes, timeline shows struck-through title + check.
- FAB → QuickAdd → Save without setting Time → task lands in pool, not on timeline.
- Long-press a pool card → drag it onto the timeline; release at 11:30 am → block snaps to 11:30; conflict against an existing 11:00–11:45 block rejects the drop when `allowOverlap=false`.
- `lib/scheduler.ts` unit tests cover: empty day (recommended at `now` snapped up), full day (no recommended; alternatives empty), exact-fit gap, gap shorter than duration (skipped), `allowOverlap=true` (overlapping starts allowed).

**Phase 11**
- On Week, drag a pool card onto Wednesday → persists across navigation; pool card disappears.
- On Month, drag a pool card onto Week 20's card → persists; current-week ring still visible on the active week.
- Capture a task in Week's pool (QuickAdd, scope=week) → it lands in `weekly_task` with `day_of_week=NULL`, **not** in `timebox`. Same check for month.
- Subhead segmented control: tap Week from Today → URL changes to `/week`, mobile Week page mounts; tab bar's active tab updates in lock step.

**Phase 12**
- `/me` (or `/settings`) on a phone: change theme, accent, and increment all persist via `PATCH /api/settings`; modals (change password, delete account) cover the viewport correctly.
- Sheet drag-to-dismiss: drag handle down ~30% then release → sheet springs back. Drag past 40% → sheet animates out and `useSheet.close()` fires.
- Tab bar sits above the iOS home indicator (test in iOS Safari with the URL bar collapsed; or DevTools' "Home indicator" emulation).
- Cycle every theme × accent combo on Today and Week; no glitches; all text readable.
- Real-device smoke: sign in, run the 5-step flow, mark a block done, switch to Week, drop a task on Friday, switch theme, sign out.

**Unit tests** (`tests/lib/`, Vitest, on every commit):
- `time.test.ts` — parity with `fmtTime`/`fmtTimeShort`/`fmtDur` against JSX values.
- `timeline.test.ts` — snap rounds correctly at every increment; conflict detection covers full overlap, partial overlap, edge-touching (not a conflict).
- `completion.test.ts` — state derivation honours override flag; flips correctly across now-boundary.
- `scheduler.test.ts` — recommended-slot returns next free interval ≥ duration after `now`; alternatives don't overlap each other; respects `dayEnd` cap; honours `allowOverlap`.

---

## Translation notes (requirements doc → web app)

Sections that need re-interpretation since the spec was written for native Windows:

- **§1.3 Target Platform** — "modern browser" instead of Windows 10/11. Target Chrome, Edge, Firefox, Safari latest. Desktop shell optimised for ≥1200px (rail layout); **mobile shell** optimised for ≤820px (tab bar + sheets, Phase 9+). Tablets currently fall back to desktop.
- **§6 Notifications (entire section)** — **dropped from v1** per user decision. §10.3 dropped too.
- **§6.4 Background behaviour** — moot without notifications.
- **§11.1 Local storage** — translated to "stored on the user's account, server-side in D1". Cross-device follows.
- **§12.4 Security** — Argon2id; HTTPS via Cloudflare; HTTP-only Secure SameSite=Strict session cookies; D1 access only via Pages Functions runtime.
- **§13 Out of scope** — "mobile or web companion apps" no longer applies after Phase 12 (mobile is a shell of the same web app, not a separate companion). Recurring tasks, calendar integration, multi-user, MFA/SSO, and time-tracking analytics remain out of scope.
