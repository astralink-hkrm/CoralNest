import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { BadgeCheck, PackageSearch, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
  BrowseActions,
  BrowseControls,
  BrowseControlsRow,
  BrowseSearchInput,
  BrowseSearchPanel,
  BrowseSearchTrigger,
  BrowseTabs,
  BrowseViewToggle,
  useBrowseSearchDisclosure,
} from "../../components/BrowseControls";
import { CoralPageWrapper } from "../../components/CoralPageWrapper";
import { PluginListItem } from "../../components/PluginListItem";
import { BrowseResultsSkeleton } from "../../components/skeletons/BrowseResultsSkeleton";
import { Button } from "../../components/ui/button";
import { formatBrowseCount } from "../../lib/browseCount";
import {
  fetchPluginCatalog,
  isRateLimitedPackageApiError,
  type PackageListItem,
} from "../../lib/packageApi";
import { useMediaQuery } from "../../lib/useMediaQuery";

type McpSort = "recommended" | "updated" | "downloads" | "trending";
type McpBrowseTab = McpSort | "official";

const MCP_PAGE_SIZE = 25;
const MCP_CATALOG_REQUEST_TIMEOUT_MS = 5_000;

type McpSearchState = {
  q?: string;
  cursor?: string;
  featured?: boolean;
  official?: boolean;
  sort?: McpSort;
  view?: "list" | "grid";
};

function normalizeMcpView(value: unknown): "list" | "grid" | undefined {
  if (value === "list") return "list";
  if (value === "grid") return "grid";
  return undefined;
}

type McpLoaderData = {
  items: PackageListItem[];
  nextCursor: string | null;
  rateLimited: boolean;
  retryAfterSeconds: number | null;
  totalCount?: number | null;
  isLoading?: boolean;
  apiError?: boolean;
};

type McpPageDataRequest = {
  q?: string;
  cursor?: string;
  featured?: boolean;
  official?: boolean;
  sort?: McpSort;
  signal?: AbortSignal;
};

function createMcpLoadingData(): McpLoaderData {
  return {
    items: [],
    nextCursor: null,
    rateLimited: false,
    retryAfterSeconds: null,
    totalCount: null,
    isLoading: true,
    apiError: false,
  };
}

function formatRetryDelay(retryAfterSeconds: number | null) {
  if (!retryAfterSeconds || retryAfterSeconds <= 0) return "in a moment";
  if (retryAfterSeconds < 60) {
    return `in about ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}`;
  }
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function parseMcpSort(value: unknown): McpSort | undefined {
  if (
    value === "recommended" ||
    value === "updated" ||
    value === "downloads" ||
    value === "trending"
  ) {
    return value;
  }
  return undefined;
}

function sortMcpItems(items: PackageListItem[], sort: McpSort) {
  if (sort === "recommended") return items;
  const sorted = [...items];
  sorted.sort((a, b) => {
    const tieBreak = () => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name);
    if (sort === "downloads") {
      return (b.stats?.downloads ?? 0) - (a.stats?.downloads ?? 0) || tieBreak();
    }
    return tieBreak();
  });
  return sorted;
}

const MCP_BROWSE_TABS = [
  { value: "recommended", label: "All" },
  { value: "trending", label: "Trending" },
  {
    value: "official",
    label: "Official",
    icon: <BadgeCheck size={14} strokeWidth={2.25} aria-hidden="true" />,
  },
  { value: "updated", label: "Updated" },
];

export async function loadMcpPageData(args: McpPageDataRequest): Promise<McpLoaderData> {
  const requestController = new AbortController();
  const abortFromNavigation = () => requestController.abort(args.signal?.reason);
  if (args.signal?.aborted) {
    abortFromNavigation();
  } else {
    args.signal?.addEventListener("abort", abortFromNavigation, { once: true });
  }
  const timeoutId = setTimeout(() => {
    requestController.abort(new DOMException("MCP catalog request timed out", "TimeoutError"));
  }, MCP_CATALOG_REQUEST_TIMEOUT_MS);

  try {
    const data = await fetchPluginCatalog({
      q: args.q,
      family: "mcp",
      officialFirst: !args.q,
      cursor: args.q ? undefined : args.cursor,
      featured: args.featured,
      isOfficial: args.official,
      sort: args.q ? undefined : (args.sort ?? "recommended"),
      limit: MCP_PAGE_SIZE,
      signal: requestController.signal,
      viewerMode: "anonymous",
    });

    return {
      items: data?.items ?? [],
      nextCursor: data?.nextCursor ?? null,
      totalCount: data?.totalCount ?? null,
      rateLimited: false,
      retryAfterSeconds: null,
      isLoading: false,
      apiError: false,
    };
  } catch (error) {
    if (args.signal?.aborted) throw error;
    if (isRateLimitedPackageApiError(error)) {
      return {
        items: [],
        nextCursor: null,
        rateLimited: true,
        retryAfterSeconds: error.retryAfterSeconds,
        totalCount: null,
        isLoading: false,
        apiError: false,
      };
    }

    return {
      items: [],
      nextCursor: null,
      rateLimited: false,
      retryAfterSeconds: null,
      totalCount: null,
      isLoading: false,
      apiError: true,
    };
  } finally {
    clearTimeout(timeoutId);
    args.signal?.removeEventListener("abort", abortFromNavigation);
  }
}

