# CoralNest — Fork Kickoff Prompt

Before running this: fork https://github.com/openclaw/clawhub to your own
GitHub account (button on that page), then clone your fork locally, then
copy `AGENTS.md` and the `agent/` folder from this pack into the repo root
(they'll sit alongside the upstream `AGENTS.md`/`CLAUDE.md` — replace
upstream's `AGENTS.md` with this one, since ours is the one written for
this fork's plan; you can keep `CLAUDE.md` and `DESIGN.md`/`VISION.md` from
upstream as background reading for the agent, just don't follow their
product direction for the removed features).

Paste the following into Claude Code (or your agentic coding tool), run
from the root of your cloned fork:

---

You're working in a fork of `openclaw/clawhub`, being turned into
CoralNest: the same skill registry, with plugins/packages and souls fully
removed, rebranded, and redeployed under new infrastructure you control.

Read `AGENTS.md` and all of `agent/SPEC.md` before making any changes.
Both are already in this repo. Also skim upstream's own `README.md`,
`DESIGN.md`, and `VISION.md` for context on how the current app works —
but note we are deliberately cutting scope from their vision, not
matching it.

Work through `agent/ROADMAP.md` milestone by milestone, in order:

1. Before each milestone, state in one sentence what you're about to do.
2. Do it.
3. Run `bun install && bun run lint && bun run test && bun run build` —
   all must pass. If the removal broke something, fix it before moving on;
   don't leave a milestone half-done.
4. Grep for leftover references to removed features/branding per the
   Definition of Done in `AGENTS.md`.
5. Append a short entry to `agent/PROGRESS.md`.
6. Commit with a Conventional Commits message.
7. Move to the next milestone without waiting for approval, unless a rule
   below tells you to stop.

Rules:
- M0 is read-and-map only — do not delete anything until you've written
  the file/table/route map into `agent/PROGRESS.md` and it's clear which
  pieces are skill-only vs. package/soul-only vs. shared.
- Prefer real deletion (schema, routes, CLI commands, components) over
  hiding UI. A hidden-but-present system is still attack surface.
- Never touch the LICENSE file's original copyright line — add to it, per
  MIT terms, don't remove it. Add NOTICE.md per SPEC §3.
- Never scrape or copy live data from clawhub.ai. Seed content per
  SPEC §5 only (attributed external links, or original sample skills).
- If a removal is ambiguous (a field/table touches both skills and
  removed features), don't guess destructively — keep the safer partial
  state, note it in `agent/OPEN_QUESTIONS.md`, and move on.
- New GitHub OAuth App, new Convex project, new env vars — none of the
  original ClawHub's credentials should ever appear in this repo.
- Stop after M8 with a full `agent/PROGRESS.md` summary. Don't continue
  into new feature work unattended past that point.

Go.
