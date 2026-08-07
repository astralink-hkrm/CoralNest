import type { FlowsCatalogResponse, FlowCatalogItem, FlowSkillItem } from "clawhub-schema/flows";
import { FLOWS_SKILLS_PREVIEW_LIMIT, MAX_FLOWS_CATALOG_LIMIT } from "clawhub-schema/flows";
import { api } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { applyRateLimit } from "../lib/httpRateLimit";
import { fetchOpenFlowsCatalog } from "../lib/openFlowsCatalog";
import { json, toOptionalNumber } from "./shared";

const FLOWS_FETCH_TIMEOUT_MS = 12_000;

type FlowKindQuery = "all" | "skills" | "loops" | "graphs";

function parseKindQuery(value: string | null): FlowKindQuery {
  if (value === "skills" || value === "loops" || value === "graphs") return value;
  return "all";
}

function flowItemMatches(item: FlowCatalogItem, query: string): boolean {
  const q = query.toLowerCase();
  if (!q) return true;
  const haystack = [item.displayName, item.name, item.summary ?? "", ...item.topics]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function filterFlowItems(
  items: FlowCatalogItem[],
  request: URL,
): { items: FlowCatalogItem[]; totalCount: number } {
  const kind = parseKindQuery(request.searchParams.get("kind"));
  const query = request.searchParams.get("q")?.trim() ?? "";
  const filtered = items.filter((item) => {
    if (kind === "skills" && item.kind !== "skill") return false;
    if (kind === "loops" && item.kind !== "loop") return false;
    if (kind === "graphs" && item.kind !== "graph") return false;
    return flowItemMatches(item, query);
  });
  return { items: filtered, totalCount: filtered.length };
}

type PublicSkillCatalogItem = {
  name: string;
  displayName: string;
  summary: string | null;
  topics?: string[];
  ownerHandle: string | null;
  createdAt: number;
  updatedAt: number;
  stats: { downloads: number; installs: number; stars: number; versions: number };
};

function toFlowSkillItem(item: PublicSkillCatalogItem): FlowSkillItem {
  return {
    kind: "skill",
    name: item.name,
    displayName: item.displayName,
    summary: item.summary,
    ownerHandle: item.ownerHandle,
    topics: item.topics ?? [],
    stats: {
      downloads: item.stats.downloads,
      installs: item.stats.installs,
      stars: item.stats.stars,
      versions: item.stats.versions,
    },
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function listFlowsV1Handler(ctx: ActionCtx, request: Request): Promise<Response> {
  const rate = await applyRateLimit(ctx, request, "read");
  if (!rate.ok) return rate.response;

  const url = new URL(request.url);
  const requestedLimit = toOptionalNumber(url.searchParams.get("limit"));
  const limit =
    requestedLimit === undefined
      ? MAX_FLOWS_CATALOG_LIMIT
      : Math.max(1, Math.min(MAX_FLOWS_CATALOG_LIMIT, Math.floor(requestedLimit)));

  const skills = (await ctx.runQuery(api.skills.listPackageCatalogPage, {
    sort: "recommended",
    paginationOpts: { cursor: null, numItems: FLOWS_SKILLS_PREVIEW_LIMIT },
  })) as { page?: PublicSkillCatalogItem[] };

  const openFlows = await fetchOpenFlowsCatalog({ timeoutMs: FLOWS_FETCH_TIMEOUT_MS });

  const combined: FlowCatalogItem[] = [
    ...(skills.page ?? []).map(toFlowSkillItem),
    ...openFlows.items,
  ];

  const filtered = filterFlowItems(combined, url);
  const items = filtered.items.slice(0, limit);

  const responseBody: FlowsCatalogResponse = {
    items,
    totalCount: filtered.totalCount,
    nextCursor: null,
    sources: {
      total: openFlows.total,
      ok: openFlows.items.length - openFlows.fallback.length,
      fallback: openFlows.fallback,
      failed: openFlows.failed,
    },
  };

  return json(responseBody, 200, rate.headers);
}
