# Implementation Plan

## Overview

Implements the live app shell decoupling bugfix for CoralNest. The workflow follows the exploratory bugfix methodology: write a bug condition exploration test first (expect failure), write preservation tests second (expect pass on unfixed code), then apply all seven fixes, and finally validate both test suites pass cleanly.

The core architectural change is introducing `src/lib/tierTheme.ts` as the single source of truth for per-tier visual tokens. Three components (`CoralPageWrapper`, `HomeCatalogSection`, `CatalogAssetDetail`) currently hardcode colors independently; after the fix they all import from `tierTheme.ts`. Supporting changes fix the stale unit-test mock, the homepage hero logo and missing Freelancer analogy table, and the Persona page bare placeholder. Requirement 5 (delete `convexDeploymentUrl.ts`) is explicitly excluded — the file is in active use.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Shell Visual Identity Bugs (wrong logo, teal colors, stale mock)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to concrete failing cases for reproducibility
  - Create `src/__tests__/tierTheme.test.ts` — exhaustive tests against the **unfixed** codebase to document the bugs:
    - Import `TIER_LOGO`, `PAGE_TYPE_TO_TIER`, `TIER_LINK_COLOR`, `DETAIL_THEMES` from `src/lib/tierTheme.ts` (file does not exist yet — test will fail at import, confirming the bug)
    - For all `pageType` values in `PAGE_TYPE_TO_TIER` (`flows`, `skills`, `mcp`, `plugins`, `connectors`, `creators`, `persona`, `home`): assert `TIER_LOGO[PAGE_TYPE_TO_TIER[pageType]]` is defined and does NOT equal `"/coral-logo-purple.png"` for `flows`, `mcp`, `connectors`, `creators`
    - For all 6 `AssetType` values (`skills`, `loops`, `graphs`, `mcp_servers`, `plugins`, `connectors`): assert `DETAIL_THEMES[assetType]` is defined and no property contains `"teal"`
    - For all 6 `AssetType` values: assert `TIER_LINK_COLOR[assetType]` is defined and does not contain `"teal-400"`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (import of `tierTheme.ts` fails — confirms `src/lib/tierTheme.ts` does not exist yet and all three bug conditions are active)
  - Document counterexamples found, e.g.:
    - `getCoralLogoSrc("flows")` → `"/coral-logo-purple.png"` (should be `"/coral-logo-olive.png"`)
    - `getCoralLogoSrc("mcp")` → `"/coral-logo-purple.png"` (should be `"/coral-logo-red.png"`)
    - `HomeCatalogSection type="mcp_servers"` link class → `"text-teal-400"` (should be `"text-red-500 hover:text-red-400"`)
    - `CatalogAssetDetail type="mcp_servers"` border → `"border-teal-500/30"` (should be `"border-red-600/30"`)
    - `tierTheme.ts` does not exist → module not found
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1, 2.2, 2.6, 2.7_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-buggy shell behaviors must remain unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe unfixed code behavior for inputs where `isBugCondition` returns false
  - Observe on UNFIXED code:
    - `CoralPageWrapper` with `pageType="plugins"` → returns `"/coral-logo-purple.png"` (this is CORRECT behavior — purple is the right logo for plugins; must be preserved)
    - `CoralPageWrapper` with `pageType="home"` → returns some fallback logo (must remain as fallback after fix)
    - `CatalogBrowse` for `/flows`, `/mcp`, `/plugins`, `/connectors` routes exist and are not modified by this fix
    - `AppProviders.tsx` and `__root.tsx` shell structure are unchanged
    - `HomeRegistryTiers` already uses correct per-tier logos and must not be touched
  - Write property-based tests in `src/__tests__/tierTheme.test.ts` that capture these preservation invariants:
    - `TIER_LOGO["plugins"]` equals `"/coral-logo-purple.png"` (purple for plugins must be preserved, not accidentally changed)
    - `TIER_LOGO["home"]` equals `"/coral-logo.png"` (generic logo for home must be preserved)
    - `PAGE_TYPE_TO_TIER["skills"]` resolves to `"flows"` tier (alias preserved)
    - `PAGE_TYPE_TO_TIER["persona"]` resolves to `"creators"` tier (alias preserved)
    - For all 6 asset types: `DETAIL_THEMES[assetType]` has all required keys (`border`, `gradient`, `accentText`, `accentSoft`, `chipBorder`, `buttonBg`, `link`)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL only because `tierTheme.ts` does not exist yet — this is the baseline; record which invariants are being preserved
  - Mark task complete when tests are written, run, and behavior is documented
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3. Fix live app shell decoupling bugs

  - [x] 3.1 Create `src/lib/tierTheme.ts` — single source of truth for per-tier visual tokens
    - Create the new file at `src/lib/tierTheme.ts`
    - Export `TierKey` type: `"flows" | "mcp" | "plugins" | "connectors" | "creators" | "home"`
    - Export `TIER_LOGO: Record<TierKey, string>` mapping: `flows→"/coral-logo-olive.png"`, `mcp→"/coral-logo-red.png"`, `plugins→"/coral-logo-purple.png"`, `connectors→"/coral-logo-orange.png"`, `creators→"/coral-logo-pink.png"`, `home→"/coral-logo.png"`
    - Export `PAGE_TYPE_TO_TIER: Record<string, TierKey>` with aliases: `flows`, `skills` (both → `"flows"`), `mcp`, `plugins`, `connectors`, `creators`, `persona` (→ `"creators"`), `home`
    - Export `TIER_LINK_COLOR: Record<string, string>`: `skills/loops/graphs→"text-lime-500 hover:text-lime-400"`, `mcp_servers→"text-red-500 hover:text-red-400"`, `plugins→"text-purple-400 hover:text-purple-300"`, `connectors→"text-orange-400 hover:text-orange-300"`
    - Export `CatalogDetailTheme` type with fields: `border`, `gradient`, `accentText`, `accentSoft`, `chipBorder`, `buttonBg`, `link`
    - Export `DETAIL_THEMES: Record<string, CatalogDetailTheme>` for all 6 asset types with lime (skills/loops/graphs), red (mcp_servers), purple (plugins), orange (connectors) — no `teal` in any value
    - _Bug_Condition: `isBugCondition` returns true for all six defects (wrong logo, stale mock, teal colors, static persona, missing table) — this file is the centralized fix foundation_
    - _Expected_Behavior: `TIER_LOGO[PAGE_TYPE_TO_TIER[pageType]]` returns the correct per-tier logo src for all pageType values; `DETAIL_THEMES[assetType]` returns non-teal theme for all 6 asset types; `TIER_LINK_COLOR[assetType]` returns non-teal-400 class for all 6 asset types_
    - _Preservation: `TIER_LOGO["plugins"]` must equal `"/coral-logo-purple.png"`; `TIER_LOGO["home"]` must equal `"/coral-logo.png"` — these correct values must not be disturbed_
    - _Requirements: 2.7, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.6_

  - [x] 3.2 Fix `src/__tests__/root-route-head.test.ts` — remove stale mock, add missing CSS mock
    - Remove the entire `vi.mock('../components/DeploymentDriftBanner', ...)` block — `DeploymentDriftBanner` does not exist in `src/components/` and is not imported by `__root.tsx`
    - Add `vi.mock('../design-system.css?url', () => ({ default: '/src/design-system.css' }))` alongside the existing `styles.css?url` mock — `__root.tsx` imports both CSS files via `?url`
    - Leave all other `vi.mock` calls unchanged
    - _Bug_Condition: `isStaleMockInTest(testFile, "../components/DeploymentDriftBanner")` returns true — mock target does not exist in filesystem_
    - _Expected_Behavior: test file contains only `vi.mock` calls for modules actually imported by `__root.tsx`; `ci:unit` passes with exit code 0_
    - _Preservation: all other `vi.mock` blocks (`../components/Header`, `../components/Footer`, `../components/AppProviders`, `../components/ErrorBoundary`, `../styles.css?url`) remain unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.3 Fix `src/components/CoralPageWrapper.tsx` — replace hardcoded logo switch with tier lookup
    - Add import: `import { PAGE_TYPE_TO_TIER, TIER_LOGO } from '../lib/tierTheme';`
    - Replace the `getCoralLogoSrc` function body (currently returns `"/coral-logo-purple.png"` for every case) with: `const tier = PAGE_TYPE_TO_TIER[pageType] ?? 'home'; return TIER_LOGO[tier];`
    - Remove the old switch statement inside `getCoralLogoSrc`
    - Do not touch `getPageTitle`, `CoralPageWrapperProps` type union, or any other part of the component
    - _Bug_Condition: `isMissingPerTierLogo(pageType, returnedLogoSrc)` returns true for `flows`, `mcp`, `connectors`, `creators` — all currently return `"/coral-logo-purple.png"`_
    - _Expected_Behavior: `getCoralLogoSrc("flows")` → `"/coral-logo-olive.png"`, `getCoralLogoSrc("mcp")` → `"/coral-logo-red.png"`, `getCoralLogoSrc("connectors")` → `"/coral-logo-orange.png"`, `getCoralLogoSrc("creators")` → `"/coral-logo-pink.png"`, `getCoralLogoSrc("plugins")` → `"/coral-logo-purple.png"` (unchanged), `getCoralLogoSrc("home")` → `"/coral-logo.png"` (unchanged)_
    - _Preservation: `getPageTitle`, `CoralPageWrapperProps`, and all JSX structure unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.4 Fix `src/routes/index.tsx` — correct hero img src and add Freelancer analogy table
    - Change hero `<img src>` from `"/coral-logo-purple.png"` to `"/coral-logo.png"` (combined-identity logo for homepage)
    - Add `FREELANCER_ANALOGY` static const array with 6 entries: `{concept: "Knowledge & Skillset", tier: "Skills"}`, `{concept: "Work Methodology & Process", tier: "Loops & Graphs"}`, `{concept: "Hardware & Local Toolbelt", tier: "MCP Servers"}`, `{concept: "Client Passwords & SaaS Access", tier: "Connectors"}`, `{concept: "Pre-Packaged Toolkit", tier: "Plugins"}`, `{concept: "The Complete Specialist You Hire", tier: "Personas"}`
    - Render the Freelancer analogy section between `<HomeRegistryTiers />` and the first catalog grid — a two-column table with `aria-label="Freelancer analogy"`, header row ("When a freelancer has…" / "CoralNest calls it…"), and 6 data rows
    - Do not modify `HomeRegistryTiers`, `HomeAppsSection`, `HomeBringSkillsSection`, or any of the 6 `HomeCatalogSection` instances
    - _Bug_Condition: homepage `heroImgSrc = "/coral-logo-purple.png"` AND `renderedContent` is missing the Freelancer analogy table_
    - _Expected_Behavior: hero displays `"/coral-logo.png"`; page contains a visible Freelancer analogy section with exactly 6 rows mapped to their tier names_
    - _Preservation: all 6 `HomeCatalogSection` instances, `HomeRegistryTiers`, `HomeAppsSection`, `HomeBringSkillsSection` unchanged_
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.5 Fix `src/routes/persona/index.tsx` — replace bare placeholder with branded holding page
    - Replace the existing static "coming soon" placeholder with a full `CoralPageWrapper`-wrapped component
    - Add imports: `createFileRoute` from `@tanstack/react-router`, `CoralPageWrapper` from `../../components/CoralPageWrapper`, `SITE_NAME` from `../../lib/site`
    - Add `head()` export returning `{ meta: [{ title: \`Personas — ${SITE_NAME}\` }] }`so`<title>` includes both "Personas" and "CoralNest"
    - Render `<CoralPageWrapper pageType="creators">` wrapping a centered holding page with: `<img src="/coral-logo-pink.png" alt="Personas" className="h-20 w-20 rounded-2xl" draggable={false} />`, `<h1>Personas</h1>`, description paragraph ("Complete agent archetypes with pre-wired Flows, MCP Servers, and Connectors…"), and `<p className="text-sm font-semibold text-pink-400">Coming Soon</p>`
    - Apply `className="browse-page browse-page-borderless-header"` to the `<main>` wrapper to match other page shells
    - _Bug_Condition: `/persona` route renders a bare static "coming soon" string with no `CoralPageWrapper`, no `<title>`, no branded shell_
    - _Expected_Behavior: page always renders within `CoralPageWrapper` with `pageType="creators"` (pink logo); `document.title` contains "Personas" and "CoralNest"; holding page shows pink logo, heading, description, and CTA_
    - _Preservation: no changes to `CatalogBrowse`, no changes to other routes, `CoralPageWrapper` shell structure unchanged_
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 3.6 Fix `src/components/home/HomeCatalogSection.tsx` — replace hardcoded teal link class
    - Add import: `import { TIER_LINK_COLOR } from '../../lib/tierTheme';`
    - Add `const linkClass = TIER_LINK_COLOR[type] ?? 'text-slate-400 hover:text-slate-300';` before the return statement (or derived at the usage site)
    - Replace the hardcoded `text-teal-400 … hover:text-teal-300` class string on the "Browse all" anchor/link with the dynamic `linkClass` value
    - Add `focus-visible:outline-2 focus-visible:outline-offset-2` to the link's className to preserve keyboard focus ring (accessibility requirement)
    - Do not change any other part of the component (item rendering, section header, fetch logic)
    - _Bug_Condition: `HomeCatalogSection.linkClass = "text-teal-400"` for all asset types including `mcp_servers`, `plugins`, `connectors`_
    - _Expected_Behavior: `type="skills"/"loops"/"graphs"` → lime classes; `type="mcp_servers"` → red classes; `type="plugins"` → purple classes; `type="connectors"` → orange classes; no class contains `"teal-400"`; link remains keyboard-focusable_
    - _Preservation: item rendering, section headers, fetch logic, and all other styling unchanged_
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.7 Fix `src/components/catalog/CatalogAssetDetail.tsx` — replace hardcoded teal theme with per-type lookup
    - Add import: `import { DETAIL_THEMES, type CatalogDetailTheme } from '../../lib/tierTheme';`
    - Remove the local `CatalogDetailTheme` type definition (now imported from `tierTheme.ts`)
    - Remove the local `DETAIL_THEME` const (the single hardcoded teal theme object)
    - Change `const theme = DETAIL_THEME` to `const theme = DETAIL_THEMES[type] ?? DETAIL_THEMES.skills;` — `skills` is the safe fallback for any unknown type
    - Do not modify the metadata panel, README section, Details section, Payload section, file tree section — only the hero `<div>` uses `theme.*` classes; all other sections use static `border-slate-800` / `bg-slate-900/90` classes
    - Do not change the `text-teal-400` in the file preview path label inside the file tree — that is out of scope
    - _Bug_Condition: `CatalogAssetDetail.theme = HARDCODED_TEAL_THEME` for all asset types — `const theme = DETAIL_THEME` never dispatches on `type`_
    - _Expected_Behavior: `type="skills"/"loops"/"graphs"` → lime theme; `type="mcp_servers"` → red theme; `type="plugins"` → purple theme; `type="connectors"` → orange theme; no theme property contains `"teal"` as the primary color_
    - _Preservation: metadata panel, readme/markdown content, details section, payload section, file tree rendering all unchanged; only hero section color classes change_
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Shell Visual Identity Bugs resolved
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 (in `src/__tests__/tierTheme.test.ts`) encodes the expected behavior for all three bug condition families
    - When this test passes, it confirms:
      - `src/lib/tierTheme.ts` exists and exports all required tokens
      - All 8 `PAGE_TYPE_TO_TIER` entries resolve to defined `TIER_LOGO` values with correct filenames
      - All 6 asset types have defined `DETAIL_THEMES` entries with no `"teal"` in any property
      - All 6 asset types have defined `TIER_LINK_COLOR` entries with no `"teal-400"` in the class string
    - Run: `bun run ci:unit -- --run src/__tests__/tierTheme.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms all three bug conditions are fixed)
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.6_

  - [x] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-buggy behaviors unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run the preservation property tests from step 2
    - Verify: `TIER_LOGO["plugins"]` still equals `"/coral-logo-purple.png"` (purple for plugins preserved)
    - Verify: `TIER_LOGO["home"]` still equals `"/coral-logo.png"` (generic fallback preserved)
    - Verify: `PAGE_TYPE_TO_TIER["skills"]` still resolves to `"flows"` tier
    - Verify: `PAGE_TYPE_TO_TIER["persona"]` still resolves to `"creators"` tier
    - Verify: all 6 `DETAIL_THEMES` entries have all required keys intact
    - Run: `bun run ci:unit -- --run src/__tests__/tierTheme.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in preserved behaviors)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 4. Checkpoint — Ensure all tests and CI gates pass
  - Run `bun run ci:unit` — all tests pass including `root-route-head`, `tierTheme`, `flows-index`, `home-route`, `search-route`, `home-bring-skills-section`, `openapi-contract`, `vercel-preview-config`, and all CI workflow tests
  - Run `bun run ci:types-build` — TypeScript clean after `tierTheme.ts` additions and all component edits; verify no new type errors in `CoralPageWrapper`, `HomeCatalogSection`, `CatalogAssetDetail`, persona route
  - Run `bun run ci:static` — lint, format, and dead-code checks pass; Biome/oxlint report no new violations
  - Confirm `src/lib/convexDeploymentUrl.ts` is NOT deleted (active use by `server/convexProxy.ts` and `scripts/vercel-build-frontend.ts` — Requirement 5 is not applicable)
  - Confirm `HomeRegistryTiers`, `AppProviders`, `__root.tsx`, and all browse/detail routes are unchanged
  - Ensure all tests pass; ask the user if questions arise.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3.1"] },
    { "wave": 4, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "3.7"] },
    { "wave": 5, "tasks": ["3.8", "3.9"] },
    { "wave": 6, "tasks": ["4"] }
  ]
}
```

Tasks 3.2, 3.4, and 3.5 can be executed in parallel with 3.3, 3.6, 3.7 once 3.1 is complete. Tasks 3.8 and 3.9 require all implementation tasks (3.1–3.7) to be complete.

## Notes

- **Requirement 5 not applicable**: Do NOT delete `src/lib/convexDeploymentUrl.ts` or its test. Confirmed active importers: `server/convexProxy.ts` and `scripts/vercel-build-frontend.ts`. Deleting these files would break Vercel deployments.
- **`tierTheme.ts` is the prerequisite**: Tasks 3.3, 3.6, and 3.7 all depend on `tierTheme.ts` existing. Create it first in task 3.1.
- **Test file serves double duty**: `src/__tests__/tierTheme.test.ts` is both the exploration test (task 1) and the preservation test (task 2). Write all assertions together; the exploration assertions will fail on unfixed code (confirming bugs), and the preservation assertions will pass on unfixed code (confirming baseline). After the fix (task 3.8), all assertions pass.
- **PBT scoping**: All three properties (`TIER_LOGO` mapping, `DETAIL_THEMES` coverage, `TIER_LINK_COLOR` coverage) are deterministic exhaustive checks over small finite sets — no random generation needed. The "property-based" nature is expressed as "for all X in known set, assert P(X)".
- **Validation commands**: `bun run ci:unit`, `bun run ci:types-build`, `bun run ci:static` in that order.
- **Files NOT changed**: `src/routes/__root.tsx`, `src/components/AppProviders.tsx`, `src/components/home/HomeRegistryTiers.tsx`, all browse/detail routes for flows/mcp/plugins/connectors, `src/lib/assetsClient.ts`, `src/lib/assetTypes.ts`, `server/convexProxy.ts`, `scripts/vercel-build-frontend.ts`.
