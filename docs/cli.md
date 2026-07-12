---
summary: "CLI reference: commands, flags, config, and lockfile behavior."
read_when:
  - Using the ClawHub CLI
  - Debugging install, update, or publish
---

# CLI

CLI package: `clawhub`, bin: `clawhub`.

Install it globally with npm or pnpm:

```bash
npm i -g clawhub
# or
pnpm add -g clawhub
```

Then verify it:

```bash
clawhub --help
clawhub login
clawhub whoami
```

## Global flags

- `--workdir <dir>`: working directory (default: cwd; falls back to Clawdbot workspace if configured)
- `--dir <dir>`: install dir under workdir (default: `skills`)
- `--site <url>`: base URL for browser login (default: `https://clawhub.ai`)
- `--registry <url>`: API base URL (default: discovered, else `https://clawhub.ai`)
- `--no-input`: disable prompts

Env equivalents:

- `CLAWHUB_SITE` (legacy `CLAWDHUB_SITE`)
- `CLAWHUB_REGISTRY` (legacy `CLAWDHUB_REGISTRY`)
- `CLAWHUB_WORKDIR` (legacy `CLAWDHUB_WORKDIR`)

### HTTP proxy

The CLI respects standard HTTP proxy environment variables for systems behind
corporate proxies or restricted networks:

- `HTTPS_PROXY` / `https_proxy`
- `HTTP_PROXY` / `http_proxy`
- `NO_PROXY` / `no_proxy`

When any of these variables is set, the CLI routes outbound requests through
the specified proxy. `HTTPS_PROXY` is used for HTTPS requests, `HTTP_PROXY`
for plain HTTP. `NO_PROXY` / `no_proxy` is respected to bypass the proxy for
specific hosts or domains.

This is required on systems where direct outbound connections are blocked
(e.g. Docker containers, Hetzner VPS with proxy-only internet, corporate
firewalls).

Example:

```bash
export HTTPS_PROXY=http://proxy.example.com:3128
export NO_PROXY=localhost,127.0.0.1
clawhub search "my query"
```

When no proxy variable is set, behavior is unchanged (direct connections).

## Config file

Stores your API token + cached registry URL.

- macOS: `~/Library/Application Support/clawhub/config.json`
- Linux/XDG: `$XDG_CONFIG_HOME/clawhub/config.json` or `~/.config/clawhub/config.json`
- Windows: `%APPDATA%\\clawhub\\config.json`
- Legacy fallback: if `clawhub/config.json` does not exist yet but `clawdhub/config.json` does, the CLI reuses the legacy path
- override: `CLAWHUB_CONFIG_PATH` (legacy `CLAWDHUB_CONFIG_PATH`)

## Commands

### `login` / `auth login`

- Default: opens browser to `<site>/cli/auth` and completes via loopback callback.
- Headless: `clawhub login --token clh_...`
- Remote/headless interactive: `clawhub login --device` prints a code and waits while you authorize it at `<site>/cli/device`.

### `whoami`

- Verifies the stored token via `/api/v1/whoami`.

### `token`

- Prints the stored API token to stdout.
- Useful for piping a local login token into CI secret setup commands.

### `star <skill>` / `unstar <skill>`

- Adds/removes a skill from your highlights.
- Calls `POST /api/v1/stars/<slug>` and `DELETE /api/v1/stars/<slug>`.
- `--yes` skips confirmation.

### `search <query...>`

- Calls `/api/v1/search?q=...`.
- Output includes the skill slug, owner handle, display name, and relevance score.
- Search favors exact slug/name token matches before download popularity. A standalone slug token such as `map` matches `personal-map` more strongly than the substring inside `amap`.
- Popularity is a small ranking prior, not a guarantee of top placement.
- If a skill should appear but does not, run `clawhub inspect @owner/slug` while logged in to check owner-visible moderation diagnostics before renaming metadata.

### `explore`

- Lists newest skills via `/api/v1/skills?limit=...&sort=createdAt` (sorted by `createdAt` desc).
- Flags:
  - `--limit <n>` (1-200, default: 25)
  - `--sort newest|updated|rating|downloads|trending` (default: newest). Legacy install sort aliases still work for compatibility.
  - `--json` (machine-readable output)
- Output: `<slug>  v<version>  <age>  <summary>` (summary truncated to 50 chars).

### `inspect @owner/slug`

- Fetches skill metadata and version files without installing.
- `--version <version>`: inspect a specific version (default: latest).
- `--tag <tag>`: inspect a tagged version (e.g. `latest`).
- `--versions`: list version history (first page).
- `--limit <n>`: max versions to list (1-200).
- `--files`: list files for the selected version.
- `--file <path>`: fetch raw file content (text files only; 200KB limit).
- `--json`: machine-readable output.

### `install @owner/slug`

