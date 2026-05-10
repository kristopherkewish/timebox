# Handoff: Personal Timebox — Mobile (web app on phone)

## Overview

Personal Timebox is a single-user web app for laying out a day in time-boxed blocks: capture a task, schedule it onto a timeline, run a live timer, mark done. This handoff covers the **mobile** experience — the same product served through a phone browser (iOS Safari, Android Chrome). It is the responsive companion to the desktop build (`design_handoff_timebox/`); both share `tokens.css` and the same data model, but the mobile screens are laid out for one-handed touch use, not a two-pane desktop window.

## About the design files

The files in this bundle are **design references built in HTML/CSS/JSX** — high-fidelity prototypes showing intended look, layout and behavior. **They are not production code to drop into your app.** Your task is to recreate these screens in the target codebase's existing environment (React Native, Flutter, SwiftUI, Jetpack Compose, or a responsive React/Vue/Svelte web app), reusing that codebase's component primitives, navigation system, and state management.

If no environment exists yet, pick the framework that matches the deployment target (a mobile-web PWA suggests React/Next.js + Tailwind or vanilla CSS; a native shipping target suggests React Native or platform-native). The HTML in this bundle is a **specification of layout, tokens, states, and interactions**, not a starting codebase.

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, dark mode, accent presets, empty/active/done/fresh states, and bottom-sheet/FAB interactions are all specified. Recreate pixel-perfectly. Do not invent additional visual styles.

## Design system reuse

Mobile reuses the desktop tokens verbatim — `styles/tokens.css` is identical between the two bundles. Same Geist + Geist Mono type stack, same orange `#C2410C` default accent (with 9 presets), same light + dark theme variables, same spacing/radius/shadow tokens. Implement these as design tokens (Tailwind config, theme object, CSS variables) once and share with desktop.

`styles/mobile.css` is the mobile-specific component layer (everything prefixed `.tbm-`). `styles/app.css` from the desktop build is included only because the mobile prototype is hosted on the same `<DesignCanvas>` framework — the mobile screens themselves do **not** depend on `.tb-` classes.

## Information architecture

Four tabs in the bottom tab bar:

1. **Today** — current day's timeline + the day's unscheduled pool above it
2. **Week** — list of day cards (Mon–Sun) + this week's unscheduled pool above it
3. **Month** — list of week cards + this month's unscheduled pool above it
4. **Me** — settings, profile, theme/accent (not designed in this pass — placeholder)

There is **no separate Inbox tab.** Each view has its own scoped pool of unscheduled tasks at the top, mirroring how the desktop left rail re-scopes by view. A task captured in Week's pool is "due this week, time TBD"; a task in Today's pool is "do today, time TBD."

A floating **+ FAB** (bottom-right, above the tab bar) opens **Quick add** as a bottom sheet — for full task capture with title, duration, day, time, tag, notes. The pool's inline composer (tap "+ Add" inside the pool) is the lightweight path: title + duration only, no scheduling.

## Screens

All screens render at iPhone 14 Pro logical resolution (393 × 852, scale 3x). Status bar (47px), Safari URL bar (44px overlay at bottom in the prototype, optional via Tweaks), and home indicator (34px) are device chrome; the app surface fits between status bar top and home indicator bottom.

### 1. Today
Top → bottom:
- **Header** (40px, padding 8/20/12/20): eyebrow `THURSDAY · MAY 8` (10.5px, uppercase, 0.14em tracking, `--ink-3`); title `Today` (22px / 600 / -0.02em); right side has search icon button (40×40, rounded 10) and avatar circle (`MK` initials on accent fill).
- **Subhead** (padding 0/20/12/20): segmented control `Day | Week | Month` (height 30, padding 3, radius 10, sunken bg) with `Day` active; pill `Live · 0:23` (height 30, accent-dotted) showing whether a block is currently running.
- **Stats strip** (3 columns: Scheduled / Done / Focus): one card with internal dividers, rounded 12, padding 12/4. Values 18px / 600 / tabular-nums; labels 9.5px uppercase 0.1em. Numbers carry their unit (`5h 30m`, `1h 45m`) — units are inline at 11px / `--ink-3`.
- **Pool strip** — see "Pool strip" below. ~85px tall.
- **Timeline** — vertical, scrollable, hour labels in left gutter (44px wide, right-aligned, 10.5px tabular), hour rows 80px tall, with dashed quarter-hour lines (q1/q2/q3 at 25%/50%/75%, q2 slightly stronger). "Now" indicator: 1.5px accent line full-width, 9px accent dot at left, time label in left gutter on a `--bg` chip. Past hours get a 3% ink wash. Blocks (`.tbm-block`) sit absolutely positioned, left/right inset 4px, `--surface` fill, 1px `--line-2` border, 3px accent left bar, 10px radius. States: `.done` (success left-bar, struck-through title, 78% opacity, success-fill check), `.live` (1.5px accent ring + shadow + pulsing dot top-right), `.fresh` (accent ring + 6px accent halo, used for ~2s after scheduling).
- **FAB** — 56×56 accent circle with white plus, `box-shadow: 0 8px 24px accent@35%`, fixed at right 18 / bottom 78.
- **Tab bar** — 4 columns, height 52 per tab, frosted (`color-mix surface@92% + backdrop-filter blur 20`), 1px `--line` top border. Active tab uses `--ink`; inactive `--ink-3`. Labels 10.5px / 600 below the icon.

