# Handoff: Timebox — Personal Timebox App

## Overview

Timebox is a native Windows desktop app for personal day-planning. The user keeps a per-day list of tasks (with estimated durations), drags them onto a configurable daily timeline, and is notified at each timebox transition. Higher-level intent is captured in a weekly planner (tasks bucketed by day) and a monthly planner (tasks bucketed by week). All three views are intentionally independent — there is no promotion of tasks between them.

This handoff covers the **visual design and layout** for the v1 application. Functional requirements (data model, auth, persistence, notifications) are in `requirements.md`.

## About the Design Files

The HTML files in this bundle are **design references**, not production code to copy directly. They are React + inline-CSS prototypes built to communicate look, layout, hierarchy, spacing, and interaction states. The implementation task is to **recreate this design in the target Windows app codebase** (WinUI 3 / WPF / .NET MAUI for Windows — see requirements.md §1.3) using that environment's native idioms, controls, and theming primitives.

You should treat the HTML as a high-fidelity spec for visuals, and `requirements.md` as the source of truth for behavior.

## Fidelity

**High-fidelity.** The mockups define exact:
- Colors (light + dark themes, plus 9 named accent presets)
- Typography (Geist sans, weights, sizes)
- Spacing scale (4px base)
- Border radii, shadows, borders
- Block states (upcoming, in-progress, completed, drag-ghost)
- Layout proportions (rail width, inbox width, hour-row height, etc.)

Recreate these pixel-faithfully. Where the target framework's native control doesn't quite match, prefer the design's intent (e.g., the calm, restrained look) over a literal port.

## Screens / Views

The design has three primary views, plus a left rail that switches between them. All three share the same window chrome, rail, header, and date-stepper.

### App chrome (shared)

- **Window title bar** — 32px tall, `--surface` background, 1px `--line` bottom border. App icon (14px, accent-colored, rounded 3px, white "T") + "Timebox" wordmark on the left. Standard Windows minimize/maximize/close buttons on the right (close button uses `#E81123` red on hover).
- **Left rail** — 56px wide, `--surface-2` background, 1px `--line` right border. Vertical stack of 38×38 nav items (rounded 8px), 4px gap. Items: Day, Week, Month, Inbox. Bottom: bell (notifications), gear (settings), user avatar (32px circle, accent fill, white initials). Active item has `--ink` background, `--bg` icon, and a 3px accent indicator bar protruding 10px to the left.
- **Header** — 18px top / 16px bottom / 28px horizontal padding. `--surface` background, 1px `--line` bottom border. Left side: tiny eyebrow (10.5px, uppercase, 0.14em letter-spacing, `--ink-3`), 22px/600/-0.02em title in `--ink`, optional 12px `--ink-3` subtitle. Right side: segmented Day/Week/Month picker, date stepper (chevrons + label inside a single 32px-tall pill), "Today" button.

### 1. Daily View

The core screen. Two-column layout inside the main area: **280px inbox** (left) + **timeline** (right).

#### Inbox (unscheduled task pool)
- `--surface` background, 1px `--line` right border.
- Header: 16/20/10 padding, "Unscheduled" title (13px/600), task-count pill on the right (`--surface-sunken` bg, 11px tabular-nums, "5 · 3h 5m" format).
- Cards: `--surface` bg, 1px `--line` border, 10px radius, 10/12 padding. Title (13px/500 `--ink`), meta row (11px `--ink-3`, duration in `--ink-2` 500-weight tabular-nums, separated by 3px circle dots).
- Hover: border becomes `--line-2`, gentle `--shadow-sm`, grip-dots fade in on the left edge.
- "Add a task…" tile at the bottom: dashed `--line-2` border, plus icon, `--ink-3` text.

#### Timeline
- `--bg` background. 18/32/60/64 padding (top/right/bottom/left). Left padding leaves room for hour labels.
- One hour = 96px (default density).
- Hour rows: 1px `--line` top border. Each row has three quarter-hour gridlines: q1 (25%) and q3 (75%) are dashed `--line` at 0.6 opacity; q2 (50%) is solid `--line`. Hour label sits at -56px (in the left gutter), 10.5px/500, `--ink-3`, tabular-nums.
- **Now line**: 1.5px solid accent stroke spanning the full width. Has a 9px accent-filled circle at its left, with a 4px soft halo (`color-mix(accent 18%, transparent)`). Time label sits in the gutter in `--bg` (so it overlaps cleanly), 10.5px/600, accent.
- **Past wash**: a translucent dark overlay (`color-mix(--ink 4% to 2%, transparent)`) covering everything above the now-line at z-index 1, behind the blocks.

