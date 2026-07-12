import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((options: unknown) => ({ redirect: options }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (config: unknown) => ({ __config: config, __path: path }),
  redirect: (options: unknown) => redirectMock(options),
}));

type LegacyRedirectRoute = {
  __config: {
    beforeLoad: (args: { search: Record<string, string | undefined> }) => never;
    validateSearch: (search: Record<string, unknown>) => Record<string, string | undefined>;
  };
  __path: string;
};

async function loadRoute(path: string): Promise<LegacyRedirectRoute> {
  return ((await import(path)) as { Route: LegacyRedirectRoute }).Route;
}

describe("legacy publish redirects", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("redirects legacy skill publish links to /skills/publish", async () => {
    const route = await loadRoute("../routes/publish-skill");
    const search = route.__config.validateSearch({
      updateSlug: "dronzer",
      ownerHandle: "vintageayu",
      ignored: "drop-me",
    });

    expect(route.__path).toBe("/publish-skill");
    expect(search).toEqual({ updateSlug: "dronzer", ownerHandle: "vintageayu" });
    expect(() => route.__config.beforeLoad({ search })).toThrow();
    expect(redirectMock).toHaveBeenCalledWith({
      to: "/skills/publish",
      search,
    });
  });
});
