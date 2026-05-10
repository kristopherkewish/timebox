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

## Phase 10 — Mobile Today ✅ Complete (pending owner smoke)

- [x] Today chrome — header (eyebrow + title + day chevrons), segmented subhead (Day/Week/Month, Day active, Week/Month navigate via NavLink), `Live · M:SS` pill when an in-progress block exists, stats strip (Scheduled / Done / Focus, fmtDur with smaller-unit text).
- [x] `<PoolStrip scope="day">` with horizontal scroll, pool cards, `+ Add` tile, inline compose card; fresh badge via `useFreshIds` for ~2 s after creation.
- [x] `<MobileTimeline>` with 80 px hours, dashed q1/q2/q3 lines, past wash (full-day on past dates, up-to-now on today, none on future), now-line + chip on today, ghost block during pool drag.
- [x] `<MobileBlock>` with `done` / `live` / `fresh` variants. Tap opens `<BlockDetailSheet>`. Live blocks get the pulsing-dot ring; done blocks get the strike-through + green check.
- [x] FAB → `<QuickAddSheet>` (title input, duration chips, optional "Schedule" toggle that auto-picks the next free slot via `findSlots`).
- [x] `<ScheduleSheet>` — recommended slot row (accent border, `RECOMMENDED` eyebrow with pulse dot), 3 alternatives, drag-hint footer, sticky `Schedule for X:XX pm` CTA. Pick → `PATCH /api/timeboxes/[id]`; mark fresh; close.
- [x] `src/lib/scheduler.ts` — pure `findSlots(now, blocks, durationMin, cfg)` returning `{ recommended, alternatives[] }`. 10 / 10 unit tests in `tests/lib/scheduler.test.ts`.
- [x] `<BlockDetailSheet>` — live timer card with `+5 min` and `Done` buttons (Pause omitted from v1 — no pause field in the data model); read-only Time field; editable Notes textarea (PATCH on blur); `Mark complete` / `Mark incomplete` CTA; footer-row `Delete block` (with confirm) and `Send to pool`.
- [x] Pool → timeline drag using `@dnd-kit/core` with `PointerSensor (distance: 8)` and `TouchSensor (delay: 200, tolerance: 5)`. Snapping reuses `lib/timeline.ts`; conflicts respect `allowOverlap`. The dragged card lifts via `.tbm-pool-card.dragging`. Pool drop on past dates is a no-op for now (Phase 12 wires the past-day confirm).
- [x] 5-step capture-and-schedule flow wired: tap `+ Add` → composer focuses → save → fresh pool card (~2 s) → tap → schedule sheet with recommended → pick → `PATCH` → fresh block on timeline.

**Verified:**
- `npm run build` clean. Bundles: `index.js` 346 KB / 108 KB gz (main); `MobileShell.js` 14.9 KB / 4.5 KB gz (chunked, contains the three sheets); `MobileShell.css` 20 KB only loaded by mobile.
- `npm test --run` — 33 / 33 tests green (`time`, `timeline`, `completion`, `scheduler`).

**Owner smoke (do once on a phone-sized viewport):**
- Tap `+ Add` in the pool → composer focuses → type a title → tap a duration mini-chip → Save → new pool card has `New` badge for ~2 s.
- Tap the new pool card → schedule sheet opens with a sensible recommended slot for today → pick recommended → block lands fresh on the timeline at the chosen time.
- Tap a live block (one that contains `now`) → BlockDetail opens with running timer → tap `Done` → state flips, sheet closes, block shows strike-through + check.
- FAB → QuickAdd → enter title → leave the Schedule toggle off → Save → task lands in pool, not on timeline.
- Long-press a pool card → drag onto the timeline at, say, 11:30 am → release → block snaps to 11:30. Drag onto an occupied 11:00–11:45 block (with `allowOverlap` off) → ghost goes warn-coloured, drop rejected.
- Day chevrons navigate ±1 day; segmented `Week` / `Month` jump between routes.

**Known stubs / Phase 12 polish:**
- Past-day drop is a silent no-op (no confirm dialog yet); compare desktop's `confirmIfPast` modal.
- `Pause` is not in the data model; the live timer card shows `+5 min` / `Done` only.
- QuickAdd's `Schedule` toggle uses the recommended slot — Phase 12 may add a manual time picker.
- Sheet drag-to-dismiss (handle-pull) is still decorative — Phase 12 adds the gesture.

---

## Phase 11 — Mobile Week + Month ✅ Complete (pending owner smoke)

