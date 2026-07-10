# CoralNest — Fork Spec (based on openclaw/clawhub)

## 1. Source
Fork: https://github.com/openclaw/clawhub (MIT license)
Live reference (for behavior comparison only, not data scraping):
https://clawhub.ai
Docs: https://docs.openclaw.ai/clawhub/

Confirmed stack from the upstream README: TanStack Start (React, Vite/Nitro)
web app, Convex for database + file storage + HTTP actions, Convex Auth for
GitHub OAuth, OpenAI embeddings (`text-embedding-3-small`) + Convex vector
search for search, shared API types in `packages/schema`. Hosting is Vercel
(there's a `vercel.json` at repo root).

Because this fork keeps Convex + GitHub OAuth, it is **not** a static
GitHub Pages site. GitHub is source control + CI (via GitHub Actions) and
the identity provider (OAuth). Convex is the database. Vercel is the host.
All three have working free tiers — no cost to start.

## 2. What to keep vs. strip

Upstream repo has three product surfaces sharing infrastructure:
1. **Skills** — `SKILL.md` + supporting files, versioned, searchable, with
   stars/comments/moderation. **KEEP.**
2. **Souls** — `SOUL.md`, a separate content type (personas/agent
   character definitions per their docs). **REMOVE** — out of scope for
   CoralNest v1, and it's a genuinely separate schema/route/UI surface, not
   an alias of skills, so it can be cut cleanly.
3. **Packages** (plugins — native code plugins + bundle plugins, `/packages`
   API, nix-clawdbot plugin pointers). **REMOVE** — this is the part that
   needs the most caution: code-execution trust, `openclaw.compat.pluginApi`
   versioning, nix integration. Cutting it fully (not just hiding the UI)
   removes a meaningful chunk of attack surface too, which is a genuine
   simplification, not just a scope cut.

Where to look for each (from the upstream layout):
- `convex/` — schema + queries/mutations/actions. Expect separate tables/
  files for skills vs. souls vs. packages; remove the latter two's schema,
  functions, and HTTP routes.
- `src/` — routes and components. Remove soul and package routes/pages/nav
  entries.
- `packages/schema/` — shared types. Remove soul/package types, keep skill
  types.
- CLI (`clawhub`/`clawdhub` binaries in repo root) — remove `package publish`,
  `package explore`, `package inspect`, nix-plugin commands. Keep
  `login`, `whoami`, `search`, `install`, `publish` (skills), `pin`/`unpin`,
  `inspect`, `rename`, `merge`.
- `docs/` — remove or archive plugin/soul docs; update `docs/skill-format.md`
  as the primary reference.
- `fixtures/public-corpus` — check whether this seeds skills-only or mixed
  fixtures; keep skill fixtures, drop the rest.

Do this as a real removal pass (delete code, delete Convex schema fields,
delete routes) rather than just hiding nav items — a hidden-but-present
plugin system is still attack surface and still confuses contributors
reading the code.

## 3. Rebranding checklist
- Project name: ClawHub → CoralNest everywhere (package.json, page titles,
  meta tags, README, docs, CLI binary name — rename `clawhub`/`clawdhub`
  scripts to `coralnest`).
- Remove OpenClaw ecosystem cross-links: the footer banner grid (Lobster,
  Crabbox, ClickClack, Crabfleet, etc.), "Built alongside the OpenClaw
  ecosystem," Discord invite, "an OpenClaw project" line.
- Replace logo/favicon/OG images with CoralNest's own (coral/reef visual
  identity, per the earlier naming discussion).
- Update `vercel.json`, `package.json` repository/homepage fields, and the
  GitHub OAuth App registration (new Client ID, new callback URL) to point
  at your own fork and domain.
- Add `NOTICE.md` at repo root: "CoralNest is a fork of openclaw/clawhub
  (MIT License). Plugin/package and soul functionality has been removed;
  this fork focuses on skills only." Keep the original LICENSE file's
  copyright line intact per MIT terms — add your own copyright line below
  it for new code, don't replace it.

## 4. Environment / hosting setup (real steps, not GitHub Pages)
- Convex: create a new Convex project (free tier), get `VITE_CONVEX_URL` /
  `VITE_CONVEX_SITE_URL` / `CONVEX_SITE_URL`.
- GitHub OAuth App: register a new one at
  github.com/settings/developers, scoped to your fork's domain, giving you
  `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — set these as Convex/Vercel
  environment variables, never committed. This is safe specifically because
  Convex holds the secret server-side; this is the backend-based OAuth
  pattern flagged as necessary (vs. the static-site OAuth risk discussed
  earlier for a no-backend design).
- OpenAI API key for embeddings/search — same handling, env var only.
- Vercel: connect the forked repo, set the above env vars in the Vercel
  project settings, deploy. GitHub Actions can still run lint/test/build
  checks on every PR (CI), independent of the Vercel deploy hook.

## 5. On reusing existing ClawHub skill content
Do **not** scrape clawhub.ai's live listings to seed your own database —
that's other people's published content sitting in their production
system, not something to copy wholesale without checking terms. Two
legitimate ways to get real starter content instead:
1. **Link, don't copy.** `docs/skill-format.md` (from the fork) documents
   the `SKILL.md` format; many of the individual skills referenced on
   clawhub.ai are themselves open source in their authors' own repos (e.g.
   `github.com/openclaw/agent-skills` is a separate, openly shared skills
   collection). Point your "Import from GitHub" flow at repos like that,
   with attribution, rather than duplicating clawhub.ai's database.
2. **Check for a documented export/API first.** The clawhub.ai homepage
   references paths like `/api/v1/skills`, `/audit`, `/ship` in its footer
   marquee — check `docs.openclaw.ai/clawhub/` for whether any of this is a
   supported public API before building against it. If it's undocumented,
   treat it as internal and don't depend on it.
3. Otherwise, seed with 4-5 original sample skills you write yourself
   (same approach as any registry launch) — see `/agent/PROGRESS.md`
   milestone M6.

## 6. Categories / taxonomy
Reuse the category list from the earlier CoralNest spec (agents,
prompt-engineering, rag, ai-workflows, llm-integrations, automation,
ai-apis, mcp, memory, templates, datasets, evaluation, fine-tuning,
deployment, tutorials) as the closed category list in the skill schema,
replacing whatever category enum (if any) exists upstream — check
`packages/schema` for the current skill metadata shape before changing it,
since search/filtering UI likely already depends on it.

## 7. Security carry-overs worth keeping
Upstream already does two things worth explicitly preserving:
- Security analysis of skill frontmatter against declared runtime
  requirements (env vars, binaries) — keep this, it's directly the
  "verified vs. unverified" signal from your original trust-tier idea.
- Soft-delete/restore for skills, hard-delete admin-only — keep this
  moderation model as-is.
