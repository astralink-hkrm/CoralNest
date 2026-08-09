# Bugfix Requirements Document

## Introduction

The CoralNest app shell has accumulated a set of interconnected defects stemming from an incomplete migration away from Convex to the CockroachDB + Backblaze B2 stack. While the core data pipeline (`assetCatalog.ts` → `/api/v1/assets/*` → `assetsClient.ts`) and the primary browse/detail components are already in place, several layers of the shell remain broken or missing:

- Stale Convex-related utility files (`convexDeploymentUrl.ts`) and their tests still live in `src/lib/`, and the `root-route-head` unit test mocks a `DeploymentDriftBanner` import that does not exist in `__root.tsx`, causing the test suite to fail.
- The `CoralPageWrapper` logo function returns the same purple logo for every registry tier rather than the per-tier color logos defined in the README and `HomeRegistryTiers`.
- The homepage design does not match the CoralNest five-tier concept: the hero uses the purple logo (instead of the olive/red/purple/orange/pink per-tier identity), the "Freelancer analogy" table is absent, and the registry tier cards do not apply the correct per-tier color accent from the design system.
- The dynamic category sidebar in browse pages exists in `CatalogBrowse` but is missing from the Persona page, which is still a static "coming soon" placeholder instead of a live CockroachDB-backed browse page.
- Unit tests in `src/__tests__/` reference a `DeploymentDriftBanner` component that was removed, making `ci:unit` fail.
- The `CoralPageWrapper` page-logo mapping is incorrect: it returns `coral-logo-purple.png` for every tier, not the correct per-tier color.

These issues collectively cause `ci:unit` to fail, produce a visually inconsistent shell that does not match the CoralNest brand identity, and leave the Personas page non-functional.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `root-route-head.test.ts` runs THEN the system fails because it mocks `../components/DeploymentDriftBanner` which does not exist in the codebase, causing a module resolution error and `ci:unit` to fail.

1.2 WHEN `CoralPageWrapper` is rendered with any `pageType` value THEN the system returns `coral-logo-purple.png` as the logo source for every page type including `flows`, `connectors`, `mcp`, and `creators`, ignoring the per-tier color identity specified in the README.

1.3 WHEN the homepage (`/`) renders the hero section THEN the system displays `coral-logo-purple.png` instead of the tier-appropriate logo, and the five-tier "Freelancer analogy" comparison table from the README is not rendered anywhere on the page.

1.4 WHEN a user visits the `/persona` route THEN the system displays a static "Personas are coming soon" placeholder without fetching or rendering any live data from CockroachDB, while all other registry pages (flows, MCP, plugins, connectors) are backed by live data.

1.5 WHEN `src/lib/convexDeploymentUrl.ts` and its test file `src/lib/convexDeploymentUrl.test.ts` remain in the codebase THEN the system contains dead Convex-specific URL utility code that no component in `src/components/` or `src/routes/` imports or depends upon, accumulating stale legacy code in the live bundle.

1.6 WHEN the `HomeCatalogSection` component renders "Browse all" links for asset types THEN the system uses `catalogBrowseHref()` which correctly resolves `skills`, `loops`, and `graphs` to `/flows?tab=*` paths, but the link styling uses `text-teal-400` — a hardcoded color not aligned with the per-tier olive color identity for Flows defined in the design system.

1.7 WHEN `CatalogAssetDetail` renders the hero section for any asset type THEN the system applies a single hardcoded `DETAIL_THEME` with `teal` colors regardless of the asset type, making skills, MCP servers, connectors, and plugins visually identical instead of following the per-tier color identity.

### Expected Behavior (Correct)

2.1 WHEN `root-route-head.test.ts` runs THEN the system SHALL pass without mocking `DeploymentDriftBanner`, either by removing the stale mock from the test or by the test accurately reflecting only the actual imports used in `__root.tsx`.

2.2 WHEN `CoralPageWrapper` is rendered with a given `pageType` THEN the system SHALL return the correct per-tier logo: `coral-logo-olive.png` for `flows`/`skills`, `coral-logo-red.png` for `mcp`, `coral-logo-purple.png` for `plugins`, `coral-logo-orange.png` for `connectors`, and `coral-logo-pink.png` for `creators`/persona.

