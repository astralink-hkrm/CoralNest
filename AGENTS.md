# AGENTS.md — CoralNest (ClawHub fork)

Read `/agent/SPEC.md` and `/agent/ROADMAP.md` fully before touching code.

## What you're doing
CoralNest is a fork of `openclaw/clawhub` (MIT licensed), stripped down to
**skills only** — no plugins, no packages, no "souls." Same stack they use
(TanStack Start + Convex + GitHub OAuth), rebranded, with the plugin/package
subsystem removed rather than just hidden.

## Non-negotiables
- Keep the MIT LICENSE file and its copyright notice intact (MIT requires
  this). Add a `NOTICE.md` stating this project is a fork of
  `openclaw/clawhub`, linking the original repo, per MIT's permissive terms.
- Remove, don't just hide, plugin/package code: Convex tables, routes, CLI
  commands, and UI for `packages`/plugins/"souls." If a table or route is
  ambiguous (shared by both skills and packages), check SPEC.md §2 before
  deleting.
- Do not silently keep OpenClaw ecosystem branding (logos, "Discord",
  "an OpenClaw project" footer links, ecosystem banner grid). Replace with
  CoralNest's own.
- Do not scrape or copy other users' skill *content* from clawhub.ai without
  checking their docs for a supported export/API first (see SPEC.md §5) —
  we fork the code, not other people's data.
- Never commit `.env.local` or any secret. GitHub OAuth app credentials and
  Convex/OpenAI keys are environment variables, set in Vercel + Convex
  dashboards, never in the repo.

## Working agreements
- Build/test/lint before ending any session:
  `bun install && bun run lint && bun run test && bun run build`
  All must pass before moving to the next milestone.
- Work through `/agent/ROADMAP.md` in order. Update `/agent/PROGRESS.md`
  (3-5 lines) after each milestone.
- If removing a feature breaks something non-obvious (e.g. a Convex schema
  migration, a shared component), note it in `/agent/OPEN_QUESTIONS.md`
  and pick the safest default (usually: keep the schema field but stop
  writing to it, rather than a destructive migration) rather than guessing
  irreversibly.

## Definition of done (per milestone)
1. `bun run build` succeeds.
2. `bun run test` passes (update/remove tests for deleted features).
3. No leftover references to "plugin," "package," "soul," or "OpenClaw
   ecosystem" in UI copy, nav, or docs (grep for these before calling a
   milestone done).
4. `agent/PROGRESS.md` updated.