#### Timebox blocks
Absolutely positioned via top/height. Defaults: `left: 6px; right: 12px; --surface` bg, 1px `--line-2` border, **3px accent left border**, 8px radius, 8/12 padding, `--shadow-sm`.

Content: title row (13px/500 with a 14px circular check stub), meta row (11px tabular-nums `--ink-3`: "9:00 AM – 11:00 AM · 2h"), optional 11.5px/`--ink-2` note (only shown when block height ≥ 70px).

States:
- **Upcoming** — default styling above.
- **In-progress** — `box-shadow: 0 0 0 1px accent, --shadow-md`. Pulsing accent dot in the top-right (6px, animated halo 0→6px every 2s). Sits on z-index 4.
- **Completed** — `--surface-2` bg, `--line` border, `--success`-colored left border, 0.78 opacity. Title gets `text-decoration: line-through` in `--ink-4`, color shifts to `--ink-2`. Check stub fills with `--success` and shows a white check icon.
- **Drag ghost** — accent-soft fill, 1.5px dashed accent border, no shadow, accent-ink text. Marks the drop target.
- **Dragging** — `--shadow-drag`, 0.95 opacity, `rotate(-0.4deg)`, accent border, z-index 10.
- **Resize handles** — 28×4 px pills, `--ink-4` 50% opacity, centered on top and bottom edges, fade in on hover.
- **Drop label** — small accent pill ("Drop at 2:30p") that floats next to the drag-target, white 10px/600, accent bg, 4px radius.

#### Stats strip (above timeline)
- `--surface` bg, 1px bottom border, 10/28/14 padding, 28px gap, items align to the bottom.
- Each stat: tiny eyebrow label + 18px/600 tabular-nums value with smaller "h"/"m" units in `--ink-3`.
- Default stats shown: Planned, Completed, Remaining, Increment.

### 2. Weekly Planner

Same shell. Two-column inside the main area: **280px weekly pool** + **7-day grid**.

#### Weekly pool
Same chrome as the daily inbox. Title is "Weekly pool". Cards have no duration meta — just title and optional note.

#### 7-day grid
- `--bg` background. 7 equal columns separated by 1px `--line` dividers.
- Column header: 14/14/10 padding, `--surface` bg, 1px bottom border. DOW (10px uppercase 0.12em `--ink-3`) on top, day number (22px/600 tabular-nums `--ink`) below. Today's column tints both elements with the accent. Weekend headers use `--surface-2` background.
- Body: 10px padding, vertical stack of 6px-gap cards.
- Cards: `--surface` bg, 1px `--line` border, 8px radius, 8/10 padding, **3px accent left border** by default. Variants override the left-border color: `.muted` → `--ink-4` + `--ink-2` text, `.success` → `--success`, `.info` → `--info`.
- Today's column shows a drop-ghost card at the bottom (accent-soft bg, dashed accent border, accent-ink text) to indicate active drag-drop.

### 3. Monthly Planner

Same shell. Two-column inside the main area: **280px monthly pool** + **vertical list of week cards**.

> **Important**: this is **not** a calendar grid. Each week is a horizontal card listing its tasks. No day cells.

#### Week cards (one per week)
- `--surface` bg, 1px `--line` border, 14px radius, 18/20 padding. 14px gap between cards. Outer container has 18/28/60 padding and `--bg` background.
- Two-column inner grid: **180px meta column** (with 1px `--line` right divider, 24px gap) + flexible body column.
- Meta column: tiny eyebrow ("Week" or "This week"), 28px/600 week label ("Week 19"), 12px `--ink-3` date range ("May 4 – May 10"), 11px task count ("3 tasks").
- Body column: vertical stack of task cards (8/12 padding, 13px/500 title, optional 11px `--ink-3` note, 3px accent left border, color variants identical to weekly cards).
- **Current week**: card border is accent + 1px accent box-shadow (effectively a 2px accent ring). Eyebrow and week number tint accent. The current week shows a drop-ghost card (accent-soft, dashed) at the bottom of its body.
- Empty weeks: show a dashed-border "Drag a task from the pool, or add one here" hint instead of cards.

## Design Tokens

