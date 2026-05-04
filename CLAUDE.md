# Timebox — agent onboarding

You are working on a personal day-planning web app. The user is the sole developer and the sole intended end user.

## Read these first (in order)

1. `README.md` — what this is, how to run it, current state.
2. `docs/PROGRESS.md` — what's been built, what's next.
3. `docs/PLAN.md` — the full implementation plan (phases, architecture, data model, decisions).
4. `timebox-app-requirements.md` — behavioural source of truth.
5. `Personal Timebox App/design_handoff_timebox/README.md` — visual design spec.

The implementation plan in `docs/PLAN.md` is the canonical roadmap. Update `docs/PROGRESS.md` as you complete tasks so future sessions can pick up where you left off.

## Stack at a glance

Vite + React 18 + TypeScript SPA. Cloudflare Pages Functions (Workers runtime) for the API. Cloudflare D1 (SQLite at the edge) for persistence. Free at personal scale. See `docs/PLAN.md` § Architecture for the full rationale.

## Hard invariants (don't violate without asking)

- **No notifications in v1.** Web Push and Service Worker scheduling are out of scope. Requirements §6, §6.4, and §10.3 are dropped.
- **Single tenant per deployment, but multi-account capable.** Auth is per requirements §2 (username/email + password, Argon2id, cookie sessions). No SSO/OAuth/MFA.
- **CSS tokens are copied verbatim** from `Personal Timebox App/design_handoff_timebox/styles/tokens.css` into `src/styles/tokens.css`. The token system is `[data-theme]` × `[data-accent]` attribute-driven — do not refactor into Tailwind or CSS-in-JS.
- **JSX components in `Personal Timebox App/design_handoff_timebox/components/` are ports, not refs.** When implementing daily/weekly/monthly views, the JSX layout + class names should be preserved closely; the existing `app.css` already styles them.
- **`fmtTime`, `fmtTimeShort`, `fmtDur` from `daily.jsx` get ported verbatim** into `src/lib/time.ts`. Their output is part of the visual contract.
- **All times stored UTC; times-of-day on the timeline as minutes since local midnight (int).** This matches the JSX prototype's data shape and simplifies pixel math.
- **Don't run `wrangler d1 create` or `wrangler pages deploy`.** Both touch the user's Cloudflare account; ask the user to run them.

## Workflow

- Use the plan in `docs/PLAN.md` to scope work. Each phase ends with a runnable, demoable state.
- Mark progress in `docs/PROGRESS.md` as you go (move items from "Pending" to "Completed" with a one-line note on what you verified).
- Compare visual output against `Personal Timebox App/design_handoff_timebox/Timebox.html` (open in a browser) when working on UI.
- Run `npm run build` before declaring a task done — it typechecks and bundles. Run `npx wrangler pages dev dist` for end-to-end checks against the API.
- Pure functions (`src/lib/time.ts`, `src/lib/timeline.ts`, `src/lib/completion.ts`) get unit tests in `tests/lib/` via Vitest.

## Memory

The user's machine has a Claude Code memory entry (`~/.claude/projects/F--Personal-Timebox/memory/`) — but the in-repo docs (this file + `docs/`) are the canonical project context. Memory is supplementary; treat the repo docs as authoritative if they disagree.