- Resolves latest version for the named owner and skill.
- Downloads zip via `/api/v1/download`.
- Extracts into `<workdir>/<dir>/<slug>`.
- Refuses to overwrite pinned skills; run `clawhub unpin <skill>` first.
- Writes:
  - `<workdir>/.clawhub/lock.json` (legacy `.clawdhub`)
  - `<skill>/.clawhub/origin.json` (legacy `.clawdhub`)

### `uninstall <skill>`

- Removes `<workdir>/<dir>/<slug>` and deletes the lockfile entry.
- Sends best-effort telemetry while logged in so current install counts can be
  deactivated.
- Interactive: asks for confirmation.
- Non-interactive (`--no-input`): requires `--yes`.

### `list`

- Reads `<workdir>/.clawhub/lock.json` (legacy `.clawdhub`).
- Shows `pinned` next to skills frozen with `clawhub pin`, including the optional reason.

### `pin <skill>`

- Marks an installed skill as pinned in the lockfile.
- `--reason <text>` records why the skill is frozen.
- Pinned skills are skipped by `update --all` and rejected by direct `update <skill>`.
- Pinned skills also reject `install --force` so the local bytes cannot be replaced accidentally.

### `unpin <skill>`

- Removes the lockfile pin from an installed skill so future updates can modify it.

### `update [@owner/slug]` / `update --all`

- Computes fingerprint from local files.
- If fingerprint matches a known version: no prompt.
- If fingerprint does not match:
  - refuses by default
  - overwrites with `--force` (or prompt, if interactive)
- Pinned skills are never updated by `--force`.
- `update <skill>` fails fast for pinned skills and tells you to run `clawhub unpin <skill>` first.
- `update --all` skips pinned slugs and prints a summary of what stayed frozen.

### `skill publish <path>`

- Compares the local bundle fingerprint with ClawHub and exits successfully when
  the content is already published.
- New skills default to `1.0.0`; changed skills default to the next patch
  version.
- `--version <version>` explicitly selects a version and publishes even when the
  content matches an existing version.
- `--dry-run` resolves the publish without uploading; `--json` prints a
  machine-readable result.
- `--owner <handle>` publishes under an org/user publisher handle when the
  actor has publisher access.
- `--migrate-owner` moves an existing skill to `--owner` while publishing a new
  version. Requires admin/owner access on both publishers.
- Owner and review behavior is explained in `docs/publishing.md`.
- Publishing a skill means it is released under `MIT-0` on ClawHub.
- Published skills are free to use, modify, and redistribute without attribution.
- ClawHub does not support paid skills or per-skill pricing.
- Legacy alias: `publish <path>`.

```bash
clawhub skill publish ./my-skill --dry-run
clawhub skill publish ./my-skill
clawhub skill publish ./my-skill --version 2.0.0
```

#### GitHub Actions

