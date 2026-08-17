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
  connectors: "text-sky-400 hover:text-sky-300",
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
    border: "border-sky-500/30",
    gradient: "from-slate-900 via-sky-950/40 to-slate-900",
    accentText: "text-sky-400",
    accentSoft: "bg-sky-500/10",
    chipBorder: "border-sky-500/30",
    buttonBg: "bg-sky-500 hover:bg-sky-400",
    link: "text-sky-400 hover:text-sky-300",
  },
};