### 2. Pool strip (component, used on Today / Week / Month)

Above the main content, below the stats. Header row: `TODAY · UNSCHEDULED` (label varies per scope) on the left, count chip (e.g. `4`) and `Open · →` link on the right. Below: horizontal scroll strip with:

- **Compose card** — when active, replaces the "+ Add" tile. 240px wide, 1.5px accent border with 4px accent halo. Top: bare-input `What to do?` (13.5px / 500). Bottom: duration mini-chips `15m | 25m | 45m` (24px tall, 999 radius; active one is filled `--ink`/`--bg`) and a pill **Save** button (accent fill, 26px, white text). No time picker — composer captures title+duration only; scheduling happens in the schedule sheet.
- **Pool cards** — 200px wide, 12 radius, 1px `--line`, `--surface` fill, 3px accent left bar (use `.muted` / `.success` / `.info` variants for non-accent). Title 13px / 500, 2-line clamp. Meta row: duration (tabular, 11px / 500 / `--ink-2`), 3px dot, due-by hint or tag (11px / `--ink-3`). Fresh state: accent border + 3px halo; meta row gets a `NEW` badge (`--accent-soft` bg, `--accent-ink` fg, 10px / 600 / 0.06em uppercase).
- **+ Add card** — dashed `--line-2`, 60px min-height, `--ink-3` text. Tapping it switches that slot to the compose card.

### 3. Quick add (bottom sheet)

Full-height bottom sheet. Scrim `rgba(15,15,15,0.32)`. Sheet `--surface`, 22px top-corner radius, max-height 78%, `0 -10px 40px rgba(0,0,0,0.18)` shadow. Content:
- **Handle** — 44×5, 999 radius, `--line-2`, centered.
- **Head** — `Quick add` title (17px / 600 / -0.015em), close button (32×32 circle, `--surface-2`).
- **Body** — title input as huge bare text (`tbm-input`: 22px / 600 / -0.015em, no border, no padding, placeholder `What's the task?`). Below: list of fields separated by 1px `--line`, each 52px min-height, with leading icon (22×22, `--ink-3`), label (`--ink-2`), value right-aligned (`--ink` / 500 / tabular). Fields: Duration (chips `15m | 25m | 45m | 1h | 2h` shown as `tbm-dur-chip` row, active = `--ink` fill), Day, Time, Tag, Notes.
- **CTA** — full-width minus 20/20 inset, height 50, accent fill, white 15px / 600, 12 radius. Disabled state: `--surface-sunken` fill, `--ink-4` text.

### 4. Block detail (bottom sheet)

Same sheet chrome. Content for an existing scheduled block:
- Live timer if block is running: huge `0:23 / 25:00` row (30px tabular running, 12px muted total), accent progress bar 4px tall.
- Three buttons in a 1-1-1 grid: **Pause**, **Done**, **Skip** — height 40, radius 10. Primary CTA gets accent fill; the other two get `rgba(255,255,255,0.08)` over `--ink`/dark sheet variant or `--surface-2` over the regular sheet.
- Field list: Time (e.g. `12:00 – 12:25 pm · 25m`), Tag, Notes — same pattern as Quick add but read-mostly.
- Footer-row destructive: `Delete block` left-aligned, `Edit` right-aligned (text-only links, 13px / 500).

### 5. Schedule sheet (bottom sheet, opens when tapping a pool card)

