# Live App Shell Decoupling — Bugfix Design

## Overview

Seven interconnected defects in the CoralNest app shell stem from an incomplete
migration away from Convex. The fixes are purely cosmetic/visual and
test-hygiene changes — no data pipeline, routing, or API surface changes. The
core strategy is:

1. Introduce a single shared `src/lib/tierTheme.ts` module that owns every
   per-tier color token. Three affected components (`CoralPageWrapper`,
   `HomeCatalogSection`, `CatalogAssetDetail`) all import from it, so tier
   color is defined exactly once.
2. Fix five visible UI bugs (logo mapping, hero logo, hero theme, link colors,
   homepage table) using that shared token map.
3. Upgrade the Persona page from a static placeholder to a branded holding page
   (with a live-data conditional branch ready for when `personas` table is
   populated).
4. Remove the stale `vi.mock('../components/DeploymentDriftBanner')` call and
   add the missing `design-system.css?url` mock in the unit test.
5. **Do NOT delete `src/lib/convexDeploymentUrl.ts`** — confirmed still in
   active use by `server/convexProxy.ts` and `scripts/vercel-build-frontend.ts`.
   See Requirement 5 Deviation.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs that trigger one of the seven defects
  (wrong logo src, wrong theme class, stale mock, static placeholder, hardcoded
  teal, missing table).
- **Property (P)**: The desired output for each buggy input — correct logo src,
  correct Tailwind theme classes, passing test, live/branded Persona page, etc.
- **Preservation**: All behaviors outside the bug conditions that must not
  change: CatalogBrowse pages, detail routes, search typeahead, AppProviders,
  `__root.tsx` shell structure, navigation, CI pipeline scripts.
- **tierTheme**: Proposed `src/lib/tierTheme.ts` — the single source of truth
  for per-tier color tokens used by `CoralPageWrapper`, `HomeCatalogSection`,
  and `CatalogAssetDetail`.
- **pageType**: The prop on `CoralPageWrapper` —
  `"skills" | "flows" | "plugins" | "connectors" | "creators" | "mcp" | "home"`.
- **AssetType**: The discriminator for catalog items —
  `"skills" | "plugins" | "mcp_servers" | "connectors" | "loops" | "graphs"`.

---

## Architecture Overview

### Files changed

| File                                            | Change type | Requirement |
| ----------------------------------------------- | ----------- | ----------- |
| `src/lib/tierTheme.ts`                          | **New**     | R2, R6, R7  |
| `src/components/CoralPageWrapper.tsx`           | Edit        | R2          |
| `src/routes/index.tsx`                          | Edit        | R3          |
| `src/routes/persona/index.tsx`                  | Edit        | R4          |
| `src/components/home/HomeCatalogSection.tsx`    | Edit        | R6          |
| `src/components/catalog/CatalogAssetDetail.tsx` | Edit        | R7          |
| `src/__tests__/root-route-head.test.ts`         | Edit        | R1          |

### Files NOT changed (preservation surface)

- `src/routes/__root.tsx` — already correct, no changes.
- `src/components/AppProviders.tsx` — already Convex-free.
- `src/components/home/HomeRegistryTiers.tsx` — already uses correct per-tier
  logos; serves as the reference implementation for the tier logo mapping.
- All `src/routes/` browse and detail routes for flows/mcp/plugins/connectors.
- `src/lib/assetsClient.ts`, `src/lib/assetTypes.ts` — data layer unchanged.
- `src/lib/convexDeploymentUrl.ts` + test — retained (see R5 Deviation below).
- `server/convexProxy.ts`, `scripts/vercel-build-frontend.ts` — not touched.

### Centralized tier theme (key architectural decision)

All three UI components currently hardcode their own color literals. The fix
introduces `src/lib/tierTheme.ts` as the single lookup table. Every component
receives its colors by calling into the lookup — no component duplicates color
strings. Adding or re-branding a tier requires editing only `tierTheme.ts`.

---

## Bug Details

The bugs share a common shape: a function or component returns a hardcoded
fallback value instead of dispatching on a runtime input.

