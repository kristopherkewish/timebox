# Timebox — Progress Tracker

Update this file as work proceeds. The format is intentionally lightweight: one section per phase, with checkboxes for the steps inside, and a short "verified" note when a phase ends.

For each phase's full description and verification plan, see `docs/PLAN.md`.

---

## Phase 1 — Foundation ✅ Complete

- [x] Scaffold Vite + React + TS; install dependencies.
- [x] `wrangler.toml` with D1 binding scaffolded. **NOTE:** the `database_id` is still the placeholder `REPLACE_WITH_DB_ID_FROM_WRANGLER`. Replace it after running `wrangler d1 create timebox-db`.
- [x] Copy `tokens.css` + `app.css` from the design handoff into `src/styles/`. Self-hosted Geist + Geist Mono variable woff2 at `public/fonts/`.
- [x] `ThemeProvider` in `src/lib/theme.tsx` — `data-theme` + `data-accent` on `<html>`, live switch.
- [x] Ported `shell.jsx` to `src/components/shell/`. App icon + "Timebox" wordmark in title bar.
- [x] React Router with `/sign-in`, `/sign-up`, `/`, `/week`, `/month`, `/settings`. `<AuthGate>` redirects unauthenticated.
- [x] API stubs in `functions/api/` + passthrough `_middleware.ts`.

**Verified:** `npm run build` passes typecheck and bundles cleanly. Theme + accent picker on Settings switches live.

---

## Phase 2 — Auth + persistence ✅ Complete

User has to do these once before deploying:
- [ ] `wrangler login` (browser auth to Cloudflare).
- [ ] `wrangler d1 create timebox-db` → paste returned `database_id` into `wrangler.toml`.
- [ ] `wrangler d1 migrations apply timebox-db --local` for local dev, then `--remote` to apply to production.

Implementation:
- [x] `migrations/0001_initial.sql` — full schema: `user`, `session`, `user_settings`, `timebox`, `weekly_task`, `monthly_task` with FKs and indexes.
- [x] Drizzle table definitions in `functions/lib/schema.ts`.
- [x] Drizzle client at `functions/lib/db.ts`.
- [x] `functions/lib/auth.ts` — Argon2id (`@noble/hashes/argon2`, t=2 m=4096 p=1) plus `createSession`, `readSession`, `deleteSession`, `deleteOtherSessions`, cookie helpers.
- [x] `functions/_middleware.ts` — reads `sid` cookie, attaches `data.user`, rejects unauthenticated `/api/*` (allowlists: `signup`, `signin`, `me`).
- [x] Endpoints: `auth/signup`, `auth/signin`, `auth/signout`, `auth/me`, `auth/change-password`, `account/delete`, `account/export`.
- [x] SPA: `<SignInPage>`, `<SignUpPage>`, `<ChangePasswordModal>`, `<DeleteAccountModal>` (React Hook Form + Zod-style password rules).
- [x] `useAuth` hook covers `useSignIn`, `useSignUp`, `useSignOut`, `useChangePassword`, `useDeleteAccount`.
- [x] Settings API now backed by `user_settings`. `useSettings` hook with optimistic `useUpdateSettings`. ThemeProvider mirrors server settings via QueryCache subscription.

**Verified:** `npm run build` clean. `npm test` 17/17 green. Endpoints typecheck. Sign-in / sign-up flow round-trips through cookie sessions; remember-me extends the cookie to 30 days.

---

## Phase 3 — Daily view core ✅ Complete

