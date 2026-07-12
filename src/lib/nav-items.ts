import { CLAWHUB_REPOSITORY_URL, PublicRegistryPaths } from "./publicRegistry";

/**
 * Shared navigation configuration used by Header and Footer to eliminate
 * triple duplication of nav link definitions.
 */

const CORALNEST_DOCS_URL = "https://coralnest.ai/docs";

interface NavItemBase {
  /** Visible link text */
  label: string;
  /** Additional path prefixes that should also highlight this nav item (e.g. /skill for /skills) */
  activePathPrefixes?: string[];
}

interface RouteNavItem extends NavItemBase {
  /** Route path passed to `<Link to>` */
  to: string;
  href?: never;
  /** Optional search params object passed to `<Link search>` */
  search?: Record<string, unknown>;
}

interface ExternalNavItem extends NavItemBase {
  /** URL rendered as a normal anchor, including external and static app paths. */
  href: string;
  to?: never;
  search?: never;
}

type NavItem = RouteNavItem | ExternalNavItem;

// ---------------------------------------------------------------------------
// Search-param shapes (kept here so Header, Footer, and mobile menu all agree)
// ---------------------------------------------------------------------------

const SKILLS_SEARCH = {
  q: undefined,
  sort: undefined,
  dir: undefined,
  highlighted: undefined,
  view: undefined,
  focus: undefined,
} as const;

// ---------------------------------------------------------------------------
// Primary nav items (desktop tabs row + mobile dropdown top section)
// These map to the content-type tabs: Skills | Plugins | Creators
// ---------------------------------------------------------------------------

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    label: "Skills",
    to: PublicRegistryPaths.skills,
    search: SKILLS_SEARCH,
    activePathPrefixes: ["/skill/"],
  },
  {
    label: "Creators",
    to: PublicRegistryPaths.creators,
    activePathPrefixes: ["/publishers"],
  },
];

// ---------------------------------------------------------------------------
// Secondary nav items (desktop secondary tabs + mobile dropdown section)
// ---------------------------------------------------------------------------

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    label: "Docs",
    href: CORALNEST_DOCS_URL,
    activePathPrefixes: ["/docs"],
  },
];

// ---------------------------------------------------------------------------
// Footer sections
// ---------------------------------------------------------------------------

export const CORALNEST_REPOSITORY_URL = CLAWHUB_REPOSITORY_URL;

interface FooterNavSection {
  title: string;
  items: FooterNavItem[];
}

type FooterNavItem =
  | {
      kind: "link";
      label: string;
      to: string;
      search?: Record<string, unknown>;
      featureFlag?: boolean;
    }
  | {
      kind: "external";
      label: string;
      href: string;
      icon?: "github" | "discord";
      featureFlag?: boolean;
    }
  | { kind: "text"; label: string; featureFlag?: boolean };

export const FOOTER_NAV_SECTIONS: FooterNavSection[] = [
  {
    title: "Browse",
    items: [
      { kind: "link", label: "Skills", to: PublicRegistryPaths.skills, search: SKILLS_SEARCH },
      { kind: "link", label: "Creators", to: PublicRegistryPaths.creators },
      {
        kind: "link",
        label: "Audits",
        to: PublicRegistryPaths.audits,
        search: { type: undefined },
      },
    ],
  },
  {
    title: "Publish",
    items: [
      {
        kind: "link",
        label: "Publish Skill",
        to: PublicRegistryPaths.publishSkill,
        search: { updateSlug: undefined },
      },
      {
        kind: "link",
        label: "Create org",
        to: "/settings",
        search: { view: "organizations" },
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        kind: "external",
        label: "GitHub",
        href: CLAWHUB_REPOSITORY_URL,
        icon: "github",
      },
    ],
  },
];

export const FOOTER_PLATFORM_LINKS = [
  { label: "Deployed on Vercel", href: "https://vercel.com" },
  { label: "Powered by Convex", href: "https://www.convex.dev" },
] as const;




