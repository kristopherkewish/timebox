# Timebox

A personal day-planning web app. Plan your day in concrete time blocks on a configurable timeline, with weekly and monthly planners at higher levels of abstraction.

Solo personal project. Self-deployed at $0/month on Cloudflare Pages + D1.

## Status

**Phases 1–7 of 8 complete.** Phase 8 (deployment) is the only step left and requires the owner to run a few `wrangler` commands against their Cloudflare account. See [`docs/PROGRESS.md`](docs/PROGRESS.md) for the running phase tracker, and [`docs/PLAN.md`](docs/PLAN.md) for the full roadmap.

## Stack

- **Frontend**: Vite 5 + React 18 + TypeScript (SPA)
- **Routing**: React Router v6
- **Server state**: TanStack Query v5
- **Drag-drop**: `@dnd-kit/core`
- **Styling**: Plain CSS — design tokens copied from the design handoff
- **Backend**: Cloudflare Pages Functions (Workers runtime)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **ORM**: Drizzle
- **Auth**: Cookie sessions, Argon2id via `@noble/hashes`

## Prerequisites

- Node.js 22 (LTS) or newer
- A Cloudflare account (free tier) for deployment and D1 — not required for local dev with Phase 1 stubs

## Run it locally

```powershell
npm install
npm run build
npx wrangler pages dev dist --port 8788
```

Then open <http://127.0.0.1:8788>. The Settings page is the most interactive surface in Phase 1: switch theme + accent and watch the rail/header re-tint live.

For pure-frontend dev with hot reload (no API):

```powershell
npm run dev
```

This serves the SPA via Vite at `http://localhost:5173`. The auth gate will block routes other than `/sign-in` until the API is reachable.

## Deploy to Cloudflare (one-time setup, then per-deploy)

```powershell
# One-time
npx wrangler login
npx wrangler d1 create timebox-db
# Paste the returned database_id into wrangler.toml, then:
npx wrangler d1 migrations apply timebox-db --remote

# Per-deploy
npm run deploy
```

## Repo layout

```
.
├── CLAUDE.md                         agent onboarding (auto-loaded by Claude Code)
├── README.md                         this file
├── docs/
│   ├── PLAN.md                       full implementation plan (phases, architecture)
│   └── PROGRESS.md                   phase tracker — update as work proceeds
├── timebox-app-requirements.md       behavioural source of truth (do not edit)
├── Personal Timebox App/             design handoff bundle (do not edit)
│   └── design_handoff_timebox/
├── src/                              SPA source
│   ├── components/                   shell, daily, weekly, monthly, settings, auth
│   ├── lib/                          time math, completion, theme provider, api wrappers
│   ├── hooks/                        useAuth, useDaily, useWeekly, useMonthly, useSettings
│   ├── pages/                        route components
│   └── styles/                       tokens.css, app.css, fonts.css
├── public/fonts/                     self-hosted Geist + Geist Mono variable woff2
├── functions/                        Cloudflare Pages Functions (the API)
│   └── api/                          auth/, account/, daily/, weekly/, monthly/, settings.ts
├── migrations/                       D1 schema migrations
├── tests/lib/                        Vitest unit tests for pure functions
└── wrangler.toml                     Cloudflare Pages + D1 binding config
```

## Scripts

| Script              | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Vite dev server (frontend only)              |
| `npm run build`     | TypeScript check + production bundle         |
| `npm test`          | Vitest unit tests                            |
| `npm run typecheck` | Type check only                              |
| `npm run deploy`    | Build + deploy to Cloudflare Pages           |

## Pointers for future you

- [`docs/PLAN.md`](docs/PLAN.md) is the canonical roadmap. Each phase ends with a runnable, demoable state.
- [`docs/PROGRESS.md`](docs/PROGRESS.md) records what's been done and what's next.
- The design handoff at `Personal Timebox App/design_handoff_timebox/Timebox.html` is the visual target — open it in a browser to compare.
- Notifications are explicitly out of scope for v1 (see PLAN.md). Auth is in scope.