2.3 WHEN the homepage renders THEN the system SHALL use the correct per-tier logos in the hero/registry tier cards, and SHALL render the "Freelancer analogy" table (mapping Knowledge/Methodology/Hardware/SaaS/Pre-packaged/Complete to Skills/Loops+Graphs/MCP/Connectors/Plugins/Personas) as defined in the README.

2.4 WHEN a user visits the `/persona` route THEN the system SHALL display a live browse page backed by the CockroachDB `personas` table via `searchAssetsClient`, using `CatalogBrowse` with a `defaultType` of `"personas"` (or a suitable coming-soon bridge using the existing data pipeline) with the same category sidebar, sort, and search controls as other registry pages — OR, if the `personas` table is not yet populated, SHALL render a CoralNest-branded holding page that is consistent with the existing `CoralPageWrapper` shell using the pink persona logo.

2.5 WHEN the codebase is cleaned up THEN the system SHALL NOT contain `src/lib/convexDeploymentUrl.ts` or `src/lib/convexDeploymentUrl.test.ts` as neither is imported by any component, route, or active utility in the app shell.

2.6 WHEN `HomeCatalogSection` renders "Browse all" links THEN the system SHALL apply link colors consistent with the per-tier color identity for the given asset type (olive accent for flows/skills/loops/graphs, red for MCP, purple for plugins, orange for connectors, pink for persona) rather than a single hardcoded `text-teal-400`.

2.7 WHEN `CatalogAssetDetail` renders the hero section THEN the system SHALL apply the per-tier accent color: olive/green tones for `skills`/`loops`/`graphs`, red tones for `mcp_servers`, purple tones for `plugins`, and orange tones for `connectors`, so each detail page visually matches its registry tier identity.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user visits `/flows`, `/mcp`, `/plugins`, or `/connectors` THEN the system SHALL CONTINUE TO render a fully functional `CatalogBrowse` page with live CockroachDB data, category sidebar, sort controls, and search.

3.2 WHEN a user visits a detail page such as `/skills/:slug`, `/mcp/:slug`, `/connectors/:slug`, `/loops/:slug`, `/graphs/:slug`, or `/plugins/catalog/:slug` THEN the system SHALL CONTINUE TO fetch and display the asset metadata from CockroachDB and the readme content from Backblaze B2.

3.3 WHEN a user types into the header search input THEN the system SHALL CONTINUE TO show typeahead results grouped by asset type via `useAssetTypeahead`, which calls `searchAssetsClient` against `/api/v1/assets/search`.

3.4 WHEN `AppProviders.tsx` renders THEN the system SHALL CONTINUE TO provide only `TooltipProvider` with no Convex provider wiring, as it is already correctly decoupled.

3.5 WHEN `__root.tsx` renders THEN the system SHALL CONTINUE TO provide the `AppProviders` shell, `Header`, `Footer`, `Toaster`, and Vercel analytics with no Convex client provider, as it is already correctly decoupled.

3.6 WHEN `ci:unit` runs the existing test suite THEN the system SHALL CONTINUE TO pass tests for: `flows-index`, `home-route`, `search-route`, `home-bring-skills-section`, `root-route-head`, `openapi-contract`, `vercel-preview-config`, and the deploy/workflow tests that reference Convex CI steps in YAML (those tests describe CI pipeline configuration, not the app shell, and must remain unchanged).

3.7 WHEN the `PRIMARY_NAV_ITEMS` in `nav-items.ts` render in the Header THEN the system SHALL CONTINUE TO route to `/flows`, `/mcp`, `/plugins`, `/connectors`, and `/persona` with correct active-path prefix matching.

3.8 WHEN `CatalogBrowse` fetches filter options for a given `AssetType` THEN the system SHALL CONTINUE TO call `getAssetFilterOptionsClient` and populate the left sidebar with categories and secondary filters (frameworks for graphs, transports for MCP servers).

---

## Requirements

### Requirement 1: Fix Stale Unit Test Mock (`root-route-head.test.ts`)

**User Story:** As a developer, I want the `root-route-head` unit test to pass without referencing a non-existent `DeploymentDriftBanner` component, so that `ci:unit` completes successfully.