Distinct from Quick add. Content:
- Head: `Schedule "<task title>"` and the duration chip in the right-aligned slot of the head.
- **Recommended slot** — single `.tbm-slot.recommended` row at the top: 14px padding, 12 radius, accent border, `accent@6% over surface` fill. Eyebrow `RECOMMENDED · NEXT FREE` (10px / 600 / 0.12em uppercase, `--accent-ink`, with 5px accent pulse dot). Time large left (15px / 600 / tabular, 92px column), title + sub right ("After standup, before lunch"). Pick button: 32px accent circle with white check, right-aligned.
- **Other open slots** — section header `OTHER OPEN SLOTS` (11px uppercase, `--ink-3`, 0.1em). Then 3–4 `.tbm-slot` rows (regular surface, 1px `--line`, 12 radius). Each row: time (15/600/tabular), title (12.5/500/`--ink-2`), sub (11/`--ink-3`), pick button (32px `--ink` circle with white check).
- **Drag hint** — at bottom, dashed `--line-2` border, 12 radius, `--ink-3` 12px text: "Or drag onto the timeline to place anywhere."

### 6. Week

Top: same header pattern (eyebrow `MAY 5 – 11 · WEEK 19`, title `This week`). Subhead with segmented set to `Week`. **Week strip** — 7-column grid of day pills (DOW label 10px upper, day number 16px / 600 / tabular, 4px row of pips per scheduled block underneath). Today gets a filled `--ink` pill; weekend day numbers fade to `--ink-3`. Below strip: this week's pool strip. Below pool: scrollable list of **week-card** rows (one per day):
- Card: 14 radius, 1px `--line` border, white surface (weekend: `--surface-2`). Today gets accent border + 1px accent ring.
- Head row: day number (22px / 600 / -0.02em / tabular), DOW (12px upper, `--ink-3`), task count on the right.
- Body: 6px gap, list of `.tbm-week-task` rows — 8px padding, 8 radius, 3px accent left-bar (variants `.muted`/`.success`/`.info`), 13px / 500 title, optional 11px `--ink-3` note. Empty days show one dashed empty-row placeholder.

### 7. Month

Header eyebrow `MAY 2026`, title `This month`. Subhead segmented set to `Month`. Month's pool strip. Below: list of **month-week** cards — one per ISO week. Each card: 14 radius, 16/18 padding, with head row (week number `19` 22/600/tabular + range `May 5 – 11` 12px tabular `--ink-3` + count `8 blocks`) and a vertical list of representative tasks (`.tbm-month-task`). The current week gets accent border + 1px accent ring.

### 8. Five-step capture-and-schedule flow (top of canvas)

This is **not a screen** — it's a 5-frame storyboard at the top of `Timebox Mobile.html` documenting the canonical capture-and-schedule path. Implementers should walk through these five frames before building the pool/compose/schedule sheet. The frames are:

1. **Tap + Add** in Today's pool — pool strip with the dashed "+ Add" tile highlighted.
2. **Inline composer appears** in the pool — compose card replacing "+ Add" tile, with title input focused and duration chips visible.
3. **Task lands in pool, fresh** — composer collapses back to a pool card with `.fresh` state and `NEW` badge.
4. **Tap pool card → schedule sheet** — pool card highlighted, schedule bottom sheet open with recommended slot at top + 3 alternative slots.
5. **Scheduled** — task is on the timeline as a `.fresh` block at 12:45 pm, with the pool card removed from the strip.

Capture and scheduling are intentionally two distinct moments. Capture goes through the pool composer (title + duration only, no time picker). Scheduling goes through the schedule sheet (recommended + alternatives) **or** by dragging the pool card onto the timeline. The FAB / Quick-add bottom sheet is a separate, fuller capture path that combines both — keep both paths.

## Interactions & behavior

- **Tab bar.** Tapping a tab switches the main pane to that view. The current tab uses `--ink`; others `--ink-3`. No tab transition animation in the prototype — fade or platform-default on real impl is fine.
- **FAB.** Tap → opens **Quick add** sheet from the bottom (slide up, 250–300ms, ease-out). Scrim fades in 0→1 over the same period.
- **Bottom sheets.** Drag the handle down past 40% to dismiss. Tapping scrim dismisses. Sheet animates back down on dismiss. Sheet height: max 78% of available app surface; if content is shorter, sheet hugs content.
- **Pool compose.** Tap "+ Add" → tile transforms into compose card (focus the title input). Save → composer collapses, new pool card appears at the start of the strip in `.fresh` state for ~2s, then settles to default state. Esc / blur with empty title cancels and restores "+ Add" tile.
- **Pool card → schedule sheet.** Tap a pool card → schedule sheet slides up. Pick a slot → sheet dismisses and the matching block animates onto the timeline in `.fresh` state for ~2s. Drag a pool card → it lifts (use `--shadow-drag`) and snaps to 15-min grid on the timeline; release places the block.
- **Block timer.** Tapping a block on the timeline opens **Block detail** sheet. If the block is running (live), the sheet shows the timer and Pause/Done/Skip controls; otherwise it shows fields and Edit/Delete.
- **Day / Week / Month subhead segmented control.** Mirrors the tab bar — switching it should update the pane (visually equivalent to switching tabs). Whichever control the user prefers should drive both.
- **Pull-to-refresh / scroll behavior.** Scrolling is contained in `.tbm-scroll`. The header / subhead / stats / pool strip are sticky-above-scroll (they sit outside the scroll container in the prototype).
- **Done state.** Tapping the leading check on a block toggles `.done`. Animate the strike-through and the success fill on the check (~150ms).
- **Live state.** Exactly one block can be `.live` at a time. The live block pulses its top-right dot (1s ease-in-out, opacity 1 → 0.4 → 1).