- [x] **Mobile Week** (`src/pages/mobile/MobileWeekPage.tsx`) — header (range eyebrow + `This week` + week chevrons), segmented Day / Week / Month subhead with Week active, total-tasks pill, `<WeekStrip>` (7 day pills, today filled, weekend muted, up to 3 task pips), `<PoolStrip scope="week">`, vertical list of `<WeekCard>` (one per day, each a `useDroppable`).
- [x] **Pool → day drag** for Week — `<DndContext>` on the page; drop on `week-day-N` mutates `dayOfWeek` via `PATCH /api/weekly-tasks/[id]`.
- [x] **Mobile Month** (`src/pages/mobile/MobileMonthPage.tsx`) — header (`{n} weeks · {m} tasks` eyebrow + month name + year + month chevrons), segmented subhead with Month active, `<PoolStrip scope="month">`, vertical list of `<MonthWeekCard>` (one per ISO week of the month, each a `useDroppable`, current week gets the `.current` accent ring).
- [x] **Pool → week drag** for Month — drop on `month-week-N` mutates `weekIndex` via `PATCH /api/monthly-tasks/[id]`.
- [x] **Segmented control wiring** — Day / Week / Month buttons in the subhead navigate to `/`, `/week`, `/month` respectively, on every mobile page.
- [x] **Scope-aware QuickAdd** — `<QuickAddSheet>` now branches on `payload.scope`: day shows duration chips + auto-schedule toggle; week/month show only a title input + helper text + `Add to {scope} pool` CTA. Each scope uses its respective `useCreate*Task` hook.
- [x] Pool cards on Week/Month use `dragKind='pool-card-week'` / `'pool-card-month'`; the Today page's drag handler ignores those (kind mismatch), so the same `<PoolStrip>` works in three scopes.

**Verified:**
- `npm run build` clean. Bundles: `index.js` 355 KB / 109 KB gz; `MobileShell.js` 16.6 KB / 4.9 KB gz (sheets + 3 mobile pages); `MobileShell.css` 20 KB.
- `npm test --run` — 33 / 33 tests green.

**Owner smoke (do once):**
- On a phone, navigate to `/week` via the tab bar → header reads "This week" with the date range; the strip shows the 7 day pills with pip counts.
- Tap `+ Add` in the weekly pool → composer focuses → Save → fresh card lands. (For Phase 11 the inline composer still uses the daily compose UI — title + duration chips. The duration is captured but ignored at the API since weekly tasks don't have one. Phase 12 polish will scope the composer's chip row.)
- Drag a pool card onto Wednesday → card jumps to Wednesday's body, persists across `?week=` navigation, returns to pool when dragged onto an empty day vs another → check via the same path.
- Tap the FAB on `/week` → QuickAdd opens with the **weekly** form (title only, no duration chips, no schedule toggle, CTA reads `Add to weekly pool`). Save → task lands in the week's pool.
- On `/month`, repeat: drag pool card onto Week 20 → persists; current-week ring stays on the current week.
- Day chevrons step ±1 week / ±1 month; subhead segmented control flips between routes in lock-step with the tab bar.

**Known stubs (Phase 12 polish):**
- The inline pool composer (`<PoolCompose>`) still shows duration mini-chips even at week/month scope — the values just don't get sent. Phase 12 will hide them when `scope !== 'day'`.
- Tapping a weekly or monthly task on its day/week card doesn't open an edit sheet yet. Phase 12 wires a minimal edit/delete flow (currently you can only edit weekly/monthly tasks via the desktop modal).

---

## Phase 12 — Mobile Me + polish + verification ✅ Complete (pending owner smoke)