```
FUNCTION isBugCondition(context)
  // R1: stale test mock
  IF context.mockTarget = "../components/DeploymentDriftBanner"
    AND NOT file_exists("src/components/DeploymentDriftBanner.tsx")
    RETURN true

  // R2: wrong logo per page type
  IF context.pageType IN {"flows", "mcp", "connectors", "creators"}
    AND CoralPageWrapper.getCoralLogoSrc(context.pageType) = "/coral-logo-purple.png"
    RETURN true

  // R3: wrong hero logo + missing table on homepage
  IF context.routePath = "/"
    AND heroImgSrc = "/coral-logo-purple.png"
    RETURN true

  // R4: static persona placeholder
  IF context.routePath = "/persona"
    AND renderedContent = STATIC_COMING_SOON_PLACEHOLDER
    RETURN true

  // R6: hardcoded teal link color
  IF context.assetType IN {"skills","loops","graphs","mcp_servers","connectors","plugins"}
    AND HomeCatalogSection.linkClass = "text-teal-400"
    RETURN true

  // R7: hardcoded teal hero theme
  IF context.assetType IN {"skills","loops","graphs","mcp_servers","connectors","plugins"}
    AND CatalogAssetDetail.theme = HARDCODED_TEAL_THEME
    RETURN true

  RETURN false
END FUNCTION
```

**Concrete examples of the bugs:**

- `getCoralLogoSrc("flows")` → `"/coral-logo-purple.png"` (should be `"/coral-logo-olive.png"`)
- `getCoralLogoSrc("mcp")` → `"/coral-logo-purple.png"` (should be `"/coral-logo-red.png"`)
- `HomeCatalogSection type="mcp_servers"` renders `text-teal-400` "Browse all" link
- `CatalogAssetDetail type="mcp_servers"` renders `border-teal-500/30` hero border
- `/persona` route renders a bare "coming soon" `<p>` with no branded wrapper

---

## Hypothesized Root Cause

1. **Copy-paste default in `getCoralLogoSrc`**: Every `case` in the switch was
   filled with `return "/coral-logo-purple.png"` — the purple logo was the first
   written and was never updated per-tier.
2. **Hero image not updated after tier identity was introduced**: `index.tsx`
   hero was written before `HomeRegistryTiers` introduced the per-tier logos.
3. **`DETAIL_THEME` designed for Skills only**: `CatalogAssetDetail` was
   scaffolded for `skills` (teal) and `const theme = DETAIL_THEME` was never
   changed to per-type dispatch when other asset types were added.
4. **`HomeCatalogSection` predates the tier color system**: The "Browse all"
   link used `text-teal-400` as a placeholder and was never revisited.
5. **Persona page never implemented**: The route was scaffolded as a coming-soon
   stub; live `CatalogBrowse` wiring was deferred and forgotten.
6. **Stale test mock from Convex migration**: `DeploymentDriftBanner` was removed
   from `__root.tsx` during migration, but the `vi.mock` line was not removed.
7. **`design-system.css?url` mock gap**: `__root.tsx` imports both CSS modules
   with `?url` but the test only mocks `styles.css?url`, not `design-system.css?url`.

---

## Expected Behavior

**Unchanged behaviors (must not regress):**

- `/flows`, `/mcp`, `/plugins`, `/connectors` browse pages — live CockroachDB
  data, category sidebar, sort, search.
- All detail routes `/skills/:slug`, `/mcp/:slug`, `/connectors/:slug`, etc. —
  only hero _color classes_ change, no data fetch logic is touched.
- `useAssetTypeahead` / header search typeahead — unchanged.
- `AppProviders`, `__root.tsx` shell structure — unchanged.
- `PRIMARY_NAV_ITEMS` routing — unchanged.
- `HomeRegistryTiers` — already correct, not modified.
- CI pipeline (`server/convexProxy.ts`, `scripts/vercel-build-frontend.ts`) —
  not touched.

---

## New File: `src/lib/tierTheme.ts`

This is the single source of truth for all per-tier visual tokens.

