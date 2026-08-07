import { createFileRoute } from "@tanstack/react-router";
import type { FlowCatalogItem } from "clawhub-schema/flows";
import { useQuery } from "convex/react";
import { Network, PackageSearch, Repeat2, Workflow } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
  BrowseActions,
  BrowseCategorySelect,
  BrowseCategorySidebar,
  BrowseControls,
  BrowseControlsDivider,
  BrowseControlsRow,
  BrowseSearchInput,
  BrowseSearchPanel,
  BrowseSearchTrigger,
  BrowseTabs,
  BrowseTopicChips,
  BrowseViewToggle,
  useBrowseSearchDisclosure,
} from "../../components/BrowseControls";
import { CoralPageWrapper } from "../../components/CoralPageWrapper";
import { FlowListItem } from "../../components/FlowListItem";
import { BrowseResultsSkeleton } from "../../components/skeletons/BrowseResultsSkeleton";
import { convexHttp } from "../../convex/client";
import { formatBrowseCount } from "../../lib/browseCount";
import {
  parseBrowseTopicFromSearchInput,
  sanitizeBrowseTopicSearch,
} from "../../lib/browseTopicSearch";
import { resolveSkillBrowseCategorySlug, SKILL_CATEGORIES } from "../../lib/categories";
import { fetchFlowsCatalog, type FlowsKindFilter } from "../../lib/flowsApi";
import { useBrowseTopicSearch } from "../../lib/useBrowseTopicSearch";
import { parseSort, type SortDir, type SortKey } from "../skills/-params";
import { SkillsResults } from "../skills/-SkillsResults";
import type { SkillSearchEntry } from "../skills/-types";
import {
  buildSkillsSearchKey,
  type InitialSkillsSearchData,
  normalizeSkillsCatalogTab,
  normalizeSkillsView,
  type SkillsCatalogTab,
  type SkillsSearchState,
  type SkillsView,
  useSkillsBrowseModel,
} from "../skills/-useSkillsBrowseModel";

const FLOWS_PAGE_SIZE = 100;
const SKILLS_INITIAL_SEARCH_LIMIT = 25;

export type FlowHubTab = "skills" | "loops" | "graphs" | "all";

const FLOW_HUB_TABS = [
  { value: "skills", label: "Skills", mobileLabel: "Skills" },
  { value: "loops", label: "Loops", mobileLabel: "Loops" },
  { value: "graphs", label: "Graphs", mobileLabel: "Graphs" },
  { value: "all", label: "All Flows", mobileLabel: "All" },
] as const;

const SKILLS_VIEW_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "featured", label: "Featured" },
  { value: "official", label: "Official" },
  { value: "new", label: "New" },
];

export type UnifiedFlowsSearchState = {
  tab?: FlowHubTab;
  kind?: FlowsKindFilter;
  q?: string;
  sort?: SortKey;
  dir?: SortDir;
  highlighted?: boolean;
  featured?: boolean;
  category?: string;
  topic?: string;
  view?: SkillsView | "cards";
  focus?: "search";
  subTab?: SkillsCatalogTab;
};

function normalizeFlowHubTab(value: unknown): FlowHubTab {
  if (value === "loops") return "loops";
  if (value === "graphs") return "graphs";
  if (value === "all") return "all";
  if (value === "skills") return "skills";
  if (value === "trending" || value === "featured" || value === "official" || value === "new") {
    return "skills";
  }
  return "skills";
}

function parseSkillCategorySlug(value: unknown) {
  return typeof value === "string" ? resolveSkillBrowseCategorySlug(value) : undefined;
}

type FlowsLoaderData = {
  flowItems: FlowCatalogItem[];
  totalFlowCount: number;
  isLoadingFlows: boolean;
  flowsApiError: boolean;
  initialSkillsSearch: InitialSkillsSearchData;
};

function flowItemKey(item: FlowCatalogItem) {
  return item.kind === "skill" ? `skill:${item.name}` : item.id;
}

async function loadInitialSkillsSearch(
  search: UnifiedFlowsSearchState,
): Promise<InitialSkillsSearchData> {
  const query = search.q?.trim();
  if (!query) return null;

  const featuredOnly = search.featured ?? search.highlighted ?? false;
  const key = buildSkillsSearchKey({
    query,
    featuredOnly,
    categorySlug: search.category,
    topic: search.topic,
  });
  try {
    const results = (await convexHttp.action(api.search.searchSkills, {
      query,
      highlightedOnly: featuredOnly,
      categorySlug: search.category,
      topic: search.topic,
      limit: SKILLS_INITIAL_SEARCH_LIMIT,
    })) as SkillSearchEntry[];
    return { key, limit: SKILLS_INITIAL_SEARCH_LIMIT, results };
  } catch (error) {
    console.error("Failed to load initial skills search:", error);
    return null;
  }
}

