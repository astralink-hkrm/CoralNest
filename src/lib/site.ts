import { getRuntimeEnv } from "./runtimeEnv";

const DEFAULT_CLAWHUB_SITE_URL = "https://coralnest.ai";

export const SITE_NAME = "CoralNest";
export const SITE_DESCRIPTION = "CoralNest — a fast skill registry for agents, with vector search.";

export function normalizeCoralNestSiteOrigin(value?: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getClawHubSiteUrl() {
  return normalizeCoralNestSiteOrigin(getRuntimeEnv("VITE_SITE_URL")) ?? DEFAULT_CLAWHUB_SITE_URL;
}