```typescript
// src/lib/tierTheme.ts

/**
 * Per-tier visual identity tokens.
 * Used by CoralPageWrapper, HomeCatalogSection, and CatalogAssetDetail.
 * Adding a new tier requires editing only this file.
 */

export type TierKey = "flows" | "mcp" | "plugins" | "connectors" | "creators" | "home";

/** Maps CoralPageWrapper pageType to the public-folder logo asset. */
export const TIER_LOGO: Record<TierKey, string> = {
  flows: "/coral-logo-olive.png",
  mcp: "/coral-logo-red.png",
  plugins: "/coral-logo-purple.png",
  connectors: "/coral-logo-orange.png",
  creators: "/coral-logo-pink.png",
  home: "/coral-logo.png",
};

/**
 * Maps CoralPageWrapper pageType strings (including aliases like "skills")
 * to the canonical TierKey for logo lookup.
 */
export const PAGE_TYPE_TO_TIER: Record<string, TierKey> = {
  flows: "flows",
  skills: "flows", // alias: skills live in the Flows tier
  mcp: "mcp",
  plugins: "plugins",
  connectors: "connectors",
  creators: "creators",
  persona: "creators", // alias: /persona route uses "creators" pageType
  home: "home",
};

/** Tailwind color class for "Browse all" links in HomeCatalogSection. */
export const TIER_LINK_COLOR: Record<string, string> = {
  skills: "text-lime-500 hover:text-lime-400",
  loops: "text-lime-500 hover:text-lime-400",
  graphs: "text-lime-500 hover:text-lime-400",
  mcp_servers: "text-red-500 hover:text-red-400",
  plugins: "text-purple-400 hover:text-purple-300",
  connectors: "text-orange-400 hover:text-orange-300",
};

export type CatalogDetailTheme = {
  border: string;
  gradient: string;
  accentText: string;
  accentSoft: string;
  chipBorder: string;
  buttonBg: string;
  link: string;
};

/** Per-AssetType hero section themes for CatalogAssetDetail. */
export const DETAIL_THEMES: Record<string, CatalogDetailTheme> = {
  skills: {
    border: "border-lime-600/30",
    gradient: "from-slate-900 via-lime-950/40 to-slate-900",
    accentText: "text-lime-400",
    accentSoft: "bg-lime-500/10",
    chipBorder: "border-lime-500/30",
    buttonBg: "bg-lime-500 hover:bg-lime-400",
    link: "text-lime-400 hover:text-lime-300",
  },
  loops: {
    border: "border-lime-600/30",
    gradient: "from-slate-900 via-lime-950/40 to-slate-900",
    accentText: "text-lime-400",
    accentSoft: "bg-lime-500/10",
    chipBorder: "border-lime-500/30",
    buttonBg: "bg-lime-500 hover:bg-lime-400",
    link: "text-lime-400 hover:text-lime-300",
  },
  graphs: {
    border: "border-lime-600/30",
    gradient: "from-slate-900 via-lime-950/40 to-slate-900",
    accentText: "text-lime-400",
    accentSoft: "bg-lime-500/10",
    chipBorder: "border-lime-500/30",
    buttonBg: "bg-lime-500 hover:bg-lime-400",
    link: "text-lime-400 hover:text-lime-300",
  },
  mcp_servers: {
    border: "border-red-600/30",
    gradient: "from-slate-900 via-red-950/40 to-slate-900",
    accentText: "text-red-400",
    accentSoft: "bg-red-500/10",
    chipBorder: "border-red-500/30",
    buttonBg: "bg-red-500 hover:bg-red-400",
    link: "text-red-400 hover:text-red-300",
  },
  plugins: {
    border: "border-purple-500/30",
    gradient: "from-slate-900 via-purple-950/40 to-slate-900",
    accentText: "text-purple-400",
    accentSoft: "bg-purple-500/10",
    chipBorder: "border-purple-500/30",
    buttonBg: "bg-purple-500 hover:bg-purple-400",
    link: "text-purple-400 hover:text-purple-300",
  },
  connectors: {
    border: "border-orange-500/30",
    gradient: "from-slate-900 via-orange-950/40 to-slate-900",
    accentText: "text-orange-400",
    accentSoft: "bg-orange-500/10",
    chipBorder: "border-orange-500/30",
    buttonBg: "bg-orange-500 hover:bg-orange-400",
    link: "text-orange-400 hover:text-orange-300",
  },
};
```