### Type — Geist (sans, weights 300/400/500/600/700) and Geist Mono (400/500)

| Role | Spec |
|---|---|
| Screen title | Geist 22 / 600 / -0.02em |
| Eyebrow | Geist 10.5 / 500 / 0.14em uppercase, `--ink-3` |
| Section heading (inbox title) | Geist 13 / 600 / -0.01em |
| Block title | Geist 13 / 500 / -0.005em |
| Block meta | Geist 13 / 500 (no italic anywhere) |
| Body | Geist 13 / 400 |
| Times (everywhere) | Geist Mono with `font-variant-numeric: tabular-nums` |
| Stat values | Geist 18 / 600 / -0.01em, tabular-nums |
| Day number (weekly) | Geist 22 / 600 / -0.02em, tabular-nums |
| Week label (monthly) | Geist 28 / 600 / -0.02em, tabular-nums |

No serif anywhere. No italics anywhere.

### Spacing scale (4px base)
4, 8, 12, 16, 20, 24, 32, 40, 48 px.

### Radii
6 (sm), 8 (controls), 10 (md), 14 (lg), 20 (xl).

### Color — Light theme

| Token | Hex |
|---|---|
| `--bg` | `#F7F7F5` |
| `--surface` | `#FFFFFF` |
| `--surface-2` | `#F2F1ED` |
| `--surface-sunken` | `#EAE9E4` |
| `--ink` | `#161513` |
| `--ink-2` | `#44423E` |
| `--ink-3` | `#7A776F` |
| `--ink-4` | `#B0ADA4` |
| `--line` | `#E6E4DD` |
| `--line-2` | `#D4D1C8` |
| `--success` | `#4D7C3F` |
| `--success-soft` | `#DDEDC9` |
| `--warn` | `#B7791F` |
| `--info` | `#2563A8` |

### Color — Dark theme

| Token | Hex |
|---|---|
| `--bg` | `#131316` |
| `--surface` | `#1B1B1F` |
| `--surface-2` | `#232227` |
| `--surface-sunken` | `#0F0F12` |
| `--ink` | `#ECEAE5` |
| `--ink-2` | `#C2BFB7` |
| `--ink-3` | `#8A877E` |
| `--ink-4` | `#57544D` |
| `--line` | `#2A292E` |
| `--line-2` | `#3A3940` |
| `--success` | `#8AB874` |
| `--warn` | `#D4A24C` |
| `--info` | `#6FA3D9` |

### Accent presets (configurable in Settings)

Each preset has a **light** triple (accent / soft / ink) and a **dark** triple. The dark variants are typically lighter/more saturated to maintain contrast on the dark surface.

| Preset | Light accent | Light soft | Light ink | Dark accent | Dark soft | Dark ink |
|---|---|---|---|---|---|---|
| orange (default) | `#C2410C` | `#FBE6D4` | `#7A2606` | `#F59E5C` | `#3D2A1A` | `#FCBF8A` |
| amber  | `#B7791F` | `#F5E5B5` | `#6B4612` | `#E5B25A` | `#3A2E15` | `#F5D38A` |
| green  | `#4D7C3F` | `#DDEDC9` | `#2C4A23` | `#8AB874` | `#2A3A22` | `#B5D2A4` |
| teal   | `#0F766E` | `#CCEBE7` | `#064741` | `#4FB3A8` | `#133533` | `#82D2C8` |
| blue   | `#2563A8` | `#D6E5F2` | `#133A66` | `#6FA3D9` | `#1F2D3F` | `#A5C7E8` |
| indigo | `#4F46E5` | `#DDDBF7` | `#2D267F` | `#8A82F0` | `#1F1D40` | `#B4ADF8` |
| violet | `#7C3AED` | `#E5DAFB` | `#4A1F8F` | `#A87CF5` | `#2A1A4A` | `#C9ACFA` |
| rose   | `#BE185D` | `#F7D4E1` | `#6F0E37` | `#E06A95` | `#3D1A2A` | `#F0A0BD` |
| slate  | `#475569` | `#DCE0E6` | `#2A323D` | `#94A3B8` | `#2A323D` | `#C0CAD8` |

The accent paints: now-line, in-progress block ring, drag-ghost, drop label, active rail item indicator, app icon, weekly today header, current monthly week card border, hover ghosts.

### Shadows