ClawHub's reusable
[`skill-publish.yml`](https://github.com/openclaw/clawhub/blob/main/.github/workflows/skill-publish.yml)
workflow calls `skill publish` for one `skill_path`, or for each immediate skill
folder under `root` (default: `skills`). It skips unchanged skills and uses the
same automatic patch-version behavior.

Set `dry_run: true` to preview without a token. Real publishes require the
`clawhub_token` secret.

### `sync`

- Scans the current workdir, the configured skills directory, and any
  `--root <dir>` folders for local skill folders containing `SKILL.md` or
  `skill.md`.
- Compares each local skill fingerprint with ClawHub and publishes only new or
  changed skills.
- New skills publish as `1.0.0`; changed skills publish the next patch version
  by default. Use `--bump minor|major` for update batches that should move by a
  larger semver step.
- `--dry-run` shows the publish plan without uploading; `--json` prints a
  machine-readable plan.
- `--all` publishes every new or changed skill without prompting. Without
  `--all`, interactive terminals let you select the skills to publish.
- `--owner <handle>` publishes under an org/user publisher handle when the
  actor has publisher access.
- `sync` is one-way publish only. It does not install, update, download, or
  report install/download telemetry.

```bash
clawhub sync --all --dry-run
clawhub sync --all
clawhub sync --root ./skills --owner openclaw --bump minor
```

### `scan --slug <slug>`

- Requires `clawhub login`.
- Runs ClawHub ClawScan through `POST /api/v1/skills/-/scan`, then polls until the scan is terminal.
- Scans are asynchronous and may take time to complete. While queued, the terminal spinner shows the current prioritized scan position and how many scans are ahead.
- Published scans require ownership or publisher management access. Moderators/admins can use the same backend through `clawhub-admin`.
- `--update` is valid only with `--slug`; it writes successful published scan results back to the selected version.
- `--output <file.zip>` downloads the full report archive with `manifest.json`, `clawscan.json`, `skillspector.json`, `static-analysis.json`, `virustotal.json`, and `README.md`.
- `--json` prints the full poll response for automation.
- Local path scans are no longer supported. Upload a new version, then use `scan download` to retrieve the stored scan results for that submitted version.

```bash
clawhub scan --slug gifgrep
clawhub scan --slug gifgrep --version 1.2.3
clawhub scan --slug gifgrep --update --output report.zip
```

### `scan download <name>`

- Requires `clawhub login`.
- Downloads the stored scan report ZIP for a submitted skill version, including versions that were blocked or hidden by ClawHub security checks.
- Skill downloads use the skill slug.
- `--version` is required so authors inspect the exact submitted version that ClawHub blocked.
- `--output <file.zip>` chooses the destination path.

```bash
clawhub scan download gifgrep --version 1.2.3
```

#### GitHub Actions

ClawHub ships an official reusable workflow at
[`/.github/workflows/skill-publish.yml`](../.github/workflows/skill-publish.yml)
for skill repos and catalog repos.

Typical catalog setup:

```yaml
name: Skill Publish

on:
  pull_request:
  workflow_dispatch:

jobs:
  dry-run:
    if: github.event_name == 'pull_request'
    uses: openclaw/clawhub/.github/workflows/skill-publish.yml@v1
    with:
      owner: nvidia
      dry_run: true

  publish:
    if: github.event_name == 'workflow_dispatch'
    uses: openclaw/clawhub/.github/workflows/skill-publish.yml@v1
    with:
      owner: nvidia
      dry_run: false
    secrets:
      clawhub_token: ${{ secrets.CLAWHUB_TOKEN }}
```

Notes:

- `root` defaults to `skills` for catalog repos.
- Pass `skill_path: skills/review-helper` to process one skill folder.
- `owner` maps to the CLI `--owner` flag; omit it to publish as the authenticated user.
- V1 skill publishing uses `clawhub_token`.

### `delete <skill>`

- Without `--version`, soft-delete a skill (owner, moderator, or admin).
- Calls `DELETE /api/v1/skills/{slug}`.
- Owner-initiated soft deletes reserve the slug for 30 days; the command prints the expiry time.
- `--version <version>` permanently deletes one owned non-latest version through a fail-closed,
  version-specific route.
  Deleted versions cannot be restored or republished. Publish a replacement before deleting the
  current latest version. Platform staff do not bypass ownership for this version-only flow.
- `--reason <text>` records a moderation note on a whole-skill soft-delete and audit log.
- `--note <text>` is an alias for `--reason`.
- `--yes` skips confirmation.

### `undelete <skill>`

- Restore a hidden skill (owner, moderator, or admin).
- There is no version undelete; permanently deleted versions cannot be restored.
- Calls `POST /api/v1/skills/{slug}/undelete`.
- `--reason <text>` records a moderation note on the skill and audit log.
- `--note <text>` is an alias for `--reason`.
- `--yes` skips confirmation.

### `hide <skill>`

- Hide a skill (owner, moderator, or admin).
- Alias for `delete`.

### `unhide <skill>`

- Unhide a skill (owner, moderator, or admin).
- Alias for `undelete`.

### `skill rename <skill> <new-name>`

- Rename an owned skill and keep the previous slug as a redirect alias.
- Calls `POST /api/v1/skills/{slug}/rename`.
- `--yes` skips confirmation.

### `skill merge <source> <target>`

- Merge one owned skill into another owned skill.
- The source slug stops listing publicly and becomes a redirect alias to the target.
- Calls `POST /api/v1/skills/{sourceSlug}/merge`.
- `--yes` skips confirmation.

### `transfer`

- Ownership transfer workflow.
- Transfers to user handles create a pending request that the recipient accepts.
- Transfers to org/publisher handles apply immediately only when the actor has
  admin access to both the current owner and destination publisher.
- Subcommands:
  - `transfer request <skill> <handle> [--message "..."] [--yes]`
  - `transfer list [--outgoing]`
  - `transfer accept <skill> [--yes]`
  - `transfer reject <skill> [--yes]`
  - `transfer cancel <skill> [--yes]`
- Endpoints:
  - `POST /api/v1/skills/{slug}/transfer`
  - `POST /api/v1/skills/{slug}/transfer/accept`
  - `POST /api/v1/skills/{slug}/transfer/reject`
  - `POST /api/v1/skills/{slug}/transfer/cancel`
  - `GET /api/v1/transfers/incoming`
  - `GET /api/v1/transfers/outgoing`

### `publisher create <handle>`

- Creates an org publisher owned by the authenticated user.
- The handle is normalized to lowercase and may be passed with or without `@`.
- Newly created org publishers are not trusted/official by default.
- Fails if the handle is already used by an existing publisher, user, or reserved route.

```bash
clawhub publisher create opik --display-name "Opik"
```

### Install telemetry

- Sent after `clawhub install <slug>` when logged in, unless
  `CLAWHUB_DISABLE_TELEMETRY=1` is set.
- Reporting is best-effort. Install commands do not fail if telemetry is
  unavailable.
- Details: `docs/telemetry.md`.