---

## Fix Implementation

### Requirement 1 — Fix `root-route-head.test.ts`

**File:** `src/__tests__/root-route-head.test.ts`

**Changes:**

1. Remove the `vi.mock('../components/DeploymentDriftBanner', ...)` block —
   `DeploymentDriftBanner` does not exist in `src/components/` and is not
   imported by `__root.tsx`.
2. Add a `vi.mock` for `../design-system.css?url` to mirror the existing
   `../styles.css?url` mock. `__root.tsx` imports both CSS files via `?url`.

```typescript
// REMOVE this entire block:
vi.mock("../components/DeploymentDriftBanner", () => ({
  DeploymentDriftBanner: () => null,
}));

// ADD this block (alongside the existing styles.css?url mock):
vi.mock("../design-system.css?url", () => ({
  default: "/src/design-system.css",
}));
```

All other `vi.mock` calls remain unchanged.

---

### Requirement 2 — Fix `CoralPageWrapper.getCoralLogoSrc`

**File:** `src/components/CoralPageWrapper.tsx`

Replace the broken switch with a single lookup via `tierTheme.ts`.

```typescript
// BEFORE — every case returns the same hardcoded string
function getCoralLogoSrc(pageType: string): string {
  switch (pageType) {
    case "skills":
    case "flows":
    // ... all return "/coral-logo-purple.png"
    default:
      return "/coral-logo-purple.png";
  }
}

// AFTER
import { PAGE_TYPE_TO_TIER, TIER_LOGO } from "../lib/tierTheme";

function getCoralLogoSrc(pageType: string): string {
  const tier = PAGE_TYPE_TO_TIER[pageType] ?? "home";
  return TIER_LOGO[tier];
}
```

`getPageTitle` is correct and unchanged. The `CoralPageWrapperProps` interface
type union is unchanged.

---

### Requirement 3 — Fix Homepage Hero + Add Freelancer Table

**File:** `src/routes/index.tsx`

**3a. Fix hero logo src:**

```tsx
// BEFORE
<img src="/coral-logo-purple.png" alt="CoralNest" className="home-v2-hero-logo" />

// AFTER — combined identity logo for the homepage
<img src="/coral-logo.png" alt="CoralNest" className="home-v2-hero-logo" />
```

**3b. Add Freelancer analogy section** between `<HomeRegistryTiers />` and the
first catalog grid. This is static markup — no data fetch.

```tsx
const FREELANCER_ANALOGY = [
  { concept: "Knowledge & Skillset", tier: "Skills" },
  { concept: "Work Methodology & Process", tier: "Loops & Graphs" },
  { concept: "Hardware & Local Toolbelt", tier: "MCP Servers" },
  { concept: "Client Passwords & SaaS Access", tier: "Connectors" },
  { concept: "Pre-Packaged Toolkit", tier: "Plugins" },
  { concept: "The Complete Specialist You Hire", tier: "Personas" },
] as const;

// Rendered as a section with a two-column table:
// Column 1: "When a freelancer has…" | Column 2: "CoralNest calls it…"
// aria-label="Freelancer analogy"
// Six rows — one for each entry.
// Static, no imports, no side effects — failure is impossible.
```

No other changes to `index.tsx`. All six `HomeCatalogSection` instances,
`HomeRegistryTiers`, `HomeAppsSection`, and `HomeBringSkillsSection` unchanged.

---

### Requirement 4 — Persona Page Branded Holding Page

**File:** `src/routes/persona/index.tsx`

**Why not `CatalogBrowse`:** `CatalogBrowse.defaultType` accepts
`AssetType | "all"`. `"personas"` is not in `AssetType`. Adding it is a
separate data-pipeline concern beyond this bugfix. The correct approach is a
branded holding page with a conditional that can activate `CatalogBrowse` when
`"personas"` is later added to `AssetType`.