#### Acceptance Criteria

1. WHEN `root-route-head.test.ts` is executed THEN the file SHALL NOT contain a `vi.mock('../components/DeploymentDriftBanner', ...)` call since `DeploymentDriftBanner` does not exist in `src/components/`.
2. WHEN `ci:unit` runs all tests THEN the `root-route-head` test file SHALL pass with exit code 0.
3. WHEN `__root.tsx` is inspected THEN `root-route-head.test.ts` SHALL contain `vi.mock` calls only for modules that are actually imported by `__root.tsx` (e.g. `../components/Header`, `../components/Footer`, `../components/AppProviders`, `../components/ErrorBoundary`, and any CSS `?url` imports present in `__root.tsx`), and SHALL NOT mock any module that `__root.tsx` does not import.
4. IF `__root.tsx` imports `design-system.css?url` or any static asset via `?url` suffix THEN `root-route-head.test.ts` SHALL include a corresponding `vi.mock` or `vi.stubGlobal` so Vitest can resolve the import without a module-not-found error.

---

### Requirement 2: Fix Per-Tier Logo in `CoralPageWrapper`

**User Story:** As a user, I want each registry section (Flows, MCP, Plugins, Connectors, Persona) to display its correct color-identity logo, so that the visual design matches the CoralNest five-tier brand identity.

#### Acceptance Criteria

1. WHEN `CoralPageWrapper` is rendered with `pageType="flows"` THEN the rendered `<img>` logo element SHALL have `src="/coral-logo-olive.png"`.
2. WHEN `CoralPageWrapper` is rendered with `pageType="mcp"` THEN the rendered `<img>` logo element SHALL have `src="/coral-logo-red.png"`.
3. WHEN `CoralPageWrapper` is rendered with `pageType="plugins"` THEN the rendered `<img>` logo element SHALL have `src="/coral-logo-purple.png"`.
4. WHEN `CoralPageWrapper` is rendered with `pageType="connectors"` THEN the rendered `<img>` logo element SHALL have `src="/coral-logo-orange.png"`.
5. WHEN `CoralPageWrapper` is rendered with `pageType="creators"` or `pageType="persona"` THEN the rendered `<img>` logo element SHALL have `src="/coral-logo-pink.png"`.
6. WHEN `CoralPageWrapper` is rendered with `pageType="home"` or any `pageType` value not in the set `{"flows", "mcp", "plugins", "connectors", "creators", "persona"}` THEN the rendered `<img>` logo element SHALL have `src="/coral-logo.png"` as the default fallback.
7. WHEN `CoralPageWrapper`'s logo mapping is updated THEN all six tier-specific mappings SHALL be expressed as a single lookup table (e.g. a `const` object or `switch`) so that adding a new tier requires editing only one location.

---

### Requirement 3: Redesign Homepage to Match CoralNest Five-Tier Concept

**User Story:** As a user, I want the homepage to clearly present the CoralNest five-tier registry concept including the "Freelancer analogy" comparison table, so that I immediately understand what each registry tier does and how they relate.

#### Acceptance Criteria

1. WHEN the homepage (`/`) renders THEN the hero section SHALL display the combined-identity CoralNest logo (`/coral-logo.png`, not any single tier-specific color variant) alongside the tagline "The Premier Open Registry for AI Agent Flows, MCP Servers, Plugins, Connectors, and Personas".
2. WHEN the homepage renders THEN a "Freelancer analogy" section SHALL be present and SHALL contain a visible comparison table or structured list with exactly six rows: (a) Knowledge & Skillset → Skills, (b) Work Methodology & Process → Loops & Graphs, (c) Hardware & Local Toolbelt → MCP Servers, (d) Client Passwords & SaaS Access → Connectors, (e) Pre-Packaged Toolkit → Plugins, (f) The Complete Specialist You Hire → Personas.
3. WHEN the homepage renders the registry tier cards (via `HomeRegistryTiers` or equivalent) THEN each card SHALL display the correct per-tier color logo: `coral-logo-olive.png` for Flows, `coral-logo-red.png` for MCP, `coral-logo-purple.png` for Plugins, `coral-logo-orange.png` for Connectors, `coral-logo-pink.png` for Personas.
4. WHEN the homepage renders THEN each of the six dynamic catalog sections (skills, loops, graphs, mcp_servers, connectors, plugins) SHALL independently fetch items and display between 1 and 6 items when data is available, with each section rendering independently of the others (a failure in one section SHALL NOT prevent other sections from rendering).
5. WHEN an item in a homepage catalog section is clicked THEN the browser SHALL navigate to the correct detail route: `/skills/:slug` for skills, `/mcp/:slug` for mcp_servers, `/connectors/:slug` for connectors, `/loops/:slug` for loops, `/graphs/:slug` for graphs, `/plugins/catalog/:slug` for plugins.
6. WHEN a homepage catalog section fetch fails or returns zero results THEN that section SHALL render a non-breaking empty state (e.g. a "No items available" message or a skeleton/placeholder) rather than throwing an unhandled error or crashing adjacent sections.

