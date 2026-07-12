import { createFileRoute, Link } from "@tanstack/react-router";
import { usePaginatedQuery, useQuery } from "convex/react";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { DashboardInventorySection } from "../components/dashboard/DashboardInventorySection";
import { DashboardPublisherSelect } from "../components/dashboard/DashboardPublisherSelect";
import { DashboardToolbar } from "../components/dashboard/DashboardToolbar";
import { DashboardWelcome } from "../components/dashboard/DashboardWelcome";
import type {
  DashboardKindFilter,
  DashboardPublisherEntry,
  DashboardSkill,
  DashboardSortKey,
  DashboardView,
} from "../components/dashboard/types";
import { SignInPrompt } from "../components/SignInPrompt";
import { DashboardSkeleton } from "../components/skeletons/DashboardSkeleton";
import { Button } from "../components/ui/button";
import { TooltipProvider } from "../components/ui/tooltip";
import { addSearchParams } from "../lib/addRoutes";
import {
  dashboardSearchParams,
  parseDashboardSearch,
  type DashboardSearchState,
} from "../lib/dashboardSearch";
import { useAuthStatus } from "../lib/useAuthStatus";

const DASHBOARD_LOAD_TIMEOUT_MS = 20_000;
const DASHBOARD_VIEW_STORAGE_KEY = "clawhub.dashboard.view";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search) => parseDashboardSearch(search),
  component: Dashboard,
});