**Page title:** `CoralPageWrapper pageType="creators"` renders `getPageTitle`
as `"Personas"` and `data-coral-page="creators"`. The section header banner in
`CoralPageWrapper` uses this to display "Personas" — no `<title>` override
needed beyond what `CoralPageWrapper` already provides. The TanStack Start
route should add a `head()` function setting `title: "Personas — CoralNest"`.

**Implementation:**

```tsx
// src/routes/persona/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { CoralPageWrapper } from "../../components/CoralPageWrapper";
import { SITE_NAME } from "../../lib/site";

export const Route = createFileRoute("/persona/")({
  head: () => ({
    meta: [{ title: `Personas — ${SITE_NAME}` }],
  }),
  component: PersonaIndex,
});

function PersonaIndex() {
  return (
    <CoralPageWrapper pageType="creators">
      <main className="browse-page browse-page-borderless-header">
        <div className="flex flex-col items-center gap-6 py-20 text-center">
          <img
            src="/coral-logo-pink.png"
            alt="Personas"
            className="h-20 w-20 rounded-2xl"
            draggable={false}
          />
          <h1 className="text-3xl font-extrabold text-white">Personas</h1>
          <p className="mx-auto max-w-lg text-base text-slate-400">
            Complete agent archetypes with pre-wired Flows, MCP Servers, and Connectors. The full
            specialist you hire — packaged and ready.
          </p>
          <p className="text-sm font-semibold text-pink-400">Coming Soon</p>
        </div>
      </main>
    </CoralPageWrapper>
  );
}
```

When `"personas"` is added to `AssetType` and the table has rows, the
component can be extended with a data-check conditional that renders
`CatalogBrowse` instead of the holding page.

---

### Requirement 5 Deviation — `convexDeploymentUrl.ts` Is NOT Dead Code

**The requirement asks to delete `src/lib/convexDeploymentUrl.ts` and its test.**

**Verified active importers (grep confirmed):**

- `server/convexProxy.ts:2` — imports `convexDeploymentName` and
  `resolveConvexSiteUrl`, used in `buildConvexProxyTarget` and `proxyConvexRequest`.
  This is the Nitro HTTP proxy that forwards client-side Convex API calls at
  runtime.
- `scripts/vercel-build-frontend.ts:5` — imports `resolveConvexSiteUrl`, used
  to inject `VITE_CONVEX_SITE_URL` into the Vercel production build env.
  Deleting this file would break every Vercel deployment.

**Decision:** Do not delete these files. The requirement's claim that "no
component in `src/components/` or `src/routes/` imports" them is technically
true, but the files are actively used in `server/` and `scripts/` which are
equally critical. Requirement 5 is closed as **not applicable — file is in
active use outside the app component tree**.

---

### Requirement 6 — Per-Tier Link Colors in `HomeCatalogSection`

**File:** `src/components/home/HomeCatalogSection.tsx`

Import `TIER_LINK_COLOR` from `tierTheme.ts` and replace the hardcoded class.

```typescript
// BEFORE
className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-teal-400 transition-colors hover:text-teal-300"

// AFTER
import { TIER_LINK_COLOR } from "../../lib/tierTheme";
// ...
const linkClass = TIER_LINK_COLOR[type] ?? "text-slate-400 hover:text-slate-300";
// ...
className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${linkClass}`}
```

The fallback `"text-slate-400 hover:text-slate-300"` handles any unknown type
without crashing. Keyboard focus ring is provided by the added
`focus-visible:outline-2 focus-visible:outline-offset-2` classes.

---

### Requirement 7 — Per-Tier Hero Theme in `CatalogAssetDetail`

**File:** `src/components/catalog/CatalogAssetDetail.tsx`

1. Remove the local `CatalogDetailTheme` type and `DETAIL_THEME` const — they
   move to `tierTheme.ts`.
2. Import `DETAIL_THEMES` and `CatalogDetailTheme` from `tierTheme.ts`.
3. Change the `const theme = DETAIL_THEME` line to a per-type lookup.

```typescript
// BEFORE
type CatalogDetailTheme = { ... };     // local type definition
const DETAIL_THEME: CatalogDetailTheme = {
  border: "border-teal-500/30",
  ...
};
// inside component:
const theme = DETAIL_THEME;