export const Route = createFileRoute("/mcp/")({
  pendingComponent: McpIndexPending,
  validateSearch: (search): McpSearchState => {
    const q = typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined;
    const featured =
      search.featured === true || search.featured === "true" || search.featured === "1"
        ? true
        : undefined;
    const official =
      search.official === true ||
      search.official === "true" ||
      search.official === "1" ||
      search.verified === true ||
      search.verified === "true" ||
      search.verified === "1"
        ? true
        : undefined;
    return {
      q,
      cursor: typeof search.cursor === "string" && search.cursor ? search.cursor : undefined,
      featured,
      official,
      sort: parseMcpSort(search.sort),
      view: normalizeMcpView(search.view),
    };
  },
  loaderDeps: ({ search }) => {
    const hasQuery = Boolean(search.q);
    return {
      q: search.q,
      cursor: hasQuery ? undefined : search.cursor,
      featured: search.featured,
      official: search.official,
      sort: hasQuery ? undefined : search.sort,
    };
  },
  loader: async ({ deps, abortController }): Promise<McpLoaderData> =>
    await loadMcpPageData({
      ...deps,
      signal: abortController.signal,
    }),
  component: McpIndex,
});

function McpIndexPending() {
  return (
    <CoralPageWrapper pageType="mcp">
      <main className="browse-page browse-page-borderless-header">
        <div className="browse-page-header">
          <h1 className="browse-title">MCP</h1>
        </div>
        <BrowseControls>
          <BrowseControlsRow>
            <BrowseTabs
              ariaLabel="Sort order"
              options={MCP_BROWSE_TABS}
              value="recommended"
              onChange={() => {}}
            />
            <BrowseActions>
              <BrowseSearchTrigger
                open={false}
                onOpen={() => {}}
                label="Search MCP servers"
                disabled
              />
              <BrowseViewToggle view="list" onToggle={() => {}} />
            </BrowseActions>
          </BrowseControlsRow>
        </BrowseControls>
        <div className="browse-layout">
          <div className="browse-results">
            <BrowseResultsSkeleton label="MCP server" />
          </div>
        </div>
      </main>
    </CoralPageWrapper>
  );
}

