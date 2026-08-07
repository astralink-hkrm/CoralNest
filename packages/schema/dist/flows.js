/**
 * Shared types for the agent-flows catalog (`/flows` page and
 * `/api/v1/flows` endpoint).
 *
 * A "flow" is a prompt-based agent recipe. Skills are the live CoralNest
 * skill catalog (ClawHub `skills`); loops and graphs are open-source agent
 * flows, fetched live from their upstream repositories at request time and
 * served from bundled verified snapshots when a live fetch/parse fails, so
 * the catalog never silently drops loops/graphs.
 */
export const MAX_FLOWS_CATALOG_LIMIT = 100;
/** Bounded skills preview included alongside open-source loops/graphs. */
export const FLOWS_SKILLS_PREVIEW_LIMIT = 20;
//# sourceMappingURL=flows.js.map