/* @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlowsIndex, Route as FlowsRoute } from "../routes/flows/index";
import {
  convexHttpMock,
  convexReactMocks,
  resetConvexReactMocks,
  setupDefaultConvexReactMocks,
} from "./helpers/convexReactMocks";

const navigateMock = vi.fn();
let searchMock: Record<string, unknown> = {};
let loaderDataMock: unknown = null;

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: { component: unknown; validateSearch: unknown }) => ({
    __config: config,
    useLoaderData: () => loaderDataMock,
    useNavigate: () => navigateMock,
    useSearch: () => searchMock,
  }),
  useRouterState: (options: { select: (state: unknown) => unknown }) =>
    options.select({ location: { searchStr: "" } }),
  redirect: (options: unknown) => ({ redirect: options }),
  Link: (props: { children: ReactNode }) => <a href="/">{props.children}</a>,
}));

vi.mock("convex/react", () => ({
  ConvexReactClient: class {},
  useAction: (...args: unknown[]) => convexReactMocks.useAction(...args),
  useQuery: (...args: unknown[]) => convexReactMocks.useQuery(...args),
}));

vi.mock("../../src/convex/client", () => ({
  convexHttp: {
    action: (...args: unknown[]) => convexHttpMock.action(...args),
    query: (...args: unknown[]) => convexHttpMock.query(...args),
  },
}));

describe("FlowsIndex", () => {
  beforeEach(() => {
    resetConvexReactMocks();
    navigateMock.mockReset();
    searchMock = { tab: "skills" };
    loaderDataMock = {
      flowItems: [],
      totalFlowCount: 0,
      isLoadingFlows: false,
      flowsApiError: false,
      initialSkillsSearch: null,
    };
    setupDefaultConvexReactMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("validates and normalizes top-level flow tabs", () => {
    const validateSearch = (
      FlowsRoute as unknown as {
        __config: {
          validateSearch: (search: Record<string, unknown>) => Record<string, unknown>;
        };
      }
    ).__config.validateSearch;

    expect(validateSearch({ tab: "loops" })).toEqual(expect.objectContaining({ tab: "loops" }));
    expect(validateSearch({ tab: "graphs" })).toEqual(expect.objectContaining({ tab: "graphs" }));
    expect(validateSearch({ tab: "all" })).toEqual(expect.objectContaining({ tab: "all" }));
    expect(validateSearch({ tab: "skills" })).toEqual(expect.objectContaining({ tab: "skills" }));
    expect(validateSearch({})).toEqual(expect.objectContaining({ tab: "skills" }));
  });

  it("renders top-level tabs for Skills, Loops, Graphs, and All Flows", () => {
    render(<FlowsIndex />);

    expect(screen.getByRole("radio", { name: "Skills" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Loops" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Graphs" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "All Flows" })).toBeTruthy();
  });

  it("switches to Loops tab when Loops is clicked", () => {
    render(<FlowsIndex />);

    const loopsTab = screen.getByRole("radio", { name: "Loops" });
    fireEvent.click(loopsTab);

    expect(navigateMock).toHaveBeenCalled();
    const searchFn = navigateMock.mock.calls[0][0].search;
    const nextSearch = searchFn({ tab: "skills" });
    expect(nextSearch.tab).toBe("loops");
  });

  it("renders empty state for loops when on loops tab with no items", () => {
    searchMock = { tab: "loops" };
    render(<FlowsIndex />);

    expect(screen.getByText("No loops found")).toBeTruthy();
    expect(
      screen.getByText(
        "Open-source agentic loops will appear here as they are indexed from upstream repositories.",
      ),
    ).toBeTruthy();
  });

  it("renders empty state for graphs when on graphs tab with no items", () => {
    searchMock = { tab: "graphs" };
    render(<FlowsIndex />);

    expect(screen.getByText("No graphs found")).toBeTruthy();
    expect(
      screen.getByText(
        "Multi-agent graph architectures will appear here as they are indexed from upstream repositories.",
      ),
    ).toBeTruthy();
  });
});
