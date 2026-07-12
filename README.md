<p align="center">
  <h1 align="center">CoralNest</h1>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

CoralNest is a **public skill registry for agents**: publish, version, and search text-based agent skills (a `SKILL.md` plus supporting files). It's designed for fast browsing with a CLI-friendly API, moderation hooks, and vector search.

> Based on [openclaw/clawhub](https://github.com/openclaw/clawhub) (MIT). Plugin/package and soul functionality has been removed — this fork focuses on skills only.

<p align="center">
  <a href="/">CoralNest</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

## What you can do with it

- Browse skills + render their `SKILL.md`.
- Publish new skill versions with changelogs + tags (including `latest`).
- Rename an owned skill without breaking old links or installs.
- Merge duplicate owned skills into one canonical slug.
- Search via embeddings (vector index) instead of brittle keywords.
- Star + comment; admins/mods can curate and approve skills.
- Pin local skill installs so updates and force reinstalls cannot overwrite frozen copies.

## How it works (high level)

- Web app: TanStack Start (React, Vite/Nitro).
- Backend: Convex (DB + file storage + HTTP actions) + Convex Auth (GitHub OAuth).
- Search: OpenAI embeddings (`text-embedding-3-small`) + Convex vector search.

## CLI

The CLI is available as an npm package (see [packages/clawhub](packages/clawhub/) for source).

Common CLI flows:

- Auth: `clawhub login`, `clawhub whoami`
- Discover: `clawhub search ...`, `clawhub explore`
- Manage local installs: `clawhub install @owner/skill`, `clawhub pin <skill>`, `clawhub unpin <skill>`, `clawhub uninstall <skill>`, `clawhub list`, `clawhub update --all`
- Inspect without installing: `clawhub inspect @owner/skill`
- Publish skills: `clawhub skill publish <path>`
- Canonicalize owned skills: `clawhub skill rename <skill> <new-name>`, `clawhub skill merge <source> <target>`

### Removal permissions

- `clawhub uninstall <skill>` only removes a local install on your machine.
- Uploaded registry skills use soft-delete/restore (`clawhub delete <skill>` / `clawhub undelete <skill>` or API equivalents).
- Soft-delete/restore is allowed for the skill owner, publisher owner/admin, moderators, and admins.
- Hard delete is admin-only (management tools / ban flows).
- Owner rename keeps the old slug as a redirect alias.
- Owner merge hides the source listing and redirects the old slug to the canonical target.

## Telemetry

CoralNest tracks minimal **install telemetry** (to compute install counts) when you run `clawhub install` while logged in.
Disable via:

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## Repo layout

- `src/` — TanStack Start app (routes, components, styles).
- `convex/` — schema + queries/mutations/actions + HTTP API routes.
- `packages/schema/` — shared API types/routes for the CLI and app.
- [`docs/`](docs/README.md) — publishable documentation.
- [`specs/`](specs/README.md) — product specs, plans, and design history.

## Local dev

Prereqs: [Bun](https://bun.sh/) (Convex CLI runs via `bunx`, no global install needed).

```bash
bun install
cp .env.local.example .env.local
# edit .env.local — see CONTRIBUTING.md for local Convex values

# terminal A: local Convex backend
bunx convex dev

# terminal B: web app (port 3000)
bun run dev

# seed local QA fixtures and the public corpus
bun run seed:dev
```

## Environment

- `VITE_CONVEX_URL`: Convex deployment URL (`https://<deployment>.convex.cloud`).
- `VITE_CONVEX_SITE_URL`: Convex site URL (`https://<deployment>.convex.site`).
- `CONVEX_SITE_URL`: same as `VITE_CONVEX_SITE_URL` (auth + cookies).
- `SITE_URL`: App URL (local: `http://localhost:3000`).
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`: GitHub OAuth App.
- `OPENAI_API_KEY`: embeddings for search + indexing.

## Scripts

```bash
bun run dev
bun run build
bun run test
bun run coverage
bun run lint
```
