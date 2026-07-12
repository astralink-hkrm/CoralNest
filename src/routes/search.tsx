import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { PublisherListItem } from "../components/PublisherListItem";
import { BrowseResultsSkeleton } from "../components/skeletons/BrowseResultsSkeleton";
import { SkillListItem } from "../components/SkillListItem";
import { Card } from "../components/ui/card";
import { convexHttp } from "../convex/client";
import type { PublicSkill } from "../lib/publicUser";
import {
  useUnifiedSearch,
  type UnifiedSearchInitialData,
  type UnifiedSearchType,
  type UnifiedCreatorResult,
  type UnifiedSkillResult,
} from "../lib/useUnifiedSearch";

const SEARCH_PAGE_SIZE = 10;

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, string | undefined>) => ({
    q: search.q ?? "",
    type: (search.type as UnifiedSearchType) ?? "all",
  }),
  loaderDeps: async ({ search: { q } }) => ({ q }),
  loader: async ({ deps: { q } }) => {
    if (!q) return null;
    const trimmed = q.trim();
    if (!trimmed) return null;
    try {
      const { results: rawSkills } = await convexHttp.query(api.search.search, {
        query: trimmed,
        limit: SEARCH_PAGE_SIZE,
      });
      const skillMatches = rawSkills.map((entry) => ({
        type: "skill" as const,
        skill: entry.skill,
        ownerHandle: entry.ownerHandle,
        owner: entry.owner ?? null,
        score: entry.score,
      }));
      return {
        query: trimmed,
        activeType: "all" as const,
        limits: {
          skills: SEARCH_PAGE_SIZE,
          plugins: SEARCH_PAGE_SIZE,
          creators: SEARCH_PAGE_SIZE,
        },
        skillResults: skillMatches.slice(0, SEARCH_PAGE_SIZE),
        pluginResults: [],
        creatorResults: [],
        skillHasMore: skillMatches.length > SEARCH_PAGE_SIZE,
        pluginHasMore: false,
        creatorHasMore: false,
      };
    } catch (error) {
      console.error("Failed to load initial search results:", error);
      return null;
    }
  },
  component: UnifiedSearchPage,
});

