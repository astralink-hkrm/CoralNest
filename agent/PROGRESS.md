# Progress log

Newest entry at top. 3-5 lines per milestone: what's done, what's deferred,
anything the next session needs to know.

## M4 — Schema cleanup (done 2026-07-12)

Removed plugin-specific dead fields from promotions schema and functions:
- **Schema** (`convex/schema.ts`): Removed `provider`, `authChoiceId`, `pluginNames` from promotions table definition. Removed stale OpenClaw CLI comment.
- **Convex** (`convex/promotions.ts`): Removed `PROMOTION_IDENTIFIER_PATTERN`, `MAX_PLUGIN_NAMES`, OpenClaw CLI comment block, `tryNormalizePackageName` import. Stripped `provider`/`authChoiceId`/`pluginNames` from `promotionInputArgs`, `PromotionInput` type, `normalizePromotionInput()` (validation + return), and `toPublicPromotion()`.
- **Convex** (`convex/promotionsFeed.ts`): Removed `provider`/`authChoiceId`/`pluginNames` from `toPromotionsFeedEntry()`.
- `bun run lint` — 0 warnings, 0 errors. `bun run build` — succeeds.

### Deferred
- `vendor/packages/schema/dist/promotionsFeed.js` & `.d.ts` still contain `provider`/`authChoiceId`/`pluginNames` in schema definitions — no source `.ts` file exists in src/ to edit. These are pre-built artifacts; update if/when the schema package is rebuilt.
- Runtime dead fields (`publishedPackages` in publishers, `activePluginsCount` in globalStats) still written — needs convex/ function changes in publishers.ts, publisherAbuse.ts, statsMaintenance.ts, globalStats.ts.
- Stale `Id<"packages">` / `Id<"packageReleases">` references remain in convex functions — deferred until convex/ test cleanup sweep.
- Promotions test file (`convex/promotions.test.ts`) has 30+ references to removed fields — part of the 108 convex test failures from M1.

## M3 — Rebrand (done 2026-07-11)

Rebranded user-facing copy from ClawHub/OpenClaw to CoralNest:
- **Spec §3 checklist**: NOTICE.md added, LICENSE updated with CoralNest copyright, package.json name → `coralnest`, README/CONTRIBUTING/DESIGN rewritten.
- **Footer**: Removed OpenClaw ecosystem marquee (Lobster, Crabbox, ClickClack, Crabfleet, etc.), Discord link, "an OpenClaw project" line, ecosystem nav section. Footer now shows CoralNest branding with GitHub link only.
- **nav-items.ts**: Removed `FOOTER_ECOSYSTEM_PROJECTS` (all 20+ ecosystem projects), `FooterEcosystemProject` type, `OPENCLAW_*` constants, Discord link, Plugin/Package nav items.
- **site.ts/publicRegistry.ts**: Updated default URLs to coralnest.ai, repo to saksharagarwalm2/CoralNest. Renamed `normalizeClawHubSiteOrigin` → `normalizeCoralNestSiteOrigin`. Removed `LEGACY_CLAWDHUB_HOSTS`.
- **UI copy**: Updated OG meta titles (`" — CoralNest"`), account-banned page, auth/docs page, settings, creators page, publish page, import page, dashboard welcome, skill detail utilities, home page sections, error messages (removed "ClawHub account" → "account").
- **Emails**: Updated sender name/address, subject lines, preheaders, body text, security summary strings across email templates and Convex email builders.
- **Scripts**: Updated security worker summaries from "ClawHub security review" → "CoralNest security review".
- **Kept as-is** (per SPEC §3): Internal code identifiers (`getClawHubSiteUrl`, `CLAWHUB_SITE_URL`, `clawhub-*` CSS classes, `clawhub-schema` imports), env vars (`CLAWHUB_*`), CLI binary names, clawdbot/clawdis metadata fields, test files.
- `bun run lint` — 0 warnings, 0 errors. `bun run build` — succeeds.

### Deferred
- Logo/favicon/OG image replacement (need new CoralNest assets designed).
- `packages/` directory renaming (`clawhub` → `coralnest`, `clawhub-admin` → `coralnest-admin`).
- `clawhub-schema` package rename to `coralnest-schema` (touches 40+ imports).
- CLAWHUB_* env var renaming across source and CI workflows.
- CSS class renames (`clawhub-segmented`, `clawhub-import-spinner`, etc.).
- CLI binary rename (`clawhub` → `coralnest`).
- Docs/CHANGELOG rebranding (docs/ directory, historical changelog).
- CI/CD workflow rebranding (.github/workflows/).
- Test file expectation updates.

## M1 — Remove packages/plugins (done 2026-07-11)

