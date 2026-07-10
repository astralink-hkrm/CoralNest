# Roadmap — fork milestone order

## M0 — Clone & audit
- Fork `openclaw/clawhub` to your own GitHub account/org.
- Clone locally. `bun install`, get local dev running per upstream
  CONTRIBUTING.md (local Convex via `bunx convex dev`, `bun run dev`).
- Read through `convex/`, `src/`, `packages/schema/`, and the CLI entry
  points. Produce a short written map (add to `agent/PROGRESS.md`) of every
  file/table/route that's skill-only, package-only, soul-only, or shared —
  this map is what M1-M3 execute against. Don't start deleting yet.

## M1 — Remove packages/plugins
- Delete Convex schema tables, queries/mutations/actions, and HTTP routes
  for packages (per SPEC §2).
- Remove CLI commands: `package publish`, `package explore`,
  `package inspect`, `package delete`/`undelete`, nix-plugin frontmatter
  handling.
- Remove package-related UI routes, nav entries, and components in `src/`.
- Remove package fixtures from `fixtures/public-corpus` if present.
- Build must still succeed after this milestone — fix any imports that
  broke from the removal before moving on.

## M2 — Remove souls
- Same pass as M1, for `SOUL.md`/souls: schema, routes, CLI, UI, docs,
  fixtures.
- Build must still succeed.

## M3 — Rebrand
- Work through SPEC §3's checklist fully: name, logos, OG images, footer,
  ecosystem links, Discord link, package.json metadata.
- Grep the whole repo for "ClawHub," "clawhub," "OpenClaw," "clawd," and
  review every hit — rename or remove per context (don't blindly
  find-replace inside code identifiers/APIs that would break Convex
  schema names; rebrand user-facing strings and project metadata, not
  internal variable names, unless SPEC.md says otherwise).
- Add `NOTICE.md`. Confirm LICENSE file's original copyright line is
  intact, add your own line beneath it for new work.

## M4 — Schema cleanup
- With packages/souls fully removed, review the Convex schema for any
  now-dead fields, indexes, or foreign keys that referenced them. Clean up
  properly rather than leaving orphaned schema.
- Confirm the skill schema's `category` field matches SPEC §6's fixed
  taxonomy; migrate if it doesn't.

## M5 — New environment setup
- Register a new GitHub OAuth App for this fork (new callback URL).
- Create a new Convex project.
- Get an OpenAI API key (or confirm reuse of an existing one you control).
- Set all env vars in Convex + Vercel dashboards — never in the repo.
  Update `.env.local.example` to match only what's still needed
  (post package/soul removal, some vars may no longer apply).

## M6 — Seed content
- Do NOT scrape clawhub.ai. Per SPEC §5: either link to genuinely open
  external skill repos with attribution, or write 4-5 original sample
  skills covering different categories/difficulty levels.
- Confirm these render correctly through the full flow: publish → appears
  in search → skill detail page renders README, stars, changelog.

## M7 — Deploy
- Connect the (rebranded, stripped) repo to Vercel, confirm the Convex +
  Vercel + GitHub OAuth pipeline works end to end on the live URL: login,
  publish a skill, star it, search finds it.
- Add a GitHub Actions workflow that runs `bun run lint && bun run test &&
  bun run build` on every PR — this is your CI gate, independent of the
  Vercel deploy hook.

## M8 — Polish
- Only after M0-M7 are solid: update remaining docs (README, docs/, CLI
  help text) to describe CoralNest as its own product, not "ClawHub
  minus plugins." Review UI copy end to end for leftover ecosystem
  references missed in M3.

Stop after M8 and summarize in `agent/PROGRESS.md` rather than continuing
into open-ended feature work unattended.