export function Dashboard() {
  const { isAuthenticated, isLoading: isAuthLoading, me } = useAuthStatus();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const kindFilter: DashboardKindFilter = search.kind ?? "all";
  const query = search.q ?? "";
  const sort: DashboardSortKey = search.sort ?? "updated";
  const view: DashboardView = search.view ?? "list";

  const publishers = useQuery(api.publishers.listMine, me ? {} : "skip") as
    | DashboardPublisherEntry[]
    | undefined;
  const [selectedPublisherId, setSelectedPublisherId] = useState<string>("");
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  const patchSearch = (patch: Partial<DashboardSearchState>) => {
    void navigate({
      to: "/dashboard",
      search: dashboardSearchParams({ ...search, ...patch }),
      resetScroll: false,
    });
  };

  const defaultPublisher =
    publishers?.find((entry) => entry.publisher?.kind === "user") ??
    publishers?.find((entry) => entry.publisher) ??
    null;
  const selectedPublisherFromState = selectedPublisherId
    ? (publishers?.find((entry) => entry.publisher?._id === selectedPublisherId) ?? null)
    : null;
  const selectedPublisher = selectedPublisherFromState ?? defaultPublisher ?? null;
  const activePublisherId = selectedPublisher?.publisher?._id ?? "";

  const skillsQueryArgs =
    publishers === undefined || !activePublisherId
      ? "skip"
      : { ownerPublisherId: activePublisherId as Doc<"publishers">["_id"] };
  const {
    results: paginatedSkills,
    status: skillsStatus,
    loadMore,
  } = usePaginatedQuery(api.skills.listDashboardPaginated, skillsQueryArgs, {
    initialNumItems: 50,
  });
  const mySkills = paginatedSkills as DashboardSkill[] | undefined;

  const skills = mySkills ?? [];
  const ownerHandle =
    selectedPublisher?.publisher?.handle ??
    me?.handle ??
    me?.name ??
    me?.displayName ??
    me?._id ??
    "publisher";

  const skillsQuerySkipped = skillsQueryArgs === "skip";
  const isLoading = !skillsQuerySkipped && skillsStatus === "LoadingFirstPage";
  const resolvedPublishers = publishers ?? [];
  const isDashboardEmpty = !isLoading && skills.length === 0;
  const hasQuery = query.trim().length > 0;
  const showLoadMore =
    kindFilter !== "attention" && skills.length > 0 && skillsStatus === "CanLoadMore";

  useEffect(() => {
    if (!search.view) {
      const savedView = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);
      if (savedView === "list" || savedView === "grid") patchSearch({ view: savedView });
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setLoadTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setLoadTimedOut(true), DASHBOARD_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!skillsQuerySkipped && skills.length === 0 && skillsStatus === "CanLoadMore") {
      loadMore(50);
    }
  }, [loadMore, skills.length, skillsQuerySkipped, skillsStatus]);

  if (isAuthLoading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated || !me) {
    return <SignInPrompt title="Sign in to access your dashboard." />;
  }

  const publisherSelector =
    resolvedPublishers.length > 1 ? (
      <div className="dashboard-welcome-publisher-control">
        <span className="dashboard-welcome-publisher-label">Viewing as</span>
        <DashboardPublisherSelect
          publishers={resolvedPublishers}
          value={activePublisherId}
          onValueChange={setSelectedPublisherId}
          triggerClassName="dashboard-welcome-publisher-trigger"
          triggerIcon={<ChevronsUpDown className="h-4 w-4 opacity-50" />}
        />
      </div>
    ) : null;

  if (isLoading && !loadTimedOut) {
    return <DashboardSkeleton />;
  }

  if (loadTimedOut && isLoading) {
    return (
      <main className="browse-page browse-page-borderless-header dashboard-route">
        <DashboardLoadError onRetry={() => window.location.reload()} />
      </main>
    );
  }

  if (isDashboardEmpty) {
    return <DashboardWelcome ownerHandle={ownerHandle} publisherSelector={publisherSelector} />;
  }

  return (
    <TooltipProvider>
      <main className="browse-page browse-page-borderless-header dashboard-route dashboard-final">
        <DashboardHeader
          publishers={resolvedPublishers}
          activePublisherId={activePublisherId}
          onPublisherChange={setSelectedPublisherId}
          ownerHandle={ownerHandle}
        />

        <div className="dashboard-workspace">
          <div className="dashboard-workspace-main">
            <DashboardInventorySection
              count={skills.length}
              toolbar={
                <DashboardToolbar
                  kind={kindFilter}
                  query={query}
                  sort={sort}
                  view={view}
                  onKindChange={(kind) => patchSearch({ kind })}
                  onQueryChange={(q) => patchSearch({ q: q.trim() ? q : undefined })}
                  onSortChange={(nextSort) => patchSearch({ sort: nextSort })}
                  onViewChange={(nextView) => {
                    window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, nextView);
                    patchSearch({ view: nextView });
                  }}
                />
              }
            >
              {skills.length > 0 ? (
                <>
                  {showLoadMore ? (
                    <div className="dashboard-footer-row">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadMore(50)}
                      >
                        Load more
                      </Button>
                    </div>
                  ) : null}
                  {skillsStatus === "LoadingMore" ? (
                    <div className="dashboard-footer-row flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Loading more&hellip;</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <CatalogEmpty
                  hasQuery={hasQuery}
                  query={query}
                  ownerHandle={ownerHandle}
                />
              )}
            </DashboardInventorySection>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}

function DashboardLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">Couldn't load your dashboard</p>
      <p className="empty-state-body">Check your connection and try again.</p>
      <Button type="button" size="sm" className="mt-4" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function CatalogEmpty({
  hasQuery,
  query,
  ownerHandle,
}: {
  hasQuery: boolean;
  query: string;
  ownerHandle: string;
}) {
  if (hasQuery) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">No matches for &ldquo;{query.trim()}&rdquo;</p>
        <p className="empty-state-body">Try a different name, or clear the search.</p>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <p className="empty-state-title">No skills yet</p>
      <p className="empty-state-body">Publish your first skill to share it with the community.</p>
      <Button asChild size="sm" className="mt-4">
        <Link
          to="/add"
          search={addSearchParams({
            kind: "skill",
            ownerHandle,
          })}
        >
          Add skill
        </Link>
      </Button>
    </div>
  );
}