- [x] Pure modules: `src/lib/time.ts` (verbatim ports of `fmtTime`/`fmtTimeShort`/`fmtDur`), `src/lib/timeline.ts` (snapping, conflict, px math), `src/lib/completion.ts` (`deriveState`).
- [x] Inbox panel with add-task, count + duration totals, drop target.
- [x] Timeline view with stats strip, hour grid, quarter dashed/solid lines, 96px/hour, now-line + past wash (re-renders every 30s).
- [x] Timebox block with absolute positioning, drag-to-move, top + bottom resize handles, completion check stub, notes glyph.
- [x] `<DndContext>` orchestration in `DailyView`: inbox-card drop, timeline-block move, top + bottom resize. Ghost block tracks the snapped target time. Drop label pill renders next to the ghost.
- [x] Conflict detection on every drag-move. Ghost goes warn-coloured and the drop is rejected when `allowOverlap` is off.
- [x] Configurable increment + day start/end + allowOverlap drive the timeline (read from `useSettings`).
- [x] Date navigation via `?date=YYYY-MM-DD` route param + chevrons + Today button.
- [x] Notes/edit modal (title, duration select, notes textarea, delete button).
- [x] Past-task confirm dialog when editing or creating on a past date.
- [x] Daily REST endpoints: `GET/POST /api/daily/[date]`, `PATCH/DELETE /api/timeboxes/[id]`.

**Verified:** Build + typecheck + tests all clean.

---

## Phase 4 — Completion + reconciliation ✅ Complete

- [x] `deriveState` is recomputed on every Timeline render plus a 30-second interval.
- [x] Manual override: clicking the check stub calls `update.mutate({ completionState, completionOverridden: 1 })` — toggles between `completed` and `incomplete`.
- [x] `GET /api/daily/[date]` issues a single `UPDATE` flipping any non-overridden `'upcoming'` rows on a past date to `'completed'`. Idempotent + silent.
- [x] State transitions reuse the `app.css` cross-fade + check scale-in.

**Verified:** Past-day fetches promote upcoming to completed once on read; the unit tests in `tests/lib/completion.test.ts` cover the override and now-boundary cases.

---

## Phase 5 — Weekly planner ✅ Complete

- [x] 280px **Weekly pool** as a `useDroppable`. Cards have title + optional note, no duration (per §8.2).
- [x] 7-day grid honouring `firstDayOfWeek` from settings. Today's column tints accent; Sat/Sun get `--surface-2`.
- [x] Cards with 3px accent left border + `kind` variants (`muted`/`success`/`info`).
- [x] `<DndContext>` for pool ⇄ day. Drop target highlights with `--accent-soft`. Pool-drop sets `dayOfWeek = null`. **No promotion to daily** (§8.2).
- [x] Edit modal for weekly tasks (title, note, kind, delete).
- [x] Endpoints: `GET/POST /api/weekly/[weekStart]`, `PATCH/DELETE /api/weekly-tasks/[id]`.
- [x] Week navigation via `?week=YYYY-MM-DD` + "This Week" shortcut.

---

## Phase 6 — Monthly planner ✅ Complete

- [x] 280px **Monthly pool**.
- [x] Vertical list of week cards (not a calendar grid). 14px radius, 180px meta + flex body.
- [x] Meta column shows ISO week label (`Week 19`), date range, task count.
- [x] Body holds task cards (3px accent border + kind variants) and a dashed-border empty placeholder when the week has no tasks.
- [x] Current week gets the `current` class — accent ring, accent eyebrow, accent week number.
- [x] `<DndContext>` for pool ⇄ week. Drop sets `weekIndex`. **No promotion to weekly** (§9.2).
- [x] Endpoints: `GET/POST /api/monthly/[monthStart]`, `PATCH/DELETE /api/monthly-tasks/[id]`.
- [x] Month navigation via `?month=YYYY-MM-01` + "This Month" shortcut. ISO week numbers via `src/lib/month.ts`.

---

## Phase 7 — Settings + polish + accessibility ✅ Complete

- [x] **Appearance** — theme dropdown + accent grid; live preview; persists via `PATCH /api/settings`.
- [x] **Timeline** — default increment dropdown (5/10/15/30/60), day start hour, day end hour, allow-overlap toggle.
- [x] **Week and calendar** — first day of week (Mon/Sun).
- [x] **Account** — change password, sign out, delete account, export data.
- [x] **Export data** — `GET /api/account/export` → JSON file with settings + timeboxes + weekly + monthly.
- [x] Visible focus outlines (`:focus-visible` rule with `--accent`) added to `src/styles/extensions.css` for all themes.
- [x] Keyboard equivalent for drag (§12.3): focus a timebox block → arrow Up/Down moves by 1 increment, Shift+Up/Down resizes from the bottom edge. Both honour conflicts when overlap is disabled and trigger the past-day confirm on past dates.

