import type { FlowsCatalogResponse, FlowCatalogItem } from "clawhub-schema/flows";
import { publicApiUrl } from "./publicApiUrl";

export type FlowsKindFilter = "all" | "skills" | "loops" | "graphs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFlowCatalogItem(value: unknown): value is FlowCatalogItem {
  if (!isRecord(value)) return false;
  if (!isNullableString(value.displayName)) return false;
  if (!isNullableString(value.summary)) return false;
  if (!Array.isArray(value.topics) || !value.topics.every((t) => typeof t === "string")) {
    return false;
  }
  if (value.kind === "skill") {
    return (
      typeof value.name === "string" &&
      isNullableString(value.ownerHandle) &&
      isRecord(value.stats) &&
      isNumber(value.createdAt) &&
      isNumber(value.updatedAt)
    );
  }
  if (value.kind === "loop" || value.kind === "graph") {
    return (
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      isNumber(value.stepCount) &&
      Array.isArray(value.loopKinds) &&
      isRecord(value.source) &&
      typeof value.source.repo === "string" &&
      typeof value.source.path === "string" &&
      typeof value.source.url === "string" &&
      isNumber(value.updatedAt)
    );
  }
  return false;
}

function parseFlowsCatalogResponse(value: unknown): FlowsCatalogResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    !value.items.every(isFlowCatalogItem) ||
    !isNumber(value.totalCount) ||
    value.nextCursor !== null ||
    !isRecord(value.sources) ||
    !isNumber(value.sources.total) ||
    !isNumber(value.sources.ok) ||
    !Array.isArray(value.sources.failed) ||
    !value.sources.failed.every((f) => typeof f === "string")
  ) {
    throw new Error("Invalid /api/v1/flows response");
  }
  return value as FlowsCatalogResponse;
}

export async function fetchFlowsCatalog({
  kind,
  q,
  limit,
  signal,
}: {
  kind?: FlowsKindFilter;
  q?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<FlowsCatalogResponse> {
  const url = publicApiUrl("/api/v1/flows");
  if (kind && kind !== "all") url.searchParams.set("kind", kind);
  if (q?.trim()) url.searchParams.set("q", q.trim());
  if (limit !== undefined) url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials:
      typeof window !== "undefined" && url.origin === window.location.origin ? "include" : "omit",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    const message = (await response.text()).trim();
    throw new Error(message || `Flows request failed with status ${response.status}`);
  }
  return parseFlowsCatalogResponse(await response.json());
}
