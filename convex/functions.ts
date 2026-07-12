import { customCtx, customMutation } from "convex-helpers/server/customFunctions";
import { Triggers, type Change } from "convex-helpers/server/triggers";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
  query,
  internalQuery,
  action,
  internalAction,
  httpAction,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getOwnerPublisher } from "./lib/publishers";
import { adjustPublisherStatsForSkillChange } from "./lib/publisherStats";
import {
  deleteSkillSearchDigests,
  extractValidatedDigestFields,
  upsertSkillSearchDigest,
} from "./lib/skillSearchDigest";

const triggers = new Triggers<DataModel>();

function isMissingTableError(error: unknown, table: string) {
  return (
    error instanceof Error &&
    new RegExp(`unexpected (query )?table:? ${table}`, "i").test(error.message)
  );
}

type OwnerPublisherDigestScheduleCtx = Pick<Partial<MutationCtx>, "scheduler">;
const OWNER_PUBLISHER_DIGEST_PAGE_SIZE = 100;

async function syncSkillSearchDigestForSkill(
  ctx: Pick<MutationCtx, "db" | "runQuery">,
  skill: Doc<"skills"> | null | undefined,
) {
  if (!skill) return;
  const fields = await extractValidatedDigestFields(ctx, skill);
  const owner = await getOwnerPublisher(ctx, {
    ownerPublisherId: skill.ownerPublisherId,
    ownerUserId: skill.ownerUserId,
  });
  await upsertSkillSearchDigest(ctx, {
    ...fields,
    ownerHandle: owner?.handle ?? "",
    ownerKind: owner?.kind,
    ownerName: owner?.linkedUserId ? owner.handle : undefined,
    ownerDisplayName: owner?.displayName,
    ownerImage: owner?.image,
  });
}

export async function syncSkillSearchDigestsForOwnerPublisherId(
  ctx: Pick<MutationCtx, "db" | "runQuery"> & OwnerPublisherDigestScheduleCtx,
  ownerPublisherId: Id<"publishers"> | null | undefined,
  cursor: string | null = null,
) {
  if (!ownerPublisherId) return;
  try {
    const page = await ctx.db
      .query("skills")
      .withIndex("by_owner_publisher", (q) => q.eq("ownerPublisherId", ownerPublisherId))
      .paginate({ cursor, numItems: OWNER_PUBLISHER_DIGEST_PAGE_SIZE });
    for (const skill of page.page) {
      await syncSkillSearchDigestForSkill(ctx, skill);
    }
    if (!page.isDone && ctx.scheduler && page.continueCursor) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.syncSkillSearchDigestsForOwnerPublisherIdInternal,
        { ownerPublisherId, cursor: page.continueCursor },
      );
    }
  } catch (error) {
    if (isMissingTableError(error, "skills")) return;
    throw error;
  }
}

export async function scheduleOwnerPublisherDigestSync(
  ctx: OwnerPublisherDigestScheduleCtx,
  ownerPublisherId: Id<"publishers"> | null | undefined,
) {
  if (!ownerPublisherId || !ctx.scheduler) return;
  await ctx.scheduler.runAfter(
    0,
    internal.functions.syncSkillSearchDigestsForOwnerPublisherIdInternal,
    { ownerPublisherId },
  );
}

export function shouldScheduleOwnerPublisherDigestSyncForPublisherChange(
  change: Change<DataModel, "publishers">,
) {
  if (change.operation === "delete") return true;
  if (
    change.operation === "update" &&
    change.oldDoc.handle === change.newDoc.handle &&
    change.oldDoc.kind === change.newDoc.kind &&
    change.oldDoc.displayName === change.newDoc.displayName &&
    change.oldDoc.image === change.newDoc.image &&
    change.oldDoc.deletedAt === change.newDoc.deletedAt &&
    change.oldDoc.deactivatedAt === change.newDoc.deactivatedAt
  ) {
    return false;
  }
  if (change.operation === "update" && (change.newDoc.deletedAt || change.newDoc.deactivatedAt)) {
    return false;
  }
  return true;
}

export const syncSkillSearchDigestsForOwnerPublisherIdInternal = rawInternalMutation({
  args: {
    ownerPublisherId: v.id("publishers"),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await syncSkillSearchDigestsForOwnerPublisherId(
      ctx,
      args.ownerPublisherId,
      args.cursor ?? null,
    );
  },
});

triggers.register("skills", async (ctx, change) => {
  await adjustPublisherStatsForSkillChange(
    ctx,
    change.operation === "insert" ? null : change.oldDoc,
    change.operation === "delete" ? null : change.newDoc,
  );
  if (change.operation === "delete") {
    await deleteSkillSearchDigests(ctx, change.id);
  } else {
    await syncSkillSearchDigestForSkill(ctx, change.newDoc);
  }
});

triggers.register("skillVersions", async (ctx, change) => {
  if (change.operation === "insert") return;
  if (
    change.operation === "update" &&
    change.oldDoc.softDeletedAt === change.newDoc.softDeletedAt &&
    change.oldDoc.vtAnalysis?.status === change.newDoc.vtAnalysis?.status &&
    (change.oldDoc.llmAnalysis?.verdict ?? change.oldDoc.llmAnalysis?.status) ===
      (change.newDoc.llmAnalysis?.verdict ?? change.newDoc.llmAnalysis?.status) &&
    change.oldDoc.staticScan?.status === change.newDoc.staticScan?.status
  ) {
    return;
  }
  const skillId = change.operation === "delete" ? change.oldDoc.skillId : change.newDoc.skillId;
  await syncSkillSearchDigestForSkill(ctx, await ctx.db.get(skillId));
});

triggers.register("publishers", async (ctx, change) => {
  if (!shouldScheduleOwnerPublisherDigestSyncForPublisherChange(change)) return;
  const ownerPublisherId = change.operation === "delete" ? change.id : change.newDoc._id;
  await scheduleOwnerPublisherDigestSync(ctx, ownerPublisherId);
});

export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));
export { query, internalQuery, action, internalAction, httpAction };