---

### Requirement 4: Persona Page Live Data

**User Story:** As a user, I want to browse the Personas registry on `/persona` with the same functionality as other registry pages, so that I can discover and explore complete agent personas.

#### Acceptance Criteria

1. WHEN a user visits `/persona` THEN the page SHALL NOT render a bare static "coming soon" string as its only visible content — the page SHALL always render within the `CoralPageWrapper` shell with a `<title>` that includes both "Personas" and "CoralNest".
2. WHEN a user visits `/persona` and the `personas` table contains one or more rows THEN the page SHALL render a browse view with: a search input, sort controls (quality/downloads/stars/newest), a category sidebar populated from the `personas` table's `category` column, and a results grid using the pink per-tier color identity (`coral-logo-pink.png`).
3. WHEN a user visits `/persona` and the `personas` table is empty or unavailable THEN the page SHALL render a CoralNest-branded holding page displaying: the pink Personas logo (`/coral-logo-pink.png`), a heading identifying the Personas registry, a description of what Personas are (complete agent archetypes with pre-wired Flows, MCP Servers, and Connectors), and a "Coming Soon" or "Stay Tuned" call-to-action — all styled consistently with `CoralPageWrapper`.
4. WHEN the Persona page renders in either state (live data or holding page) THEN the `document.title` or SSR `<title>` tag SHALL include the text "Personas" and "CoralNest".

---

### Requirement 5: Remove Dead Convex Utility Files

**User Story:** As a developer, I want dead Convex-specific utility files removed from the active codebase, so that the bundle stays clean and no misleading legacy code confuses future contributors.

#### Acceptance Criteria

1. WHEN the file system is inspected THEN `src/lib/convexDeploymentUrl.ts` SHALL NOT exist.
2. WHEN the file system is inspected THEN `src/lib/convexDeploymentUrl.test.ts` SHALL NOT exist.
3. WHEN all files in `src/components/`, `src/routes/`, `src/lib/`, and `src/server/` are scanned for import statements THEN no file SHALL contain an import path resolving to `convexDeploymentUrl`.
4. WHEN `bun run ci:unit` runs THEN no test SHALL fail due to a missing `convexDeploymentUrl` module.

---

### Requirement 6: Per-Tier Link Colors in `HomeCatalogSection`

**User Story:** As a user, I want "Browse all" links in each homepage catalog section to use the correct registry tier color, so that the visual identity is consistent throughout the page.

#### Acceptance Criteria

1. WHEN `HomeCatalogSection` renders with `type="skills"`, `type="loops"`, or `type="graphs"` THEN the "Browse all" anchor or link element SHALL NOT have the class `text-teal-400` and SHALL instead apply a CSS class or inline style representing the olive/green Flows tier accent (e.g. a class mapped to `--accent` olive or Tailwind `text-green-600`/`text-lime-600` or the design-system `var(--tier-flows)`).
2. WHEN `HomeCatalogSection` renders with `type="mcp_servers"` THEN the "Browse all" link SHALL apply the red MCP tier accent color (e.g. `text-red-600` or `var(--tier-mcp)`).
3. WHEN `HomeCatalogSection` renders with `type="plugins"` THEN the "Browse all" link SHALL apply the purple Plugins tier accent color (e.g. `text-purple-600` or `var(--tier-plugins)`).
4. WHEN `HomeCatalogSection` renders with `type="connectors"` THEN the "Browse all" link SHALL apply the orange Connectors tier accent color (e.g. `text-orange-500` or `var(--tier-connectors)`).
5. WHEN any per-tier color class is applied to a "Browse all" link THEN the link SHALL remain keyboard-focusable with a visible focus ring and SHALL maintain at least a 3:1 contrast ratio against the section background in both light and dark modes.

