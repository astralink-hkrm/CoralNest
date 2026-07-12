import { useAction } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { convexHttp } from "../convex/client";
import type { PublicPublisher, PublicPublisherListItem } from "./publicUser";

export type UnifiedSearchType = "all" | "skills" | "creators";
const MAX_UNIFIED_SEARCH_LIMIT = 100;
const MAX_CREATOR_SEARCH_LIMIT = 50;

export type UnifiedSkillResult = {
  type: "skill";
  skill: {
    _id: string;
    slug: string;
    displayName: string;
    summary?: string | null;
    categories?: string[] | null;
    inferredCategories?: string[] | null;
    latestVersionId?: string | null;
    inferredFromVersionId?: string | null;
    ownerUserId: string;
    ownerPublisherId?: string | null;
    stats: { downloads: number; stars: number; versions?: number };
    updatedAt: number;
    createdAt: number;
  };
  ownerHandle: string | null;
  owner?: PublicPublisher | null;
  score: number;
};

export type UnifiedCreatorResult = {
  type: "creator";
  creator: PublicPublisherListItem;
};

type UnifiedResult = UnifiedSkillResult | UnifiedCreatorResult;

export type UnifiedSearchInitialData = {
  query: string;
  activeType: UnifiedSearchType;
  limits: {
    skills: number;
    creators: number;
  };
  skillResults: UnifiedSkillResult[];
  creatorResults: UnifiedCreatorResult[];
  skillHasMore: boolean;
  creatorHasMore: boolean;
};

type UnifiedSearchOptions = {
  debounceMs?: number;
  enabled?: boolean;
  initialData?: UnifiedSearchInitialData | null;
  limits?: {
    skills?: number;
    creators?: number;
  };
};

function mergeUnifiedResults(
  activeType: UnifiedSearchType,
  skillResults: UnifiedSkillResult[],
  creatorResults: UnifiedCreatorResult[],
) {
  const merged: UnifiedResult[] = [];
  if (activeType === "all") {
    merged.push(...skillResults, ...creatorResults);
  } else if (activeType === "skills") {
    merged.push(...skillResults);
  } else {
    merged.push(...creatorResults);
  }
  return merged;
}

