/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/httpRateLimit", () => ({
  applyRateLimit: vi.fn(async () => ({ ok: true, headers: { "x-rate-limit": "ok" } })),
}));

const { applyRateLimit } = await import("../lib/httpRateLimit");
const {
  listConnectorsV1Handler,
  connectorsGetRouterV1Handler,
  listMcpV1Handler,
  mcpGetRouterV1Handler,
} = await import("./staticCatalogsV1");

beforeEach(() => {
  vi.mocked(applyRateLimit).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("static catalog HTTP API", () => {
  it("lists Composio connectors as JSON with a total count", async () => {
    const response = await listConnectorsV1Handler(
      { runQuery: vi.fn() } as never,
      new Request("https://clawhub.ai/api/v1/connectors"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-rate-limit")).toBe("ok");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const body = await response.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.totalCount).toBe(body.items.length);
    expect(body.nextCursor).toBeNull();
    expect(body.items.every((item: { family: string }) => item.family === "connectors")).toBe(true);
    expect(applyRateLimit).toHaveBeenCalledOnce();
  });

  it("applies q filtering and limits to the connectors list", async () => {
    const response = await listConnectorsV1Handler(
      { runQuery: vi.fn() } as never,
      new Request("https://clawhub.ai/api/v1/connectors?q=slack&limit=1"),
    );

    const body = await response.json();
    expect(body.items.length).toBe(1);
    expect(body.items[0]?.name).toBe("composio-slack");
    expect(body.totalCount).toBe(1);
    expect(body.nextCursor).toBeNull();
  });

  it("lists open-source MCP servers from the shared catalog", async () => {
    const response = await listMcpV1Handler(
      { runQuery: vi.fn() } as never,
      new Request("https://clawhub.ai/api/v1/mcp?limit=50"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((item: { family: string }) => item.family === "mcp")).toBe(true);
    expect(applyRateLimit).toHaveBeenCalledOnce();
  });

  it("serves a connector detail by name with a cross-origin header", async () => {
    const response = await connectorsGetRouterV1Handler(
      { runQuery: vi.fn() } as never,
      new Request("https://clawhub.ai/api/v1/connectors/composio-slack"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const item = await response.json();
    expect(item.name).toBe("composio-slack");
    expect(item.family).toBe("connectors");
  });

  it("serves an MCP detail by name", async () => {
    const response = await mcpGetRouterV1Handler(
      { runQuery: vi.fn() } as never,
      new Request("https://clawhub.ai/api/v1/mcp/mcp-server-github"),
    );

    expect(response.status).toBe(200);
    const item = await response.json();
    expect(item.name).toBe("mcp-server-github");
    expect(item.family).toBe("mcp");
  });

  it("redirects a connector detail to its Composio entry when entryUrl is configured", async () => {
    const response = await connectorsGetRouterV1Handler(
      { runQuery: vi.fn() } as never,
      new Request("https://clawhub.ai/api/v1/connectors/composio-slack"),
    );

    expect([200, 302]).toContain(response.status);
    if (response.status === 302) {
      expect(response.headers.get("location")).toMatch(/^https:\/\//);
    }
  });

  it("returns 404 for unknown catalog names", async () => {
    const connectorMiss = await connectorsGetRouterV1Handler(
      { runQuery: vi.fn() } as never,
      new Request("https://clawhub.ai/api/v1/connectors/nope"),
    );
    const mcpMiss = await mcpGetRouterV1Handler(
      { runQuery: vi.fn() } as never,
      new Request("https://clawhub.ai/api/v1/mcp/nope"),
    );

    expect(connectorMiss.status).toBe(404);
    expect(mcpMiss.status).toBe(404);
  });
});
