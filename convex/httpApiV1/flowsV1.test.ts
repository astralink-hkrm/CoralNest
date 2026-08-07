/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/httpRateLimit", () => ({
  applyRateLimit: vi.fn(async () => ({ ok: true, headers: { "x-rate-limit": "ok" } })),
}));

const { applyRateLimit } = await import("../lib/httpRateLimit");
const { listFlowsV1Handler } = await import("./flowsV1");

const SKILL_PAGE = {
  page: [
    {
      name: "code-analysis",
      displayName: "Code Analysis",
      summary: "Static analysis for TypeScript",
      topics: ["code", "analysis"],
      ownerHandle: "openclaw",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
      stats: { downloads: 10, installs: 5, stars: 2, versions: 1 },
    },
  ],
  isDone: true,
  continueCursor: "",
};

const LOOP_FLOW_TEXT = `{
  "name": "batch-process",
  "description": "Process multiple files using for-each and while loops",
  "defaultTool": "opencode",
  "steps": [
    { "type": "for-each", "name": "process-files", "items": "files",
      "steps": [ { "type": "skill", "skill": "linter", "prompt": "Lint the file" } ] },
    { "type": "while-loop", "name": "retry-loop", "condition": "retryEnabled", "maxIterations": 3,
      "steps": [ { "type": "skill", "skill": "test-runner", "prompt": "Re-run failing tests" } ] },
  ],
}`;

const GRAPH_FLOW_TEXT = `{
  "name": "conditional-fix",
  "description": "Analyze code and conditionally fix issues",
  "steps": [
    { "type": "skill", "name": "analyze", "skill": "code-analysis", "prompt": "Analyze for bugs" },
    { "type": "skill", "name": "fix-issues", "skill": "code-fix", "prompt": "Fix issues" },
  ],
}`;

function mockSkillsPage(ctx: { runQuery: ReturnType<typeof vi.fn> }) {
  ctx.runQuery.mockImplementation(async () => SKILL_PAGE);
}

beforeEach(() => {
  vi.mocked(applyRateLimit).mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.includes("examples/loop-processing.jsonc"))
        return new Response(LOOP_FLOW_TEXT, { status: 200 });
      if (href.includes("workflow.yaml")) {
        return new Response('name: "Demo-sdlc"\nnodes:\n  a:\n    type: agent\n', { status: 200 });
      }
      return new Response(GRAPH_FLOW_TEXT, { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("flows HTTP API", () => {
  it("combines live skills and open-source flows with totals and source outcomes", async () => {
    const ctx = { runQuery: vi.fn() };
    mockSkillsPage(ctx);
    const response = await listFlowsV1Handler(
      ctx as never,
      new Request("https://clawhub.ai/api/v1/flows"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-rate-limit")).toBe("ok");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const body = await response.json();
    expect(body.items.length).toBeGreaterThan(1);
    const kinds = new Set(body.items.map((item: { kind: string }) => item.kind));
    expect(kinds.has("skill")).toBe(true);
    expect(kinds.has("loop")).toBe(true);
    expect(kinds.has("graph")).toBe(true);
    expect(body.totalCount).toBe(body.items.length);
    expect(body.nextCursor).toBeNull();
    expect(body.sources.total).toBeGreaterThan(0);
    expect(body.sources.ok).toBeGreaterThan(0);
    expect(applyRateLimit).toHaveBeenCalledOnce();
  });

  it("filters to skills only with kind=skills", async () => {
    const ctx = { runQuery: vi.fn() };
    mockSkillsPage(ctx);
    const response = await listFlowsV1Handler(
      ctx as never,
      new Request("https://clawhub.ai/api/v1/flows?kind=skills"),
    );
    const body = await response.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((item: { kind: string }) => item.kind === "skill")).toBe(true);
  });

  it("filters loops and graphs separately", async () => {
    const ctx = { runQuery: vi.fn() };
    mockSkillsPage(ctx);
    const loops = await listFlowsV1Handler(
      ctx as never,
      new Request("https://clawhub.ai/api/v1/flows?kind=loops"),
    );
    const loopsBody = await loops.json();
    expect(loopsBody.items.length).toBeGreaterThan(0);
    expect(loopsBody.items.every((item: { kind: string }) => item.kind === "loop")).toBe(true);

    const graphs = await listFlowsV1Handler(
      ctx as never,
      new Request("https://clawhub.ai/api/v1/flows?kind=graphs"),
    );
    const graphsBody = await graphs.json();
    expect(graphsBody.items.length).toBeGreaterThan(0);
    expect(graphsBody.items.every((item: { kind: string }) => item.kind === "graph")).toBe(true);
  });

  it("applies q filtering across names, summaries, and topics", async () => {
    const ctx = { runQuery: vi.fn() };
    mockSkillsPage(ctx);
    const response = await listFlowsV1Handler(
      ctx as never,
      new Request("https://clawhub.ai/api/v1/flows?q=batch"),
    );
    const body = await response.json();
    expect(body.items.length).toBe(1);
    expect(body.items[0]?.name).toBe("batch-process");
  });

  it("applies limit and clamps to the catalog max", async () => {
    const ctx = { runQuery: vi.fn() };
    mockSkillsPage(ctx);
    const response = await listFlowsV1Handler(
      ctx as never,
      new Request("https://clawhub.ai/api/v1/flows?limit=2"),
    );
    const body = await response.json();
    expect(body.items.length).toBeLessThanOrEqual(2);
  });

  it("keeps loops/graphs via bundled fallback when the live fetch fails", async () => {
    const ctx = { runQuery: vi.fn() };
    mockSkillsPage(ctx);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const response = await listFlowsV1Handler(
      ctx as never,
      new Request("https://clawhub.ai/api/v1/flows"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    const kinds = new Set(body.items.map((item: { kind: string }) => item.kind));
    expect(kinds.has("skill")).toBe(true);
    expect(kinds.has("loop")).toBe(true);
    expect(kinds.has("graph")).toBe(true);
    expect(body.sources.ok).toBe(0);
    expect(body.sources.fallback.length).toBe(body.sources.total);
    expect(body.sources.failed.length).toBe(0);
  });

  it("returns rate-limit responses when throttled", async () => {
    vi.mocked(applyRateLimit).mockResolvedValueOnce({
      ok: false,
      response: new Response("Too Many Requests", { status: 429 }),
    } as never);
    const response = await listFlowsV1Handler(
      { runQuery: vi.fn() } as never,
      new Request("https://clawhub.ai/api/v1/flows"),
    );
    expect(response.status).toBe(429);
  });
});