---

### Requirement 7: Per-Tier Hero Theme in `CatalogAssetDetail`

**User Story:** As a user, I want each asset detail page to visually reflect its registry tier with the correct accent color, so that Flows look different from MCP pages and Plugins, reinforcing the CoralNest brand identity.

#### Acceptance Criteria

1. WHEN `CatalogAssetDetail` renders with an asset of type `skills`, `loops`, or `graphs` THEN the hero section SHALL apply olive/green accent colors and the hero container SHALL NOT have Tailwind classes whose root color name is `teal` (e.g. `bg-teal-*`, `text-teal-*`, `border-teal-*`) as the primary visual theme.
2. WHEN `CatalogAssetDetail` renders with an asset of type `mcp_servers` THEN the hero section SHALL apply red accent classes or CSS variables consistent with the MCP tier identity (e.g. `bg-red-950`, `text-red-400`, `border-red-800` or equivalent design-system tokens).
3. WHEN `CatalogAssetDetail` renders with an asset of type `plugins` THEN the hero section SHALL apply purple accent classes consistent with the Plugins tier identity.
4. WHEN `CatalogAssetDetail` renders with an asset of type `connectors` THEN the hero section SHALL apply orange accent classes consistent with the Connectors tier identity.
5. WHEN `CatalogAssetDetail` renders any asset type THEN the metadata panel, readme/markdown content area, and file-tree section SHALL continue to render their existing content without visual regression (the per-tier change is scoped to the hero section only).
6. WHEN the `DETAIL_THEME` (or equivalent per-type theme lookup) is implemented THEN all six asset types (`skills`, `loops`, `graphs`, `mcp_servers`, `plugins`, `connectors`) SHALL have an explicitly defined theme entry so that no type falls through to an undefined/default `teal` style.

---

## Bug Condition Pseudocode

**Bug Condition Functions:**

```pascal
FUNCTION isConvexLegacyDeadCode(file)
  INPUT: file path in src/lib/
  OUTPUT: boolean
  RETURN file IN {"convexDeploymentUrl.ts", "convexDeploymentUrl.test.ts"}
    AND NOT any_file_in(["src/components/", "src/routes/"]).imports(file)
END FUNCTION

FUNCTION isMissingPerTierLogo(pageType, returnedLogoSrc)
  INPUT: pageType string, returnedLogoSrc string
  OUTPUT: boolean
  RETURN returnedLogoSrc = "coral-logo-purple.png"
    AND pageType IN {"flows", "mcp", "connectors", "creators"}
END FUNCTION

FUNCTION isStaleMockInTest(testFile, mockTarget)
  INPUT: testFile path, mockTarget module path
  OUTPUT: boolean
  RETURN mockTarget = "../components/DeploymentDriftBanner"
    AND NOT file_exists("src/components/DeploymentDriftBanner.tsx")
END FUNCTION
```

**Fix Checking Properties:**

```pascal
// Property: Per-tier logo correctness
FOR ALL pageType WHERE isMissingPerTierLogo(pageType, CoralPageWrapper.getLogoSrc(pageType)) DO
  result ← CoralPageWrapper'.getLogoSrc(pageType)
  ASSERT result = EXPECTED_LOGOS[pageType]   // olive→flows, red→mcp, orange→connectors, pink→creators
END FOR

// Property: Dead Convex code removal
FOR ALL file WHERE isConvexLegacyDeadCode(file) DO
  ASSERT NOT file_exists("src/lib/" + file)
END FOR

// Property: Test suite passes
FOR ALL test IN ci_unit_tests DO
  result ← run(test)
  ASSERT result = PASS
END FOR
```

**Preservation Check:**

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isMissingPerTierLogo(X) AND NOT isConvexLegacyDeadCode(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