// AFTER
import { DETAIL_THEMES, type CatalogDetailTheme } from "../../lib/tierTheme";
// (CatalogDetailTheme type removed from this file)
// inside component:
const theme = DETAIL_THEMES[type] ?? DETAIL_THEMES.skills; // skills as safe fallback
```

**Scope of theme application:** Only the hero `<div>` uses `theme.*` classes.
The metadata panel, README section, Details section, Payload section, and file
tree section all use static `border-slate-800` / `bg-slate-900/90` classes and
are **not affected** by this change.

The file preview path label (`text-teal-400` in the file tree) is a minor
cosmetic issue not covered by the requirements — leave it unchanged.

---

## Correctness Properties

### Property 1: Per-Tier Logo Mapping

For all `pageType` in `{"flows","skills","mcp","plugins","connectors","creators","home"}`:

```
FOR ALL pageType IN PAGE_TYPE_TO_TIER DO
  tier   ← PAGE_TYPE_TO_TIER[pageType]
  result ← TIER_LOGO[tier]
  ASSERT result IS DEFINED
  ASSERT result CONTAINS the expected filename suffix
    // flows/skills → "-olive.png"
    // mcp         → "-red.png"
    // plugins     → "-purple.png"
    // connectors  → "-orange.png"
    // creators    → "-pink.png"
    // home        → "-logo.png" (no color suffix)
END FOR
```

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

### Property 2: Per-Tier Detail Theme

```
FOR ALL assetType IN {"skills","loops","graphs","mcp_servers","plugins","connectors"} DO
  theme ← DETAIL_THEMES[assetType]
  ASSERT theme IS NOT undefined
  ASSERT theme.border DOES NOT CONTAIN "teal"
  ASSERT theme matches the tier identity:
    skills/loops/graphs → lime classes
    mcp_servers         → red classes
    plugins             → purple classes
    connectors          → orange classes
END FOR
```

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6**

### Property 3: Per-Tier Browse Link Color

```
FOR ALL assetType IN {"skills","loops","graphs","mcp_servers","plugins","connectors"} DO
  linkClass ← TIER_LINK_COLOR[assetType]
  ASSERT linkClass IS NOT undefined
  ASSERT linkClass DOES NOT CONTAIN "teal-400"
END FOR
```

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 4: Preservation

```
FOR ALL inputs WHERE NOT isBugCondition(input) DO
  ASSERT fixed_codebase(input) = original_codebase(input)
END FOR
// Specifically:
// - CatalogBrowse pages render live data unchanged
// - Detail routes fetch and display metadata unchanged
// - Search typeahead unchanged
// - AppProviders unchanged
// - __root.tsx shell structure unchanged
```

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

---

## Testing Strategy

### Unit Tests to Write

After implementing the fixes, add tests in `src/__tests__/` or alongside the
affected files:

1. **`tierTheme.test.ts`** (new) — pure function exhaustive tests:
   - All 7 `pageType` values in `PAGE_TYPE_TO_TIER` resolve to a defined
     `TIER_LOGO` value.
   - All 6 `AssetType` values resolve to a defined `DETAIL_THEMES` entry with
     no `"teal"` in any property.
   - All 6 `AssetType` values resolve to a defined `TIER_LINK_COLOR` entry with
     no `"teal-400"` in the class string.

2. **`root-route-head.test.ts`** (existing, edited) — after removing the stale
   mock and adding `design-system.css?url` mock, the existing test assertions
   pass as before.

3. **Regression**: `bun run ci:unit` continues to pass all existing tests:
   `flows-index`, `home-route`, `search-route`, `home-bring-skills-section`,
   `root-route-head`, `openapi-contract`, `vercel-preview-config`, and all
   CI workflow tests.

### Validation Sequence

```
1. bun run ci:unit          — all tests pass including root-route-head
2. bun run ci:types-build   — TypeScript clean after tierTheme.ts additions
3. bun run ci:static        — lint/format/dead-code pass
```