---

## Phase 8 — Deployment readiness ⏭ Owner action

User-driven steps left:
- [ ] `npx wrangler login`
- [ ] `npx wrangler d1 create timebox-db` → paste returned `database_id` into `wrangler.toml`.
- [ ] `npx wrangler d1 migrations apply timebox-db --local` (for local Miniflare D1).
- [ ] `npx wrangler d1 migrations apply timebox-db --remote` (for production).
- [ ] `npx wrangler pages deploy` (or `npm run deploy`).
- [ ] Optional custom domain via Cloudflare DNS.

Verified by repo:
- [x] `npm run build` clean (TS + Vite). 24KB CSS, ~330KB JS (~103KB gz).
- [x] `npm test` — 17 / 17 green across `time`, `timeline`, `completion`.
- [x] All endpoints typecheck against `@cloudflare/workers-types`.
- [x] No hardcoded user data left in API handlers.

---

## Phase 9 — Mobile shell foundation ✅ Complete (pending owner smoke)

- [x] Moved `components/{daily,weekly,monthly,shell,icons}/` → `components/desktop/...`. All imports updated.
- [x] `App.tsx` selects `<DesktopShell>` or `<MobileShell>` from `matchMedia('(max-width: 820px)')` via `useIsMobile()`; both lazy-loaded; `?shell=mobile|desktop` query override wins over the media query.
- [x] `MobileShell.tsx` (`.tbm` root, hosts `<Outlet/>` + tab bar + active sheet, side-effect imports `mobile.css`). `TabBar.tsx` with 4 NavLink-driven tabs (Today/Week/Month/Me, inline SVGs matching the design handoff's `Icon` set).
- [x] `src/styles/mobile.css` copied byte-for-byte from `Personal Timebox App Mobile/design_handoff_timebox_mobile/styles/mobile.css`. Side-effect imported inside `MobileShell`, so it splits into its own chunk (~20 KB) and does not load on desktop.
- [x] `BottomSheet.tsx` (handle, head with title + close, body slot, optional CTA, scrim). Open/close via `useSheet`. Drag-to-dismiss is deferred to Phase 12 — handle is decorative for now.
- [x] `useSheet` Zustand store (single-slot `{ kind, payload } | null`, `open` / `close` actions). `useFreshIds` Zustand store (set with per-id 2s `setTimeout` cleanup; `useIsFresh(id)` selector helper).
- [x] Auth pages (`/sign-in`, `/sign-up`) reflow under 540px in `extensions.css` — card drops border/shadow/radius and fills the viewport; inputs and buttons widen to 42 / 44 px.
- [x] Placeholder mobile pages (`MobileTodayPage`, `MobileWeekPage`, `MobileMonthPage`) render the `.tbm-header` + `.tbm-scroll` shell with a "Phase 10/11" eyebrow. `MePage` is `<Navigate to="/settings" replace />` for now.

**Verified:**
- `npm run build` clean. Bundle splits as expected: `index-*.js` 335 KB (gz 104 KB) main, `Shell-*.js` 1.5 KB desktop chunk, `MobileShell-*.js` 3.5 KB mobile chunk, `MobileShell-*.css` 20 KB mobile-only stylesheet.
- `npm test --run` — 23/23 tests green across `time`, `timeline`, `completion`.

**Owner smoke (do once):** open the app at viewport ≤820px → mobile shell mounts; tabs navigate; demo sheet opens from "Open demo sheet" button on Today and dismisses via scrim or close. Append `?shell=desktop` on a phone to force desktop, `?shell=mobile` on a wide window to force mobile. Auth pages render full-bleed at 393×852.

**Known stubs (handled in later phases):**
- Tapping the "Me" tab redirects to `/settings`, which renders the desktop-shaped `SettingsPage` inside the `.tbm` shell — Phase 12 reshapes this as a real `<MePage>`.
- The "Open demo sheet" button on `MobileTodayPage` exists only to verify the `BottomSheet` primitive; Phase 10 replaces the page wholesale.

---

## Phase 10 — Mobile Today ⏳ Pending

- [ ] Today chrome (header, segmented subhead, stats strip).
- [ ] `<PoolStrip scope="day">` with horizontal scroll, pool cards, `+ Add` tile, inline compose card; fresh state via `useFreshIds`.
- [ ] Mobile timeline with 80px hours, dashed quarter lines, past wash, now-line + chip.
- [ ] `<MobileBlock>` with `done` / `live` / `fresh` variants; tap → `<BlockDetailSheet>`.
- [ ] FAB → `<QuickAddSheet>`.
- [ ] `<ScheduleSheet>` — recommended slot + 3–4 alternatives + drag hint + sticky CTA. Pick → `PATCH /api/timeboxes/[id]`.
- [ ] `src/lib/scheduler.ts` — recommended-slot finder + `tests/lib/scheduler.test.ts`.
- [ ] `<BlockDetailSheet>` — read-mostly fields; live-state timer card with Pause / +5 min / Done; non-live shows Edit / Delete.
- [ ] Pool→timeline drag (touch) reusing dnd-kit modifiers and conflict logic.
- [ ] 5-step capture-and-schedule flow wired and tested E2E.

---

## Phase 11 — Mobile Week + Month ⏳ Pending

- [ ] Mobile Week: header, week strip (7 day pills with task pips), `<PoolStrip scope="week">`, week-card list.
- [ ] Pool→day drag for Week (`PATCH /api/weekly-tasks/[id]`).
- [ ] Mobile Month: header, `<PoolStrip scope="month">`, vertical week-card list, current-week accent ring.
- [ ] Pool→week drag for Month (`PATCH /api/monthly-tasks/[id]`).
- [ ] Subhead segmented control wired to NavLink (mirrors tab bar).
- [ ] QuickAdd Day/Time fields hidden when `scope !== 'day'` (per §8.2 / §9.2 — no scheduling at week/month level).

---

## Phase 12 — Mobile Me + polish + verification ⏳ Pending

- [ ] `<MePage>` reflowing settings (Appearance / Timeline / Week & Calendar / Account) for narrow viewport.
- [ ] Existing modals (change password, delete account, export) get a media query in `extensions.css` so they take full sheet area at <540px.
- [ ] Sheet drag-to-dismiss (handle pointer-drag past 40%, spring-back otherwise).
- [ ] Touch-target audit (≥44×44 hit halo on visual 40px / 32px buttons).
- [ ] State animations: live-block pulse, fresh halo decay, completion check scale-in.
- [ ] Safe-area insets on tab bar + FAB via `env(safe-area-inset-bottom)`.
- [ ] Themes × accents pass on all four mobile views.
- [ ] Performance pass on Chrome DevTools mobile emulator.
- [ ] Real-device smoke test (user-driven).

---

## Open notes / gotchas

Captured here so future sessions don't relearn:

- **Geist font**: the `geist` npm package is Next.js-only. Use the variable woff2 files extracted from `node_modules/geist/dist/fonts/geist-{sans,mono}/Geist*-Variable.woff2` (currently copied to `public/fonts/`). They're the entire font in one file via `font-weight: 100 900`. ~50KB each.
- **Wrangler version**: locked at `^3.84.0`. Wrangler 4.x is out but the toolchain in this repo targets 3.x — upgrade as a deliberate step, not silently.
- **Don't run** `wrangler d1 create`, `wrangler d1 migrations apply --remote`, or `wrangler pages deploy` autonomously — these touch the user's Cloudflare account.
- **The `Personal Timebox App/` folder** holds the design handoff and is intentionally kept inside the repo as a reference. Don't move/rename without asking.
- **`src/styles/extensions.css`** holds web-only additions on top of the verbatim `tokens.css` + `app.css`: auth pages, modals, form fields, settings page chrome, focus outlines, conflict states. The two design-handoff files stay byte-for-byte.
- **Argon2id parameters**: `t=2, m=4096, p=1` (see `functions/lib/auth.ts`). Tuned to fit Cloudflare Workers free-plan CPU budget. If password verification times out post-deploy, lower `m` further.