export function useUnifiedSearch(
  query: string,
  activeType: UnifiedSearchType,
  options: UnifiedSearchOptions = {},
) {
  const searchSkills = useAction(api.search.searchSkills);
  const requestRef = useRef(0);
  const debounceMs = options.debounceMs ?? 300;
  const enabled = options.enabled ?? true;
  const initialData = options.initialData ?? null;
  const skillLimit = Math.max(0, Math.min(options.limits?.skills ?? 25, MAX_UNIFIED_SEARCH_LIMIT));
  const creatorLimit = Math.max(
    0,
    Math.min(options.limits?.creators ?? 25, MAX_CREATOR_SEARCH_LIMIT),
  );
  const creatorRequestLimit = Math.min(creatorLimit + 1, MAX_CREATOR_SEARCH_LIMIT);
  const trimmedQuery = query.trim();
  const matchedInitialData =
    initialData &&
    initialData.query === trimmedQuery &&
    initialData.activeType === activeType &&
    initialData.limits.skills === skillLimit &&
    initialData.limits.creators === creatorLimit
      ? initialData
      : null;
  const [results, setResults] = useState<UnifiedResult[]>(() =>
    matchedInitialData
      ? mergeUnifiedResults(activeType, matchedInitialData.skillResults, matchedInitialData.creatorResults)
      : [],
  );
  const [skillResults, setSkillResults] = useState<UnifiedSkillResult[]>(
    () => matchedInitialData?.skillResults ?? [],
  );
  const [creatorResults, setCreatorResults] = useState<UnifiedCreatorResult[]>(
    () => matchedInitialData?.creatorResults ?? [],
  );
  const [skillCount, setSkillCount] = useState(() => matchedInitialData?.skillResults.length ?? 0);
  const [creatorCount, setCreatorCount] = useState(
    () => matchedInitialData?.creatorResults.length ?? 0,
  );
  const [skillHasMore, setSkillHasMore] = useState(() => matchedInitialData?.skillHasMore ?? false);
  const [creatorHasMore, setCreatorHasMore] = useState(
    () => matchedInitialData?.creatorHasMore ?? false,
  );
  const [isSearching, setIsSearching] = useState(
    () => enabled && trimmedQuery.length > 0 && !matchedInitialData,
  );

  useEffect(() => {
    if (!matchedInitialData) return;
    setSkillResults(matchedInitialData.skillResults);
    setCreatorResults(matchedInitialData.creatorResults);
    setSkillCount(matchedInitialData.skillResults.length);
    setCreatorCount(matchedInitialData.creatorResults.length);
    setSkillHasMore(matchedInitialData.skillHasMore);
    setCreatorHasMore(matchedInitialData.creatorHasMore);
    setResults(
      mergeUnifiedResults(activeType, matchedInitialData.skillResults, matchedInitialData.creatorResults),
    );
    setIsSearching(false);
  }, [activeType, matchedInitialData]);

  useEffect(() => {
    if (!enabled || !trimmedQuery) {
      requestRef.current += 1;
      setResults([]);
      setSkillResults([]);
      setCreatorResults([]);
      setSkillCount(0);
      setCreatorCount(0);
      setSkillHasMore(false);
      setCreatorHasMore(false);
      setIsSearching(false);
      return () => {};
    }

    const shouldFetchSkills =
      (activeType === "all" || activeType === "skills") && !matchedInitialData;
    const shouldFetchCreators = activeType === "all" || activeType === "creators";

    if (!shouldFetchSkills && !shouldFetchCreators) {
      requestRef.current += 1;
      setIsSearching(false);
      return () => {};
    }

    requestRef.current += 1;
    const requestId = requestRef.current;
    const controller = new AbortController();
    setIsSearching(true);

    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const promises: [
            Promise<unknown> | null,
            Promise<{ page: PublicPublisherListItem[]; isDone?: boolean }> | null,
          ] = [null, null];

          if (shouldFetchSkills) {
            promises[0] = searchSkills({
              query: trimmedQuery,
              limit: skillLimit + 1,
            });
          }

          if (shouldFetchCreators) {
            promises[1] = convexHttp.query(api.publishers.listPublicPage, {
              query: trimmedQuery,
              paginationOpts: { cursor: null, numItems: creatorRequestLimit },
            });
          }

          const settled = await Promise.allSettled(promises.map((p) => p ?? Promise.resolve(null)));

          if (requestId !== requestRef.current) return;

          const skillsRaw = settled[0].status === "fulfilled" ? settled[0].value : null;
          const creatorsRaw = settled[1].status === "fulfilled" ? settled[1].value : null;

          const skillMatches: UnifiedSkillResult[] =
            matchedInitialData?.skillResults ??
            (
              (skillsRaw as Array<{
                skill: UnifiedSkillResult["skill"];
                ownerHandle: string | null;
                owner?: PublicPublisher | null;
                score: number;
              }>) ?? []
            ).map((entry) => ({
              type: "skill" as const,
              skill: entry.skill,
              ownerHandle: entry.ownerHandle,
              owner: entry.owner ?? null,
              score: entry.score,
            }));
          const nextSkillResults = skillMatches.slice(0, skillLimit);

          const creatorMatches: UnifiedCreatorResult[] = (
            (creatorsRaw as { page: PublicPublisherListItem[] } | null)?.page ?? []
          ).map((item) => ({
            type: "creator" as const,
            creator: item,
          }));
          const nextCreatorResults = creatorMatches.slice(0, creatorLimit);

          setSkillCount(nextSkillResults.length);
          setCreatorCount(nextCreatorResults.length);
          setSkillHasMore(
            matchedInitialData ? matchedInitialData.skillHasMore : skillMatches.length > skillLimit,
          );
          setCreatorHasMore(
            creatorLimit < MAX_CREATOR_SEARCH_LIMIT &&
              (creatorMatches.length > creatorLimit ||
                (creatorsRaw as { isDone?: boolean } | null)?.isDone === false),
          );
          setSkillResults(nextSkillResults);
          setCreatorResults(nextCreatorResults);

          setResults(
            mergeUnifiedResults(activeType, nextSkillResults, nextCreatorResults),
          );
        } catch (error) {
          console.error("Unified search failed:", error);
          if (requestId === requestRef.current) {
            setResults([]);
            setSkillResults([]);
            setCreatorResults([]);
            setSkillCount(0);
            setCreatorCount(0);
            setSkillHasMore(false);
            setCreatorHasMore(false);
          }
        } finally {
          if (requestId === requestRef.current) {
            setIsSearching(false);
          }
        }
      })();
    }, debounceMs);

    return () => {
      requestRef.current += 1;
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [
    trimmedQuery,
    activeType,
    searchSkills,
    debounceMs,
    enabled,
    skillLimit,
    creatorLimit,
    creatorRequestLimit,
    matchedInitialData,
  ]);

  return {
    results,
    skillResults,
    creatorResults,
    skillCount,
    creatorCount,
    skillHasMore,
    creatorHasMore,
    isSearching,
  };
}