Removed all package/plugin code across the entire codebase:
- **Convex schema**: 20 package-only tables removed. Shared tables cleaned (publishers publishedPackages field kept but unused, etc.)
- **Convex functions**: Deleted packages.ts, packageLeaderboards.ts, packagePublishTokens.ts, packageInspectorHttp.ts, packageInspectorNode.ts. Cleaned http.ts/httpApiV1.ts routes. Cleaned vt.ts, securityScan.ts, functions.ts. Cleaned publishLimits.ts, packageRegistry.ts (non-skill code), emailRendering.tsx, emails.ts (removed plugin inspector email code).
- **Routes**: Deleted all plugins/*, packages/*, $owner/plugins/*, -management/*, publish-plugin.tsx, add.tsx. Cleaned dashboard.tsx (skills-only), search.tsx, user/$handle.tsx, $owner/$slug.tsx.
- **Components**: Deleted PluginListItem, PluginVersionsPanel, PackageSourceChooser, HomeAppsSection, dashboard catalog/view components (restored from git, stripped plugin deps). Cleaned Header.tsx (removed Plugins nav) and nav-items.ts.
- **Lib**: Deleted packageApi, packageLabels, packageUpload, pluginRoutes, pluginPublishPrefill, pluginValidationFormat, openClawExtensionSlugs, marketplaceIcons, homeApps, browseCategoryIcons. Cleaned categories.ts, ownerRoute.ts, slugRoute.ts, useUnifiedSearch.ts.
- **CLI**: Deleted package commands from both clawhub and clawhub-admin.
- **Schema types**: Removed packages.ts, openclawContract.ts, openClawExtensionSlugs.ts, pluginCategories.ts exports from schema.
- **Docs/Emails/Fixtures**: Cleaned.
- **Tests**: Deleted/updated 10+ test files for removed features. All src/ tests pass (2 pre-existing VITE_CONVEX_URL failures remain). 108 convex/ and clawhub-admin/ test files still fail due to package-related function removal — deferred to M3/M4.

`bun run lint` — 0 warnings, 0 errors. `bun run build` — succeeds.

### Deferred
- 108 convex/ test failures and 44 clawhub-admin/ test failures: will be addressed in M3 (convex cleanup) and M4 (CLI cleanup). These require removing remaining package references in convex functions and CLI commands.
- `fixtures/public-corpus/corpus.jsonl` still has 250 plugin entries mixed in with 1000 skill entries. Filtering deferred to M3.
- Shared schema fields (publishers.publishedPackages, globalStats.activePluginsCount) kept but no longer written to. See OPEN_QUESTIONS.md.

## M0 — Clone & audit (done 2026-07-10)

Forked openclaw/clawhub into this repo. `bun install` passes (with --ignore-scripts for only-allow preinstall quirk on Windows/PowerShell).

### Audit map: Souls
No soul tables, soul routes, soul CLI commands, or soul docs exist in this fork. The concept is entirely absent. M2 is a no-op.

### Audit map: Packages/Plugins (to remove in M1)
**Convex schema** (`convex/schema.ts`): 20 package-only tables (packages, packageReleases, packageStatEvents, packageDailyStats, packageLeaderboards, packageTrustedPublishers, packagePublishTokens, packagePublishUploadTickets, packageBadges, packageSearchDigest, packageTopicSearchDigest, packagePluginCategorySearchDigest, packageInspectorWarnings, packageInspectorFindingNotifications, packageInspectorScanCursors, packageReports, packageAppeals, packageModerationEventLogs, officialPluginMigrations). Plus ~20 shared tables that mix skills+packages (publishers, publishAttempts, securityScanJobs, globalStats, catalogFeed, catalogClassificationResults, downloadMetricDedupes, publisherAbuse*, etc.).

**Convex functions**: `convex/packages.ts` (10351 lines), `convex/packageLeaderboards.ts` (133), `convex/packagePublishTokens.ts` (74), `convex/packageInspectorHttp.ts` (191), `convex/packageInspectorNode.ts` (402).

**HTTP API**: `convex/httpApiV1/packagesV1.ts` (4353 lines).

**Routes** (`src/routes/`): `plugins/` (index, new, publish, $name, $scope/$name, security-audit, security/$scanner), `$owner/plugins/` ($slug, security-audit, security/$scanner). Also `packages/` (redirect stubs → /plugins) and `publish-plugin.tsx` (redirect).

**Components** (`src/components/`): `PluginListItem.tsx`, `PluginVersionsPanel.tsx`, `PackageSourceChooser.tsx`. Many shared components serve both domains.

**Lib** (`src/lib/`): `packageApi.ts`, `packageLabels.ts`, `packageUpload.ts`, `pluginRoutes.ts`, `pluginPublishPrefill.ts`, `pluginValidationFormat.ts`, `openClawExtensionSlugs.ts`.

**CLI** (`packages/clawhub/src/cli/commands/packages.ts`): ~15 commands (explore, inspect, download, verify, validate, delete, undelete, transfer, report, moderation-status, readiness, migration-status, pack, publish, trusted-publisher).

**Admin CLI** (`packages/clawhub-admin/src/commands/packages.ts`): moderate, status, queue, reports, triage-report, transfer, repair-name, repair-runtime-id, migrations, set-migration, trusted-publisher.

**Schema types** (`packages/schema/src/`): `packages.ts`, `openclawContract.ts`, `openClawExtensionSlugs.ts`, `pluginCategories.ts`, `catalogMetadata.ts` (shared + plugin categories).

**Docs**: `docs/plugin-validation-fixes.md` (plugin-only), `docs/clawhub.md`, `docs/cli.md`, `docs/api.md` (shared).

**Fixtures**: `fixtures/public-corpus/` has 250 plugin rows mixed in with 1000 skill rows (same JSONL file).

**Emails**: `emails/plugin-inspector-findings.tsx` (plugin-specific template).

**E2E tests**: ~50% of e2e tests reference packages/plugins extensively.