export const Route = createFileRoute("/flows/")({
  validateSearch: (search: Record<string, unknown>): UnifiedFlowsSearchState => {
    const rawTab = search.tab ?? search.kind;
    const tab = normalizeFlowHubTab(rawTab);
    const category = parseSkillCategorySlug(search.category);
    const topic = parseBrowseTopicFromSearchInput(search);
    const sort = typeof search.sort === "string" ? parseSort(search.sort) : undefined;
    const featured =
      search.featured === "1" || search.featured === "true" || search.featured === true
        ? true
        : undefined;
    const highlighted =
      search.highlighted === "1" || search.highlighted === "true" || search.highlighted === true
        ? true
        : undefined;
    const q = typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined;
    const view = normalizeSkillsView(search.view);
    const subTab = normalizeSkillsCatalogTab(search.subTab ?? search.tab, {
      category,
      featured,
      highlighted,
      sort,
      topic,
    });

    return {
      tab,
      kind: tab === "all" ? undefined : (tab as FlowsKindFilter),
      q,
      sort,
      dir: search.dir === "asc" || search.dir === "desc" ? search.dir : undefined,
      highlighted,
      featured,
      category,
      topic,
      view,
      focus: search.focus === "search" ? "search" : undefined,
      subTab,
    };
  },
  loaderDeps: ({ search }) => ({
    tab: search.tab,
    q: search.q,
    featured: search.featured,
    highlighted: search.highlighted,
    category: search.category,
    topic: search.topic,
  }),
  loader: async ({ deps, abortController }): Promise<FlowsLoaderData> => {
    const isSkillsTab = deps.tab === "skills" || !deps.tab;
    const initialSkillsPromise = isSkillsTab
      ? loadInitialSkillsSearch(deps)
      : Promise.resolve(null);

    const kindFilter: FlowsKindFilter | undefined =
      deps.tab === "loops" ? "loops" : deps.tab === "graphs" ? "graphs" : "all";

    const flowsPromise = !isSkillsTab
      ? fetchFlowsCatalog({
          kind: kindFilter,
          q: deps.q,
          limit: FLOWS_PAGE_SIZE,
          signal: abortController.signal,
        })
          .then((data) => ({
            flowItems: data.items,
            totalFlowCount: data.totalCount,
            isLoadingFlows: false,
            flowsApiError: false,
          }))
          .catch((error) => {
            if (abortController.signal.aborted) throw error;
            return {
              flowItems: [],
              totalFlowCount: 0,
              isLoadingFlows: false,
              flowsApiError: true,
            };
          })
      : Promise.resolve({
          flowItems: [],
          totalFlowCount: 0,
          isLoadingFlows: false,
          flowsApiError: false,
        });

    const [initialSkillsSearch, flowsResult] = await Promise.all([
      initialSkillsPromise,
      flowsPromise,
    ]);

    return {
      ...flowsResult,
      initialSkillsSearch,
    };
  },
  pendingComponent: FlowsIndexPending,
  component: FlowsIndex,
});

function FlowsIndexPending() {
  return (
    <CoralPageWrapper pageType="flows">
      <main className="browse-page browse-page-borderless-header">
        <div className="browse-page-header">
          <div className="browse-page-header-main">
            <h1 className="browse-title">Flows</h1>
            <p className="browse-subtitle">
              Prompt-based agent recipes: skills, loops, and graph architectures.
            </p>
          </div>
        </div>
        <BrowseControls>
          <BrowseControlsRow>
            <BrowseTabs
              ariaLabel="Flow tab"
              options={FLOW_HUB_TABS}
              value="skills"
              onChange={() => {}}
            />
            <BrowseActions>
              <BrowseSearchTrigger open={false} onOpen={() => {}} label="Search flows" disabled />
            </BrowseActions>
          </BrowseControlsRow>
        </BrowseControls>
        <div className="browse-layout">
          <div className="browse-results">
            <BrowseResultsSkeleton label="Flow" />
          </div>
        </div>
      </main>
    </CoralPageWrapper>
  );
}