- [x] **`<MePage>`** with mobile-shaped settings: `Account` header (avatar + username), then `.tbm-list` sections for Appearance (theme dropdown, accent grid), Timeline (increment / day-start / day-end / overlap toggle), Week & Calendar (first-day-of-week), and Account (change password, export, sign out, delete account). Reuses `useSettings`, `useUpdateSettings`, `useAuth`, `useSignOut`, and the existing `<ChangePasswordModal>` / `<DeleteAccountModal>`.
- [x] **Sheet drag-to-dismiss.** `BottomSheet` now wires `pointerdown` / `pointermove` / `pointerup` on the handle. Drag drives `transform: translateY(...)` directly (no React re-renders during drag). Past 40% of sheet height → animate out and `useSheet.close()`; below threshold → spring back with `transition: transform 0.25s ease-out`. The handle has an invisible `::before` hit halo so it's reachable with a thumb.
- [x] **Touch-target halos.** `.tbm-iconbtn`, `.tbm-sheet-close`, `.tbm-slot .pick` all get a transparent `::before` with `inset: -6px` so the visually-smaller buttons (40 / 32 px) become ≥44 × 44 hit areas.
- [x] **Safe-area insets.** `.tbm-tabbar` uses `padding-bottom: calc(10px + env(safe-area-inset-bottom))` and `.tbm-fab` uses `bottom: calc(78px + env(safe-area-inset-bottom))` — both sit above the iOS home indicator on a real device.
- [x] **`<PoolCompose>` scope-aware.** Hides the duration mini-chips when `scope !== 'day'` so the week/month inline composer asks only for a title.
- [x] **Past-day confirm.** Pool→timeline drag drop on a past date now prompts a `window.confirm` before mutating. (Visual modal lives behind a known stub for Phase 13 — see below.)
- [x] **State animations** (already in `mobile.css`): `.tbm-block.live::after` pulse, `.tbm-block.fresh` accent halo, completion check scale-in via the existing transition rules. Verified they fire from mobile state transitions (mark complete, schedule pick).

**Verified:**
- `npm run build` clean. Bundles: `index.js` 360 KB / 110 KB gz; `MobileShell.js` 17.6 KB / 5.3 KB gz; `MobileShell.css` 20 KB.
- `npm test --run` — 33 / 33 tests green (`time`, `timeline`, `completion`, `scheduler`).

**Owner smoke (do once on a real phone):**
- Tap `Me` tab → page renders the mobile settings list. Change theme → apps switches live; change accent → chrome tints update; toggle `Allow overlapping blocks` → state persists across reload.
- Tap `Change password` → modal opens covering the viewport; submit → modal closes. Same for `Delete account` (cancel without deleting!).
- Tap `Export data` → JSON file downloads to the device.
- Open any sheet (FAB → QuickAdd) → drag the handle down ~30% → release → sheet springs back. Drag down past ~50% → release → sheet animates out and closes.
- Test FAB tap target — the 56×56 visual is well above 44×44 already; the chevrons in the header are 40×40 with a 44×44 halo.
- iOS Safari with the URL bar collapsed: tab bar sits above the home indicator (no overlap with iOS swipe-up gesture); FAB likewise lifted.
- Cycle every theme × accent combination on Today / Week / Month / Me — no glitches; all text readable.
- Run the canonical 5-step capture-and-schedule flow end to end on a real device.

**Known stubs (Phase 13+ polish, not blocking):**
- Past-day confirm uses `window.confirm` instead of a styled modal. The desktop `confirmIfPast` modal can be ported as a shared mobile component when needed.
- Past-day confirm only applies to MobileTodayPage drag drop. BlockDetailSheet mutations (Mark complete, +5 min, Send to pool, Delete), QuickAdd save, and PoolCompose save on a past date all proceed silently — same gap pattern as desktop pre-Phase-7.
- `<PoolCompose>`'s mini-chips hide for week/month, but the QuickAdd sheet's full week/month branch still uses `SimplePoolCapture` (intentionally minimal — no extra fields).

---

## Open notes / gotchas

Captured here so future sessions don't relearn:

- **Geist font**: the `geist` npm package is Next.js-only. Use the variable woff2 files extracted from `node_modules/geist/dist/fonts/geist-{sans,mono}/Geist*-Variable.woff2` (currently copied to `public/fonts/`). They're the entire font in one file via `font-weight: 100 900`. ~50KB each.
- **Wrangler version**: locked at `^3.84.0`. Wrangler 4.x is out but the toolchain in this repo targets 3.x — upgrade as a deliberate step, not silently.
- **Don't run** `wrangler d1 create`, `wrangler d1 migrations apply --remote`, or `wrangler pages deploy` autonomously — these touch the user's Cloudflare account.
- **The `Personal Timebox App/` folder** holds the design handoff and is intentionally kept inside the repo as a reference. Don't move/rename without asking.
- **`src/styles/extensions.css`** holds web-only additions on top of the verbatim `tokens.css` + `app.css`: auth pages, modals, form fields, settings page chrome, focus outlines, conflict states. The two design-handoff files stay byte-for-byte.
- **Argon2id parameters**: `t=2, m=4096, p=1` (see `functions/lib/auth.ts`). Tuned to fit Cloudflare Workers free-plan CPU budget. If password verification times out post-deploy, lower `m` further.