| Token | Light | Dark |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(15,15,15,0.04)` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 2px 8px rgba(15,15,15,0.05), 0 1px 2px rgba(15,15,15,0.03)` | `0 2px 8px rgba(0,0,0,0.4)` |
| `--shadow-lg` | `0 12px 32px rgba(15,15,15,0.08), 0 4px 8px rgba(15,15,15,0.03)` | `0 12px 32px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3)` |
| `--shadow-drag` | `0 16px 40px rgba(15,15,15,0.14), 0 4px 12px rgba(15,15,15,0.06)` | `0 16px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)` |

## Interactions & Behavior

Behavioral spec lives in `requirements.md`. Visual notes for the implementer:

- **Drag from inbox onto timeline**: while dragging, the source card shows a "lifted" shadow (`--shadow-drag`), 0.95 opacity, slight rotation. The drop target is shown as a ghost block at the snapped position. A small accent pill ("Drop at 2:30p") follows the drop point.
- **Resize**: the 28×4px handles at top/bottom edges fade in on hover. While resizing, the same drop-label shows the new end time.
- **Snap**: the snap interval matches the user's configured time increment (5/10/15/30/60 min). The grid's quarter lines are visual guides for 15-min default; when the increment changes, gridlines should re-render to match.
- **Now line**: updates every 30s in real time. The past-wash overlay grows to match.
- **Block transitions**: state changes (in-progress → completed) cross-fade over 200ms ease-out. The check stub fills last, with a 100ms scale-in.
- **Theme switch**: instant, no animation (per requirements §10.1).
- **Notifications**: standard Windows toast (`Microsoft.UI.Notifications`). Title = task title. Body = `start time – end time · duration`. App icon (the accent square with "T") shows in the toast.

## State Management

See `requirements.md` for the full data model. Visually-relevant state per block:
- `state: "upcoming" | "in-progress" | "completed"` (auto-derived from current time vs. block range, with a manual override flag)
- `dragging: bool`, `dragOffset: number` (transient UI state during a drag)
- Per the spec, completed-state-from-time is reconciled on app launch.

## Assets

- **Fonts**: Geist + Geist Mono. Self-host (download from Vercel/Geist or Google Fonts) and bundle with the app — do not pull from a CDN at runtime.
- **Icons**: 16px line icons, 1.5 stroke weight, currentColor stroke. Source list (replace with the codebase's icon library or the Fluent icon set):
  - `calendar`, `calendar-week`, `calendar-month`, `inbox`, `settings`, `bell`, `user`, `search`, `chevron-left`, `chevron-right`, `plus`, `check`, `note`, `moon`, `sun`, `grip` (six dots).
- **App icon**: a rounded square with accent fill and a white "T". For installation, render this at multiple sizes (16, 24, 32, 48, 256 px) for the Windows app manifest.

## Files in this bundle

- `Timebox.html` — the main design canvas. Open in a browser to see all artboards: design system, hero daily view, themes (light/dark), accent presets, weekly planner, monthly planner.
- `styles/tokens.css` — all design tokens (colors, type, spacing, radii, shadows) defined as CSS custom properties, with `[data-theme]` and `[data-accent]` overrides. **This is the canonical token reference** — port the values into the target framework's theme/resource dictionary.
- `styles/app.css` — component styles. Reference for spacing, layout proportions, hover/state transitions.
- `components/shell.jsx` — window chrome, rail, header, icon set.
- `components/daily.jsx` — daily timeline + inbox + block rendering. Includes the `fmtTime`, `fmtDur` helpers.
- `components/planners.jsx` — weekly grid + monthly week-list.
- `components/sample-data.jsx` — illustrative data showing the variety of states and content the design accommodates.
- `requirements.md` — full functional spec from the product team.

## Notes for WinUI 3 / WPF / MAUI implementers

- The CSS custom properties map cleanly onto a `ResourceDictionary` keyed by theme. Define a `ThemeDictionary` per theme and a separate `AccentDictionary` per accent; compose them at app startup based on user settings.
- The timeline can be a `Canvas` with absolutely-positioned block items, or a custom `Panel` that arranges children by `Start` / `Duration`. The latter scales better and supports keyboard nav natively.
- For the now-line, consider a `DispatcherTimer` ticking every 30s.
- The drag-and-drop should use the platform's native drag-drop with a custom adorner for the ghost. Keyboard-equivalent (per requirements §12.3): up/down arrows move selected block by 1 increment, shift+up/down resizes.
