import { api } from "../../convex/_generated/api";
import { convexHttp } from "../convex/client";
import type { PublicPublisherListItem } from "./publicUser";

type TopLevelSlugRouteTarget = {
  kind: "publisher";
  handle: string;
  publisher: PublicPublisherListItem;
};

function normalizeOwner(owner: string | null) {
  const normalized = owner?.trim().toLowerCase() ?? "";
  return normalized.startsWith("@") ? normalized.slice(1) : normalized;
}

export async function resolveTopLevelSlugRoute(
  slug: string,
): Promise<TopLevelSlugRouteTarget | null> {
  const publisher = await resolvePublisherHandle(slug);
  if (publisher) {
    return {
      kind: "publisher",
      handle: publisher.handle,
      publisher,
    };
  }

  return null;
}

async function resolvePublisherHandle(handle: string) {
  const normalized = normalizeOwner(handle);
  if (!normalized) return null;

  try {
    return (await convexHttp.query(api.publishers.getProfileByHandle, {
      handle: normalized,
    })) as PublicPublisherListItem | null;
  } catch {
    return null;
  }
}