## State management

Same data model as desktop — see `requirements.md`. Mobile-specific additions:

- `activeTab: 'today' | 'week' | 'month' | 'me'`
- `sheet: { kind: 'quickAdd' | 'block' | 'schedule', payload?: any } | null`
- `compose: { active: boolean, scope: 'day' | 'week' | 'month', title: string, durationMin: number } | null`
- `freshIds: Set<string>` — task ids in `.fresh` state; entries auto-expire after 2s.

Sheet state should be a single slot (only one sheet open at a time). Compose state is the pool's inline editor — exactly one pool can have an active composer at any time.

## Design tokens

Identical to the desktop bundle — copy `styles/tokens.css` verbatim. Mobile-specific values used inside `mobile.css` (not in tokens but baked into components):

- Hour row height: `80px` (vs 96px on desktop)
- Pool card width: `200px` (compose: `240px`)
- FAB: `56×56`, fixed at right `18px` / bottom `78px`
- Tab bar height: `52px` per tab + `10px` bottom safe-area pad (matches iOS home-indicator inset)
- Bottom sheet: top corners `22px` radius, max-height `78%`, scrim `rgba(15,15,15,0.32)`
- Status bar: `47px` (iPhone 14 Pro Dynamic Island)
- Home indicator: `34px`
- Optional Safari URL bar overlay: `44px` (toggle via Tweaks; if your build is a PWA installed to home screen this is absent)

## Touch targets

Every tappable element ≥ 44×44 logical pixels. The 40×40 icon buttons in headers achieve this via padding/click-target halo, not the visual hit-rect. The 32×32 sheet close and 32×32 pick circles in slot rows must be wrapped in a 44px hit area in implementation.

## Theming

Light/dark via `data-theme="light"` / `data-theme="dark"` on the root. Accent via `data-accent="orange"` (default) and 8 alternates: `amber green teal blue indigo violet rose slate`. The Tweaks panel in the prototype demonstrates the toggle live; implement as user settings on **Me**.

## Files in this bundle

- `Timebox Mobile.html` — design canvas with all 6 mobile screens + the 5-step flow storyboard, hosted in iOS device frames. **Read this first.**
- `styles/tokens.css` — design tokens (shared with desktop).
- `styles/app.css` — desktop component layer (only loaded by the canvas; mobile screens do not depend on it).
- `styles/mobile.css` — mobile component layer. All `.tbm-*` classes live here. **Primary spec for mobile.**
- `components/mobile.jsx` — React JSX for every mobile screen + the pool/compose/schedule flow. Authoritative source for layout/markup.
- `components/sample-data.jsx` — sample data the prototypes render with. Useful for matching content during implementation.
- `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` — prototype scaffolding (not part of the product).
- `requirements.md` — original product requirements (covers desktop + mobile).

## Assets

No raster images, no icon library — every glyph is an inline SVG defined in `components/mobile.jsx` (`Icon` object). Replace with your codebase's icon system (lucide-react, Tabler, SF Symbols, Material Symbols) using equivalent shapes; sizes are 18–22px stroke-1.6 to match the visual weight.

## Implementation notes

- Build the **pool strip** as a reusable component parameterized by scope (`day` / `week` / `month`); only the title label and the underlying task filter change.
- Build the **bottom sheet** as a single primitive (handle, head, body, optional CTA) and feed it three different bodies for Quick add / Block detail / Schedule. Don't fork three sheet implementations.
- Build the **block** as a single primitive and drive the visual variants via state (`live` / `done` / `fresh`) — same as `.tbm-block` / `.tbm-pool-card` / `.tbm-week-task` / `.tbm-month-task`. They all share the 3px-left-bar vocabulary; that's the deliberate visual through-line.
- The 5-step capture-and-schedule flow is the canonical happy path — wire and test it end-to-end first.
- Keep the desktop and mobile builds on the same data layer / API. The two are alternate views of the same store, not separate products.
