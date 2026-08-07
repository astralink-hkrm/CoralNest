import type { StaticCatalogItem } from "clawhub-schema/staticCatalogs";
import { COMPOSIO_CONNECTORS, OPEN_SOURCE_MCP_SERVERS } from "clawhub-schema/staticCatalogs";
import type { ActionCtx } from "../_generated/server";
import { corsHeaders, mergeHeaders } from "../lib/httpHeaders";
import { getPathSegments } from "../lib/httpPathSegments";
import { applyRateLimit } from "../lib/httpRateLimit";
import { json, text, toOptionalNumber } from "./shared";

const MAX_STATIC_CATALOG_LIMIT = 100;

function staticCatalogDataset(family: StaticCatalogItem["family"]): StaticCatalogItem[] {
  return family === "connectors" ? COMPOSIO_CONNECTORS : OPEN_SOURCE_MCP_SERVERS;
}

function filterStaticCatalog(items: StaticCatalogItem[], q?: string): StaticCatalogItem[] {
  const query = q?.trim().toLowerCase();
  if (!query) return items;
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(query) ||
      item.displayName.toLowerCase().includes(query) ||
      item.summary?.toLowerCase().includes(query) ||
      item.topics?.some((t) => t.toLowerCase().includes(query)) ||
      item.categories?.some((c) => c.toLowerCase().includes(query)),
  );
}

function pageStaticCatalog(items: StaticCatalogItem[], limit: number): StaticCatalogItem[] {
  return items.slice(0, limit);
}

async function listStaticCatalogHandler(
  ctx: ActionCtx,
  request: Request,
  family: StaticCatalogItem["family"],
) {
  const rate = await applyRateLimit(ctx, request, "read");
  if (!rate.ok) return rate.response;

  const url = new URL(request.url);
  const requestedLimit = toOptionalNumber(url.searchParams.get("limit"));
  const limit =
    requestedLimit === undefined
      ? MAX_STATIC_CATALOG_LIMIT
      : Math.max(1, Math.min(MAX_STATIC_CATALOG_LIMIT, Math.floor(requestedLimit)));
  const q = url.searchParams.get("q") ?? undefined;

  const filtered = filterStaticCatalog(staticCatalogDataset(family), q);
  const items = pageStaticCatalog(filtered, limit);

  return json(
    {
      items,
      totalCount: filtered.length,
      nextCursor: null,
    },
    200,
    mergeHeaders(rate.headers, corsHeaders()),
  );
}

async function staticCatalogGetHandler(
  ctx: ActionCtx,
  request: Request,
  family: StaticCatalogItem["family"],
  prefix: string,
) {
  const rate = await applyRateLimit(ctx, request, "read");
  if (!rate.ok) return rate.response;

  const segments = getPathSegments(request, prefix);
  if (segments.length !== 1) {
    return text("Not found", 404, mergeHeaders(rate.headers, corsHeaders()));
  }
  const name = segments[0]!.toLowerCase();
  const item = staticCatalogDataset(family).find((entry) => entry.name.toLowerCase() === name);
  if (!item) {
    return text("Not found", 404, mergeHeaders(rate.headers, corsHeaders()));
  }

  // Connectors are backed by Composio: a configured entryUrl becomes a 302
  // redirect to the Composio product surface. Without one, serve the item.
  if (item.entryUrl) {
    return new Response(null, {
      status: 302,
      headers: mergeHeaders({ Location: item.entryUrl }, rate.headers, corsHeaders()),
    });
  }

  return json(item, 200, mergeHeaders(rate.headers, corsHeaders()));
}

export async function listConnectorsV1Handler(ctx: ActionCtx, request: Request) {
  return await listStaticCatalogHandler(ctx, request, "connectors");
}

export async function connectorsGetRouterV1Handler(ctx: ActionCtx, request: Request) {
  return await staticCatalogGetHandler(ctx, request, "connectors", "/api/v1/connectors/");
}

export async function listMcpV1Handler(ctx: ActionCtx, request: Request) {
  return await listStaticCatalogHandler(ctx, request, "mcp");
}

export async function mcpGetRouterV1Handler(ctx: ActionCtx, request: Request) {
  return await staticCatalogGetHandler(ctx, request, "mcp", "/api/v1/mcp/");
}
