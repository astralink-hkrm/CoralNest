import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchFlowsCatalog } from "./flowsApi";

const CATALOG_PAGE = {
  items: [
    {
      kind: "skill",
      name: "code-analysis",
      displayName: "Code Analysis",
      summary: "Static analysis",
      ownerHandle: "openclaw",
      topics: ["code"],
      stats: { downloads: 10, installs: 5, stars: 1, versions: 1 },
      createdAt: 1,
      updatedAt: 2,
    },
    {
      kind: "loop",
      id: "agent-loop-flow/batch-process",
      name: "batch-process",
      displayName: "Batch Process",
      summary: "Loop over files",
      loopKinds: ["for-each"],
      topics: ["batch"],
      stepCount: 3,
      source: {
        repo: "dyoshikawa/agent-loop-flow",
        path: "examples/loop-processing.jsonc",
        url: "https://github.com/dyoshikawa/agent-loop-flow/blob/main/examples/loop-processing.jsonc",
      },
      updatedAt: 2,
    },
  ],
  totalCount: 2,
  nextCursor: null,
  sources: { total: 4, ok: 4, failed: [] },
};

describe("fetchFlowsCatalog", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubEnv("VITE_CONVEX_SITE_URL", "https://catalog.example");
  });

  it("requests the flows catalog with kind and search params", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(CATALOG_PAGE), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchFlowsCatalog({ kind: "loops", q: "batch", limit: 20 });
    expect(data.totalCount).toBe(2);
    expect(data.items).toHaveLength(2);

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/v1/flows");
    expect(url.searchParams.get("kind")).toBe("loops");
    expect(url.searchParams.get("q")).toBe("batch");
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("omits default kind=all and empty query params", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(CATALOG_PAGE), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchFlowsCatalog({});
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.has("kind")).toBe(false);
    expect(url.searchParams.has("q")).toBe(false);
  });

  it("throws on non-ok responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    await expect(fetchFlowsCatalog({})).rejects.toThrow(/nope/);
  });

  it("throws on malformed payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: "nope" }), { status: 200 })),
    );
    await expect(fetchFlowsCatalog({})).rejects.toThrow(/Invalid \/api\/v1\/flows response/);
  });
});