export function FlowsIndex() {
  const routeSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const loaderData = Route.useLoaderData() as FlowsLoaderData | undefined;

  const currentTab: FlowHubTab = routeSearch.tab ?? "skills";
  const isSkillsTab = currentTab === "skills";

  // Skill browse model setup
  const { search, activeTopic } = useBrowseTopicSearch(
    routeSearch as Record<string, unknown>,
    navigate,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  const skillsNavigate = useCallback(
    ({
      search: searchFn,
      replace,
    }: {
      search: (prev: SkillsSearchState) => SkillsSearchState;
      replace?: boolean;
    }) => {
      void navigate({
        search: (prev: UnifiedFlowsSearchState) => {
          const next = searchFn(prev as SkillsSearchState);
          return {
            ...prev,
            ...next,
            view: normalizeSkillsView(next.view) ?? next.view,
            tab: "skills",
          };
        },
        replace,
      });
    },
    [navigate],
  );

  const skillsModel = useSkillsBrowseModel({
    initialSearch: loaderData?.initialSkillsSearch ?? null,
    navigate: skillsNavigate,
    search: {
      ...search,
      tab: routeSearch.subTab ?? "trending",
    } as SkillsSearchState,
    searchInputRef,
  });

  // Non-skills search & state
  const [flowsQuery, setFlowsQuery] = useState(routeSearch.q ?? "");
  const searchNavigateTimer = useRef<number>(0);

  useEffect(() => {
    setFlowsQuery(routeSearch.q ?? "");
  }, [routeSearch.q]);

  useEffect(() => {
    return () => window.clearTimeout(searchNavigateTimer.current);
  }, []);

  const totalSkillsCount = useQuery(api.skills.countPublicSkills, {});
  const categoryTopics = useQuery(
    api.catalogTopics.listTopByCategory,
    skillsModel.activeCategory
      ? {
          kind: "skill",
          category: skillsModel.activeCategory,
        }
      : "skip",
  );

  const browseSearch = useBrowseSearchDisclosure({
    value: isSkillsTab ? skillsModel.query : flowsQuery,
    onClear: () => {
      if (isSkillsTab) {
        skillsModel.onClearQuery();
      } else {
        window.clearTimeout(searchNavigateTimer.current);
        setFlowsQuery("");
        searchInputRef.current?.focus();
        void navigate({
          search: (prev: UnifiedFlowsSearchState) => ({ ...prev, q: undefined }),
          replace: true,
        });
      }
    },
    inputRef: searchInputRef,
  });

  const activeSkillsView = skillsModel.catalogTab;
  const viewOptions = skillsModel.canonicalTrendingUnavailable
    ? SKILLS_VIEW_OPTIONS.filter((option) => option.value !== "trending")
    : SKILLS_VIEW_OPTIONS;

  const hasActiveSkillFilters =
    skillsModel.catalogTab !== "trending" ||
    skillsModel.hasQuery ||
    Boolean(skillsModel.activeCategory) ||
    Boolean(activeTopic);

  const formattedSkillCount = !hasActiveSkillFilters ? formatBrowseCount(totalSkillsCount) : null;
  const formattedFlowCount =
    !isSkillsTab && !routeSearch.q ? formatBrowseCount(loaderData?.totalFlowCount ?? 0) : null;

  const currentCount = isSkillsTab ? formattedSkillCount : formattedFlowCount;

  // Tab switching handler
  const handleFlowTabChange = useCallback(
    (value: string | undefined) => {
      const nextTab = normalizeFlowHubTab(value);
      void navigate({
        search: (prev: UnifiedFlowsSearchState) => ({
          ...prev,
          tab: nextTab,
          kind: nextTab === "all" ? undefined : (nextTab as FlowsKindFilter),
          q: undefined,
          category: undefined,
          topic: undefined,
          sort: undefined,
          dir: undefined,
          featured: undefined,
          highlighted: undefined,
        }),
        replace: true,
      });
    },
    [navigate],
  );

  const handleSkillsViewChange = useCallback(
    (value: string) => {
      void navigate({
        search: (prev: UnifiedFlowsSearchState) => {
          if (value === "trending") {
            return {
              ...prev,
              q: undefined,
              subTab: "trending",
              sort: undefined,
              dir: undefined,
              category: undefined,
              topic: undefined,
              featured: undefined,
              highlighted: undefined,
            };
          }
          return {
            ...prev,
            q: undefined,
            subTab: value as SkillsCatalogTab,
            sort: undefined,
            dir: undefined,
            featured: undefined,
            highlighted: undefined,
          };
        },
        replace: true,
      });
    },
    [navigate],
  );

  const handleCategoryChange = useCallback(
    (slug: string | undefined) => {
      const category = parseSkillCategorySlug(slug);
      void navigate({
        search: (prev: UnifiedFlowsSearchState) => ({
          ...prev,
          category,
          topic: undefined,
          featured: undefined,
          highlighted: undefined,
        }),
        replace: true,
      });
    },
    [navigate],
  );

  const handleTopicChange = useCallback(
    (topic: string | undefined) => {
      void navigate({
        search: (prev: UnifiedFlowsSearchState) =>
          sanitizeBrowseTopicSearch(
            {
              ...prev,
              featured: undefined,
              highlighted: undefined,
            },
            topic ?? null,
          ),
        replace: true,
      });
    },
    [navigate],
  );

  const handleFlowsQueryChange = useCallback(
    (next: string) => {
      setFlowsQuery(next);
      window.clearTimeout(searchNavigateTimer.current);
      searchNavigateTimer.current = window.setTimeout(() => {
        const trimmed = next.trim();
        void navigate({
          search: (prev: UnifiedFlowsSearchState) => ({
            ...prev,
            q: trimmed ? next : undefined,
          }),
          replace: true,
        });
      }, 250);
    },
    [navigate],
  );

  const handleFlowsSearchSubmit = () => {
    window.clearTimeout(searchNavigateTimer.current);
    const trimmed = flowsQuery.trim();
    void navigate({
      search: (prev: UnifiedFlowsSearchState) => ({
        ...prev,
        q: trimmed ? flowsQuery : undefined,
      }),
      replace: false,
    });
  };

  const flowItems = loaderData?.flowItems ?? [];
  const isLoadingFlows = loaderData?.isLoadingFlows ?? false;
  const flowsApiError = loaderData?.flowsApiError ?? false;
  const nonSkillsView: "grid" | "list" = normalizeSkillsView(routeSearch.view) ?? "list";

  return (
    <CoralPageWrapper pageType="flows">
      <main className="browse-page browse-page-borderless-header skills-browse-page">
        {/* Header */}
        <div className="browse-page-header">
          <div className="browse-page-header-main">
            <h1 className="browse-title">
              Flows
              {currentCount ? (
                <>
                  {" "}
                  <span className="browse-count">{currentCount}</span>
                </>
              ) : null}
            </h1>
            <p className="browse-subtitle">
              {currentTab === "skills"
                ? "Prompt-based skill recipes and tools with rich community catalog and discovery."
                : currentTab === "loops"
                  ? "Open-source agentic loops: iterative workflows, feedback loops, and self-correcting pipelines."
                  : currentTab === "graphs"
                    ? "State graph architectures: multi-agent graph flows, branching logic, and stateful orchestration."
                    : "Complete catalog of prompt-based agent recipes: live skills, open-source loops, and graph architectures."}
            </p>
          </div>
        </div>

        {/* Primary Flow Hub Tabs (Skills | Loops | Graphs | All) */}
        <BrowseControls>
          <BrowseControlsRow>
            <BrowseTabs
              ariaLabel="Flow tab"
              options={FLOW_HUB_TABS}
              value={currentTab}
              onChange={handleFlowTabChange}
            />
            <BrowseControlsDivider />

            {/* Skills Sub-Tabs or Flow Actions */}
            {isSkillsTab ? (
              <>
                <BrowseTabs
                  ariaLabel="Skill view"
                  options={viewOptions}
                  value={activeSkillsView}
                  onChange={(value) => {
                    if (value) handleSkillsViewChange(value);
                  }}
                />
                <BrowseControlsDivider />
              </>
            ) : null}

            <BrowseActions>
              <BrowseSearchTrigger
                open={browseSearch.open}
                onOpen={browseSearch.openSearch}
                label={isSkillsTab ? "Search skills" : "Search flows"}
              />
              {isSkillsTab ? (
                <BrowseCategorySelect
                  categories={SKILL_CATEGORIES}
                  value={skillsModel.activeCategory}
                  onChange={handleCategoryChange}
                  responsive
                />
              ) : null}
              <BrowseViewToggle
                view={isSkillsTab ? skillsModel.view : nonSkillsView}
                onToggle={
                  isSkillsTab
                    ? skillsModel.onToggleView
                    : () => {
                        void navigate({
                          search: (prev: UnifiedFlowsSearchState) => ({
                            ...prev,
                            view: nonSkillsView === "grid" ? "list" : "grid",
                          }),
                          replace: true,
                        });
                      }
                }
              />
            </BrowseActions>

            {/* Search input panel */}
            <BrowseSearchPanel open={browseSearch.open}>
              <BrowseSearchInput
                inputRef={searchInputRef}
                label={isSkillsTab ? "skill search" : "Flow search"}
                placeholder={isSkillsTab ? "Search skills..." : "Search flows..."}
                value={isSkillsTab ? skillsModel.query : flowsQuery}
                onChange={isSkillsTab ? skillsModel.onQueryChange : handleFlowsQueryChange}
                onClear={browseSearch.closeSearch}
                onSubmit={isSkillsTab ? undefined : handleFlowsSearchSubmit}
                closeLabel="Close search"
              />
            </BrowseSearchPanel>
          </BrowseControlsRow>

          {/* Skill topic chips when in skills tab */}
          {isSkillsTab ? (
            <BrowseTopicChips
              topics={categoryTopics ?? []}
              activeTopic={activeTopic}
              onChange={handleTopicChange}
              loading={Boolean(skillsModel.activeCategory && categoryTopics === undefined)}
            />
          ) : null}
        </BrowseControls>

        {/* Content Layout */}
        {isSkillsTab ? (
          <div className="browse-layout browse-layout-with-sidebar">
            <BrowseCategorySidebar
              ariaLabel="Skill categories"
              categories={SKILL_CATEGORIES}
              value={skillsModel.activeCategory}
              onChange={handleCategoryChange}
            />
            <div className="browse-results">
              <SkillsResults
                isLoadingSkills={skillsModel.isLoadingSkills}
                sorted={skillsModel.sorted}
                view={skillsModel.view}
                listDoneLoading={
                  !skillsModel.isLoadingSkills &&
                  !skillsModel.canLoadMore &&
                  !skillsModel.isLoadingMore
                }
                hasQuery={skillsModel.hasQuery}
                canLoadMore={skillsModel.canLoadMore}
                isLoadingMore={skillsModel.isLoadingMore}
                canAutoLoad={skillsModel.canAutoLoad}
                loadMoreRef={skillsModel.loadMoreRef}
                loadMore={skillsModel.loadMore}
                catalogTab={skillsModel.catalogTab}
                trendingState={skillsModel.trendingState}
              />
            </div>
          </div>
        ) : (
          <div className="browse-layout">
            <div className="browse-results">
              {isLoadingFlows ? (
                <BrowseResultsSkeleton label="Flow" variant={nonSkillsView} />
              ) : flowsApiError ? (
                <div className="empty-state">
                  <Workflow size={22} className="empty-state-icon" aria-hidden="true" />
                  <p className="empty-state-title">Unable to load flows</p>
                  <p className="empty-state-body">
                    The flows catalog is temporarily unavailable. Please try again later.
                  </p>
                </div>
              ) : flowItems.length === 0 ? (
                <div className="empty-state">
                  {currentTab === "loops" ? (
                    <Repeat2 size={24} className="empty-state-icon" aria-hidden="true" />
                  ) : currentTab === "graphs" ? (
                    <Network size={24} className="empty-state-icon" aria-hidden="true" />
                  ) : (
                    <PackageSearch size={24} className="empty-state-icon" aria-hidden="true" />
                  )}
                  <p className="empty-state-title">
                    {currentTab === "loops"
                      ? "No loops found"
                      : currentTab === "graphs"
                        ? "No graphs found"
                        : "No flows found"}
                  </p>
                  <p className="empty-state-body">
                    {routeSearch.q
                      ? "Try a different search term or filter."
                      : currentTab === "loops"
                        ? "Open-source agentic loops will appear here as they are indexed from upstream repositories."
                        : currentTab === "graphs"
                          ? "Multi-agent graph architectures will appear here as they are indexed from upstream repositories."
                          : "Explore skills or check back soon as more flow recipes are indexed."}
                  </p>
                </div>
              ) : nonSkillsView === "grid" ? (
                <div className="grid browse-results-grid">
                  {flowItems.map((item) => (
                    <FlowListItem key={flowItemKey(item)} item={item} variant="card" />
                  ))}
                </div>
              ) : (
                <div className="browse-list-stack">
                  <div className="browse-list-head" aria-hidden="true">
                    <span className="browse-list-head-icon-spacer" />
                    <span className="browse-list-head-label">Flow</span>
                    <span className="browse-list-head-label browse-list-head-stat">Kind</span>
                  </div>
                  <div className="results-list">
                    {flowItems.map((item) => (
                      <FlowListItem key={flowItemKey(item)} item={item} variant="list" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </CoralPageWrapper>
  );
}