function McpIndex() {
  const routeSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const initialLoaderData = Route.useLoaderData() as McpLoaderData | undefined;
  const [catalogState, setCatalogState] = useState(() => ({
    loaderData: initialLoaderData,
    data: initialLoaderData ?? createMcpLoadingData(),
  }));
  const catalogData =
    catalogState.loaderData === initialLoaderData
      ? catalogState.data
      : (initialLoaderData ?? catalogState.data);

  const items = catalogData.items;
  const nextCursor = catalogData.nextCursor;
  const rateLimited = catalogData.rateLimited;
  const retryAfterSeconds = catalogData.retryAfterSeconds;
  const isLoading = catalogData.isLoading ?? false;
  const apiError = catalogData.apiError ?? false;
  const view = normalizeMcpView(routeSearch.view) ?? "list";
  const isMobileBrowse = useMediaQuery("(max-width: 760px)");
  const effectiveView = isMobileBrowse ? "list" : view;

  const [query, setQuery] = useState(routeSearch.q ?? "");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadMoreInFlightRef = useRef(false);
  const loadMoreAbortControllerRef = useRef<AbortController | null>(null);
  const searchNavigateTimer = useRef<number>(0);

  useEffect(() => {
    setQuery(routeSearch.q ?? "");
  }, [routeSearch.q]);

  const hasQuery = Boolean(routeSearch.q?.trim());
  const hasActiveFilters =
    hasQuery || Boolean(routeSearch.official) || Boolean(routeSearch.featured);
  const shouldResolveTotalCount =
    !hasActiveFilters && !routeSearch.cursor && catalogData.totalCount == null;
  const totalMcpCount = useQuery(
    api.packages.countPublicPlugins,
    shouldResolveTotalCount ? {} : "skip",
  );
  const totalCount = catalogData.totalCount ?? totalMcpCount ?? null;
  const formattedCount =
    !hasActiveFilters && !routeSearch.cursor ? formatBrowseCount(totalCount) : null;

  useEffect(() => {
    if (initialLoaderData) {
      loadMoreAbortControllerRef.current?.abort();
      loadMoreAbortControllerRef.current = null;
      setIsLoadingMore(false);
      loadMoreInFlightRef.current = false;
      setCatalogState({ loaderData: initialLoaderData, data: initialLoaderData });
    }
    return () => loadMoreAbortControllerRef.current?.abort();
  }, [initialLoaderData]);

  const activeSort: McpSort = routeSearch.sort ?? (hasQuery ? "recommended" : "recommended");
  const activeBrowseTab: McpBrowseTab = routeSearch.official ? "official" : activeSort;
  const visibleItems = useMemo(() => {
    return hasQuery ? sortMcpItems(items, activeSort) : items;
  }, [activeSort, hasQuery, items]);
  const handleBrowseTabChange = (value: string | undefined) => {
    if (value === "official") {
      void navigate({
        search: (prev: McpSearchState) => ({
          ...prev,
          cursor: undefined,
          official: true,
          sort: undefined,
        }),
        replace: true,
      });
      return;
    }

    handleSortChange(value ?? "recommended");
  };

  const handleSortChange = (value: string) => {
    const nextSort = parseMcpSort(value) ?? "recommended";

    void navigate({
      search: (prev: McpSearchState) => ({
        ...prev,
        cursor: undefined,
        official: undefined,
        featured: prev.q ? undefined : prev.featured,
        sort: nextSort === "recommended" ? undefined : nextSort,
      }),
      replace: true,
    });
  };

  useEffect(() => {
    return () => window.clearTimeout(searchNavigateTimer.current);
  }, []);

  const navigateToMcpSearch = useCallback(
    (next: string, replace: boolean) => {
      const trimmed = next.trim();
      void navigate({
        search: (prev: McpSearchState) => ({
          ...prev,
          cursor: undefined,
          q: trimmed ? next : undefined,
          featured: undefined,
          sort: undefined,
        }),
        replace,
      });
    },
    [navigate],
  );

  const handleQueryChange = useCallback(
    (next: string) => {
      setQuery(next);
      window.clearTimeout(searchNavigateTimer.current);
      searchNavigateTimer.current = window.setTimeout(() => {
        navigateToMcpSearch(next, true);
      }, 250);
    },
    [navigateToMcpSearch],
  );

  const handleSearchSubmit = () => {
    window.clearTimeout(searchNavigateTimer.current);
    navigateToMcpSearch(query, false);
  };

  const handleClearSearch = () => {
    window.clearTimeout(searchNavigateTimer.current);
    setQuery("");
    searchInputRef.current?.focus();
    void navigate({
      search: (prev: McpSearchState) => ({
        ...prev,
        q: undefined,
        cursor: undefined,
        sort: undefined,
        featured: undefined,
      }),
      replace: true,
    });
  };
  const browseSearch = useBrowseSearchDisclosure({
    value: query,
    onClear: handleClearSearch,
    inputRef: searchInputRef,
  });

  const handleToggleView = () => {
    void navigate({
      search: (prev: McpSearchState) => ({
        ...prev,
        view: normalizeMcpView(prev.view) === "grid" ? undefined : "grid",
      }),
      replace: true,
    });
  };

  const canLoadMore =
    !hasQuery && !isLoading && !apiError && !rateLimited && Boolean(nextCursor) && !isLoadingMore;

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadMoreInFlightRef.current) return;
    const controller = new AbortController();
    loadMoreAbortControllerRef.current = controller;
    loadMoreInFlightRef.current = true;
    setIsLoadingMore(true);
    try {
      const data = await loadMcpPageData({
        q: routeSearch.q,
        cursor: nextCursor,
        featured: routeSearch.featured,
        official: routeSearch.official,
        sort: routeSearch.sort,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setCatalogState((previous) => {
        if (previous.loaderData !== initialLoaderData) return previous;
        return {
          ...previous,
          data: {
            ...data,
            items: [...previous.data.items, ...data.items],
          },
        };
      });
    } catch (error) {
      if (!controller.signal.aborted) throw error;
    } finally {
      if (loadMoreAbortControllerRef.current === controller) {
        loadMoreAbortControllerRef.current = null;
        setIsLoadingMore(false);
        loadMoreInFlightRef.current = false;
      }
    }
  }, [
    initialLoaderData,
    nextCursor,
    routeSearch.featured,
    routeSearch.official,
    routeSearch.q,
    routeSearch.sort,
  ]);

  useEffect(() => {
    if (!canLoadMore || typeof IntersectionObserver === "undefined") return () => {};
    const target = loadMoreRef.current;
    if (!target) return () => {};
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [canLoadMore, loadMore]);

  return (
    <CoralPageWrapper pageType="mcp">
      <main className="browse-page browse-page-borderless-header">
        <div className="browse-page-header">
          <div className="browse-page-header-main">
            <h1 className="browse-title">
              MCP
              {formattedCount ? (
                <>
                  {" "}
                  <span className="browse-count">{formattedCount}</span>
                </>
              ) : null}
            </h1>
          </div>
        </div>
        <BrowseControls>
          <BrowseControlsRow>
            <BrowseTabs
              ariaLabel="Sort order"
              options={MCP_BROWSE_TABS}
              value={activeBrowseTab}
              onChange={handleBrowseTabChange}
            />
            <BrowseActions>
              <BrowseSearchTrigger
                open={browseSearch.open}
                onOpen={browseSearch.openSearch}
                label="Search MCP servers"
              />
              <BrowseViewToggle view={view} onToggle={handleToggleView} />
            </BrowseActions>
            <BrowseSearchPanel open={browseSearch.open}>
              <BrowseSearchInput
                inputRef={searchInputRef}
                label="MCP search"
                placeholder="Search MCP servers..."
                value={query}
                onChange={handleQueryChange}
                onClear={browseSearch.closeSearch}
                onSubmit={handleSearchSubmit}
                closeLabel="Close search"
              />
            </BrowseSearchPanel>
          </BrowseControlsRow>
        </BrowseControls>
        <div className="browse-layout">
          <div className="browse-results">
            {isLoading ? (
              <BrowseResultsSkeleton label="MCP server" variant={effectiveView} />
            ) : apiError ? (
              <div className="empty-state">
                <PackageSearch size={22} className="empty-state-icon" aria-hidden="true" />
                <p className="empty-state-title">Unable to load MCP servers</p>
                <p className="empty-state-body">
                  The MCP catalog is temporarily unavailable. Please try again later.
                </p>
              </div>
            ) : rateLimited ? (
              <div className="empty-state">
                <PackageSearch size={22} className="empty-state-icon" aria-hidden="true" />
                <p className="empty-state-title">MCP catalog is temporarily unavailable</p>
                <p className="empty-state-body">Try again {formatRetryDelay(retryAfterSeconds)}.</p>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No MCP servers found</p>
                <p className="empty-state-body">Try a different search term or remove filters.</p>
                <Button asChild size="sm" className="mt-4">
                  <Link
                    to="/add"
                    search={{ kind: "plugin", ownerHandle: undefined, method: undefined }}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add an MCP server
                  </Link>
                </Button>
              </div>
            ) : effectiveView === "grid" ? (
              <div className="grid browse-results-grid">
                {visibleItems.map((item) => (
                  <PluginListItem key={item.name} item={item} variant="card" />
                ))}
              </div>
            ) : (
              <div className="browse-list-stack">
                <div className="browse-list-head" aria-hidden="true">
                  <span className="browse-list-head-icon-spacer" />
                  <span className="browse-list-head-label">MCP server</span>
                  <span className="browse-list-head-label browse-list-head-stat">Popularity</span>
                </div>
                <div className="results-list">
                  {visibleItems.map((item) => (
                    <PluginListItem key={item.name} item={item} variant="list" />
                  ))}
                </div>
              </div>
            )}

            {!isLoading && !hasQuery && (nextCursor || isLoadingMore) ? (
              <div ref={loadMoreRef} className="mt-5 flex justify-center">
                <Button variant="primary" type="button" onClick={loadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </CoralPageWrapper>
  );
}