function UnifiedSearchPage() {
  const search = Route.useSearch();
  const initialSearch = Route.useLoaderData() as UnifiedSearchInitialData | null | undefined;
  const navigate = useNavigate();
  const activeType = search.type ?? "all";
  const [query, setQuery] = useState(search.q ?? "");
  const [resultLimit, setResultLimit] = useState(SEARCH_PAGE_SIZE);

  useEffect(() => {
    setQuery(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    setResultLimit(SEARCH_PAGE_SIZE);
  }, [search.q, activeType]);

  const {
    results: allResults,
    skillResults,
    creatorResults,
    skillCount,
    creatorCount,
    skillHasMore,
    creatorHasMore,
    isSearching,
  } = useUnifiedSearch(search.q ?? "", "all", {
    ...(initialSearch ? { initialData: initialSearch } : null),
    limits: {
      skills: resultLimit,
      plugins: resultLimit,
      creators: resultLimit,
    },
  });
  const results: Array<UnifiedSkillResult | UnifiedCreatorResult> =
    activeType === "all"
      ? allResults
      : activeType === "skills"
        ? skillResults
        : creatorResults;
  const allCount = skillCount + creatorCount;
  const allHasMore = skillHasMore || creatorHasMore;
  const canLoadMore =
    search.q &&
    !isSearching &&
    ((activeType === "all" && allHasMore) ||
      (activeType === "skills" && skillHasMore) ||
      (activeType === "creators" && creatorHasMore));
  const hasOtherTypeMatches = activeType !== "all" && allCount > 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({
      to: "/search",
      search: {
        q: query.trim() || undefined,
        type: search.type,
      },
    });
  };

  const setType = (type: UnifiedSearchType) => {
    void navigate({
      to: "/search",
      search: {
        q: search.q,
        type: type === "all" ? undefined : type,
      },
      replace: true,
    });
  };

  const clearSearch = () => {
    setQuery("");
    void navigate({
      to: "/search",
      search: { q: undefined, type: search.type },
      replace: true,
    });
  };

  return (
    <main className="browse-page">
      <h1 className="browse-title mb-4">
        {search.q ? (
          <>
            Search results for <span className="text-[color:var(--accent)]">"{search.q}"</span>
          </>
        ) : (
          "Search"
        )}
      </h1>

      <form className="search-page-form" onSubmit={handleSearch}>
        <div className="browse-search-bar search-page-field max-w-[560px] flex-1">
          <Search size={16} className="navbar-search-icon" aria-hidden="true" />
          <input
            className="browse-search-input"
            type="text"
            placeholder="Search skills and creators..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query ? (
            <button
              className="search-clear-button"
              type="button"
              aria-label="Clear search"
              onClick={clearSearch}
            >
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </form>

      <div className="search-tabs">
        <button
          className={`search-tab${activeType === "all" ? " is-active" : ""}`}
          type="button"
          onClick={() => setType("all")}
        >
          All
        </button>
        <button
          className={`search-tab${activeType === "skills" ? " is-active" : ""}`}
          type="button"
          onClick={() => setType("skills")}
        >
          Skills
        </button>
        <button
          className={`search-tab${activeType === "creators" ? " is-active" : ""}`}
          type="button"
          onClick={() => setType("creators")}
        >
          Creators
        </button>
      </div>

      {isSearching ? (
        <BrowseResultsSkeleton count={activeType === "all" ? 8 : 6} />
      ) : !search.q ? (
        <Card className="text-center p-10">
          <p className="text-ink-soft">Enter a search term to find skills and creators</p>
        </Card>
      ) : results.length === 0 ? (
        <SearchEmptyState
          activeType={activeType}
          hasOtherTypeMatches={hasOtherTypeMatches}
          onSearchAllTypes={() => setType("all")}
          query={search.q}
        />
      ) : (
        <>
          {activeType === "all" ? (
            <div className="search-results-sections">
              {skillResults.length > 0 ? (
                <SearchResultSection title="Skills">
                  {skillResults.map((item) => (
                    <SkillResultRow key={`skill-${item.skill._id}`} result={item} />
                  ))}
                </SearchResultSection>
              ) : null}
              {creatorResults.length > 0 ? (
                <SearchResultSection title="Creators" bare>
                  <CreatorResultsList results={creatorResults} />
                </SearchResultSection>
              ) : null}
            </div>
          ) : activeType === "creators" ? (
            <CreatorResultsList results={creatorResults} />
          ) : (
            <div className="results-list">
              {results.map((item) =>
                item.type === "skill" ? (
                  <SkillResultRow key={`skill-${item.skill._id}`} result={item} />
                ) : null,
              )}
            </div>
          )}
          {canLoadMore ? (
            <div className="search-load-more">
              <button
                type="button"
                className="search-load-more-button"
                onClick={() => setResultLimit((limit) => limit + SEARCH_PAGE_SIZE)}
              >
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}

function SearchEmptyState({
  activeType,
  hasOtherTypeMatches,
  onSearchAllTypes,
  query,
}: {
  activeType: UnifiedSearchType;
  hasOtherTypeMatches: boolean;
  onSearchAllTypes: () => void;
  query: string;
}) {
  const browseHref = activeType === "creators" ? "/creators" : "/skills";
  const browseLabel =
    activeType === "creators" ? "Show all creators" : "Show all skills";

  return (
    <Card className="search-empty-state">
      <p className="search-empty-title">No matches for "{query}"</p>
      <div className="search-empty-actions">
        {hasOtherTypeMatches ? (
          <button type="button" className="search-empty-action" onClick={onSearchAllTypes}>
            Search all types
          </button>
        ) : null}
        <a className="search-empty-action" href={browseHref}>
          {browseLabel}
        </a>
        <a
          className="search-empty-action"
          href="/add?kind=skill"
        >
          <Plus size={14} aria-hidden="true" />
          Add a skill
        </a>
      </div>
    </Card>
  );
}

function SearchResultSection({
  bare = false,
  children,
  title,
}: {
  bare?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="search-results-section" aria-label={title}>
      <div className="search-results-section-header">
        <h2 className="search-results-section-title">{title}</h2>
      </div>
      {bare ? children : <div className="results-list">{children}</div>}
    </section>
  );
}

function CreatorResultsList({ results }: { results: UnifiedCreatorResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="browse-list-stack">
      <div className="publisher-directory-list">
        {results.map((item) => (
          <PublisherListItem
            key={`creator-${item.creator._id}`}
            publisher={item.creator}
            variant="list"
          />
        ))}
      </div>
    </div>
  );
}

function SkillResultRow({ result }: { result: UnifiedSkillResult }) {
  const skill = result.skill as unknown as PublicSkill;
  return <SkillListItem skill={skill} ownerHandle={result.ownerHandle} owner={result.owner} />;
}
