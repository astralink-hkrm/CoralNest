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

type PersonaSort = "recommended" | "updated" | "downloads" | "trending";
type PersonaBrowseTab = PersonaSort | "official";

const PERSONA_PAGE_SIZE = 25;
const PERSONA_CATALOG_REQUEST_TIMEOUT_MS = 5_000;

type PersonaSearchState = {
  q?: string;
  cursor?: string;
  featured?: boolean;
  official?: boolean;
  sort?: PersonaSort;
  view?: "list" | "grid";
};

function normalizePersonaView(value: unknown): "list" | "grid" | undefined {
  if (value === "list") return "list";
  if (value === "grid") return "grid";
  return undefined;
}

type PersonaLoaderData = {
  items: PackageListItem[];
  nextCursor: string | null;
  rateLimited: boolean;
  retryAfterSeconds: number | null;
  totalCount?: number | null;
  isLoading?: boolean;
  apiError?: boolean;
};

type PersonaPageDataRequest = {
  q?: string;
  cursor?: string;
  featured?: boolean;
  official?: boolean;
  sort?: PersonaSort;
  signal?: AbortSignal;
};

function createPersonaLoadingData(): PersonaLoaderData {
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

function parsePersonaSort(value: unknown): PersonaSort | undefined {
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

function sortPersonaItems(items: PackageListItem[], sort: PersonaSort) {
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

const PERSONA_BROWSE_TABS = [
  { value: "recommended", label: "All" },
  { value: "trending", label: "Trending" },
  {
    value: "official",
    label: "Official",
    icon: <BadgeCheck size={14} strokeWidth={2.25} aria-hidden="true" />,
  },
  { value: "updated", label: "Updated" },
];

export async function loadPersonaPageData(
  args: PersonaPageDataRequest,
): Promise<PersonaLoaderData> {
  const requestController = new AbortController();
  const abortFromNavigation = () => requestController.abort(args.signal?.reason);
  if (args.signal?.aborted) {
    abortFromNavigation();
  } else {
    args.signal?.addEventListener("abort", abortFromNavigation, { once: true });
  }
  const timeoutId = setTimeout(() => {
    requestController.abort(new DOMException("Persona catalog request timed out", "TimeoutError"));
  }, PERSONA_CATALOG_REQUEST_TIMEOUT_MS);

  try {
    const data = await fetchPluginCatalog({
      q: args.q,
      family: "persona",
      officialFirst: !args.q,
      cursor: args.q ? undefined : args.cursor,
      featured: args.featured,
      isOfficial: args.official,
      sort: args.q ? undefined : (args.sort ?? "recommended"),
      limit: PERSONA_PAGE_SIZE,
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

export const Route = createFileRoute("/persona/")({
  pendingComponent: PersonaIndexPending,
  validateSearch: (search): PersonaSearchState => {
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
      sort: parsePersonaSort(search.sort),
      view: normalizePersonaView(search.view),
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
  loader: async ({ deps, abortController }): Promise<PersonaLoaderData> =>
    await loadPersonaPageData({
      ...deps,
      signal: abortController.signal,
    }),
  component: PersonaIndex,
});

function PersonaIndexPending() {
  return (
    <main className="browse-page browse-page-borderless-header">
      <div className="browse-page-header">
        <h1 className="browse-title">Personas</h1>
      </div>
      <BrowseControls>
        <BrowseControlsRow>
          <BrowseTabs
            ariaLabel="Sort order"
            options={PERSONA_BROWSE_TABS}
            value="recommended"
            onChange={() => {}}
          />
          <BrowseActions>
            <BrowseSearchTrigger open={false} onOpen={() => {}} label="Search personas" disabled />
            <BrowseViewToggle view="list" onToggle={() => {}} />
          </BrowseActions>
        </BrowseControlsRow>
      </BrowseControls>
      <div className="browse-layout">
        <div className="browse-results">
          <BrowseResultsSkeleton label="Persona" />
        </div>
      </div>
    </main>
  );
}

function PersonaIndex() {
  const routeSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const initialLoaderData = Route.useLoaderData() as PersonaLoaderData | undefined;
  const [catalogState, setCatalogState] = useState(() => ({
    loaderData: initialLoaderData,
    data: initialLoaderData ?? createPersonaLoadingData(),
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
  const view = normalizePersonaView(routeSearch.view) ?? "list";
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
  const totalPersonaCount = useQuery(
    api.packages.countPublicPlugins,
    shouldResolveTotalCount ? {} : "skip",
  );
  const totalCount = catalogData.totalCount ?? totalPersonaCount ?? null;
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

  const activeSort: PersonaSort = routeSearch.sort ?? "recommended";
  const activeBrowseTab: PersonaBrowseTab = routeSearch.official ? "official" : activeSort;
  const visibleItems = useMemo(() => {
    return hasQuery ? sortPersonaItems(items, activeSort) : items;
  }, [activeSort, hasQuery, items]);
  const handleBrowseTabChange = (value: string | undefined) => {
    if (value === "official") {
      void navigate({
        search: (prev: PersonaSearchState) => ({
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
    const nextSort = parsePersonaSort(value) ?? "recommended";

    void navigate({
      search: (prev: PersonaSearchState) => ({
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

  const navigateToPersonaSearch = useCallback(
    (next: string, replace: boolean) => {
      const trimmed = next.trim();
      void navigate({
        search: (prev: PersonaSearchState) => ({
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
        navigateToPersonaSearch(next, true);
      }, 250);
    },
    [navigateToPersonaSearch],
  );

  const handleSearchSubmit = () => {
    window.clearTimeout(searchNavigateTimer.current);
    navigateToPersonaSearch(query, false);
  };

  const handleClearSearch = () => {
    window.clearTimeout(searchNavigateTimer.current);
    setQuery("");
    searchInputRef.current?.focus();
    void navigate({
      search: (prev: PersonaSearchState) => ({
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
      search: (prev: PersonaSearchState) => ({
        ...prev,
        view: normalizePersonaView(prev.view) === "grid" ? undefined : "grid",
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
      const data = await loadPersonaPageData({
        q: routeSearch.q,
        sort: routeSearch.sort,
        featured: routeSearch.featured,
        official: routeSearch.official,
        cursor: nextCursor,
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
    <CoralPageWrapper pageType="creators">
      <main className="browse-page browse-page-borderless-header">
        <div className="browse-page-header">
          <div className="browse-page-header-main">
            <h1 className="browse-title">
              Personas
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
              options={PERSONA_BROWSE_TABS}
              value={activeBrowseTab}
              onChange={handleBrowseTabChange}
            />
            <BrowseActions>
              <BrowseSearchTrigger
                open={browseSearch.open}
                onOpen={browseSearch.openSearch}
                label="Search personas"
              />
              <BrowseViewToggle view={view} onToggle={handleToggleView} />
            </BrowseActions>
            <BrowseSearchPanel open={browseSearch.open}>
              <BrowseSearchInput
                inputRef={searchInputRef}
                label="persona search"
                placeholder="Search personas..."
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
              <BrowseResultsSkeleton label="Persona" variant={effectiveView} />
            ) : apiError ? (
              <div className="empty-state">
                <PackageSearch size={22} className="empty-state-icon" aria-hidden="true" />
                <p className="empty-state-title">Unable to load personas</p>
                <p className="empty-state-body">
                  The persona catalog is temporarily unavailable. Please try again later.
                </p>
              </div>
            ) : rateLimited ? (
              <div className="empty-state">
                <PackageSearch size={22} className="empty-state-icon" aria-hidden="true" />
                <p className="empty-state-title">Persona catalog is temporarily unavailable</p>
                <p className="empty-state-body">Try again {formatRetryDelay(retryAfterSeconds)}.</p>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No personas found</p>
                <p className="empty-state-body">Try a different search term or remove filters.</p>
                <Button asChild size="sm" className="mt-4">
                  <Link
                    to="/add"
                    search={{ kind: "plugin", ownerHandle: undefined, method: undefined }}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add a persona
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
                  <span className="browse-list-head-label">Persona</span>
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
