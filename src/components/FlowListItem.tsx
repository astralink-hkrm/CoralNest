import { Link } from "@tanstack/react-router";
import type { FlowCatalogItem, OpenFlowEntry } from "clawhub-schema/flows";
import { Download, ExternalLink, GitBranch, Repeat2, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { formatCompactStat } from "../lib/numberFormat";
import { buildSkillDetailHref } from "../lib/ownerRoute";
import { presentationTitle } from "../lib/presentationTitle";
import { PUBLIC_CATALOG_NAME_PREVIEW_LENGTH, truncateText } from "../lib/truncateText";
import { CatalogTopicList } from "./CatalogTopicList";
import { MarketplaceIcon } from "./MarketplaceIcon";

type FlowListItemProps = {
  item: FlowCatalogItem;
  variant?: "list" | "card";
};

function FlowKindBadge({ kind }: { kind: FlowCatalogItem["kind"] }) {
  const Icon = kind === "skill" ? Download : kind === "loop" ? Repeat2 : Workflow;
  const label = kind === "skill" ? "Skill" : kind === "loop" ? "Loop" : "Graph";
  return (
    <span className={`flow-kind-badge flow-kind-${kind}`} aria-label={`Flow kind: ${label}`}>
      <Icon size={12} strokeWidth={2.25} aria-hidden="true" />
      {label}
    </span>
  );
}

function FlowSourceLink({ entry }: { entry: OpenFlowEntry }) {
  return (
    <span className="flow-source-link">
      <GitBranch size={12} aria-hidden="true" />
      <span className="flow-source-repo">{entry.source.repo}</span>
      <span className="flow-source-path">{entry.source.path}</span>
    </span>
  );
}

function FlowLoopKinds({ entry }: { entry: OpenFlowEntry }) {
  if (entry.loopKinds.length === 0) return null;
  return (
    <span className="flow-loop-kinds" aria-label="Loop controls">
      {entry.loopKinds.slice(0, 3).map((kind) => (
        <span key={kind} className="flow-loop-kind">
          {kind}
        </span>
      ))}
    </span>
  );
}

function FlowListItemInner({ item }: { item: FlowCatalogItem }) {
  const displayName = presentationTitle(
    item.displayName,
    item.kind === "skill" ? item.name : item.name,
  );
  if (item.kind !== "skill") {
    return (
      <>
        <span className="skill-list-item-identity">
          <span className="skill-list-item-name" title={displayName}>
            {truncateText(displayName, PUBLIC_CATALOG_NAME_PREVIEW_LENGTH)}
          </span>
          <FlowKindBadge kind={item.kind} />
        </span>
        <FlowLoopKinds entry={item} />
        <FlowSourceLink entry={item} />
        <p className="skill-list-item-summary">
          {truncateText(item.summary ?? "Agent flow from an open-source repository.", 90)}
        </p>
      </>
    );
  }
  return (
    <>
      <span className="skill-list-item-identity">
        <span className="skill-list-item-name" title={displayName}>
          {truncateText(displayName, PUBLIC_CATALOG_NAME_PREVIEW_LENGTH)}
        </span>
        {item.ownerHandle ? (
          <span className="skill-list-item-owner">@{item.ownerHandle}</span>
        ) : null}
      </span>
      <CatalogTopicList topics={item.topics} limit={2} ariaLabel="Topics" />
      <p className="skill-list-item-summary">
        {truncateText(item.summary ?? "Skill package for agent workflows.", 90)}
      </p>
    </>
  );
}

export function FlowListItem({ item, variant = "list" }: FlowListItemProps) {
  const displayName = presentationTitle(item.displayName, item.name);
  const kindLabel = item.kind === "skill" ? "Skill" : item.kind === "loop" ? "Loop" : "Graph";
  const className =
    variant === "card"
      ? "card skill-card plugin-card"
      : "skill-list-item skill-list-item-with-taxonomy";
  const ariaLabel = `${kindLabel}: ${displayName}`;

  const meta: ReactNode =
    item.kind === "skill" ? (
      <span className="skill-list-item-meta-item">
        <Download size={14} aria-hidden="true" /> {formatCompactStat(item.stats.downloads ?? 0)}
      </span>
    ) : (
      <span className="skill-list-item-meta-item">
        {item.stepCount} step{item.stepCount === 1 ? "" : "s"}
      </span>
    );

  const contents = (
    <>
      {variant === "card" ? (
        <>
          <div className="skill-card-header">
            <MarketplaceIcon
              kind="skill"
              label={displayName}
              imageUrl={null}
              categorySlug={null}
              size="md"
            />
            <div className="skill-card-identity">
              <h3 className="skill-card-title" title={displayName}>
                {truncateText(displayName, PUBLIC_CATALOG_NAME_PREVIEW_LENGTH)}
              </h3>
              <span className="skill-card-owner-row">
                <FlowKindBadge kind={item.kind} />
              </span>
            </div>
          </div>
          <p className="skill-card-summary">
            {truncateText(
              item.summary ??
                (item.kind === "skill"
                  ? "Skill package for agent workflows."
                  : "Agent flow from an open-source repository."),
              100,
            )}
          </p>
          {item.kind !== "skill" ? <FlowSourceLink entry={item} /> : null}
          <CatalogTopicList topics={item.topics} limit={2} ariaLabel="Topics" />
          <div className="skill-card-footer">
            <div className="skill-card-bottom-row">
              <div className="skill-card-bottom-meta">
                <div className="skill-list-item-meta">{meta}</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <MarketplaceIcon kind="skill" label={displayName} imageUrl={null} categorySlug={null} />
          <div className="skill-list-item-body">
            <FlowListItemInner item={item} />
          </div>
          <div className="skill-list-item-taxonomy" aria-label="Source">
            {item.kind === "skill" && item.ownerHandle ? (
              <span className="skill-list-item-category">@{item.ownerHandle}</span>
            ) : (
              <span className="skill-list-item-category">Open source</span>
            )}
          </div>
          <div className="skill-list-item-meta">{meta}</div>
          {item.kind !== "skill" ? (
            <span className="flow-list-item-external" aria-hidden="true">
              <ExternalLink size={14} />
            </span>
          ) : null}
        </>
      )}
    </>
  );

  if (item.kind !== "skill") {
    return (
      <a
        href={item.source.url}
        target="_blank"
        rel="noreferrer"
        className={className}
        aria-label={ariaLabel}
      >
        {contents}
      </a>
    );
  }

  const href =
    item.ownerHandle != null ? buildSkillDetailHref(item.ownerHandle, item.name) : undefined;
  return (
    <Link to={href} className={className} aria-label={ariaLabel}>
      {contents}
    </Link>
  );
}
