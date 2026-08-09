import { Bookmark, Boxes, Cable, Download, Network, Plug, Repeat2, Sparkles } from "lucide-react";
import { rowNumber, rowString, rowStringArray } from "../../lib/assetsClient";
import { assetDownloadUrl } from "../../lib/assetsClient";
import type { AssetRow, AssetType } from "../../lib/assetTypes";

const TYPE_META: Record<AssetType, { label: string; icon: typeof Sparkles }> = {
  skills:      { label: "Skill",       icon: Sparkles },
  plugins:     { label: "Plugin",      icon: Plug     },
  mcp_servers: { label: "MCP Server",  icon: Cable    },
  connectors:  { label: "Connector",   icon: Boxes    },
  loops:       { label: "Loop",        icon: Repeat2  },
  graphs:      { label: "Graph",       icon: Network  },
};

export function assetTypeMeta(type: AssetType) {
  return TYPE_META[type];
}

export function CatalogDownloadButton({
  type, slug, label, className = "",
}: {
  type: AssetType; slug: string; label?: string; className?: string;
}) {
  return (
    <a
      href={assetDownloadUrl(type, slug)}
      className={`inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white ${className}`}
      aria-label={`Download ${label ?? slug}`}
      title="Download raw file"
      onClick={(e) => e.stopPropagation()}
    >
      <Download size={13} aria-hidden="true" />
      {label}
    </a>
  );
}

export function CatalogCard({
  item, type, detailHref,
}: {
  item: AssetRow; type: AssetType; detailHref: string;
}) {
  const slug = rowString(item, "slug") ?? "";
  const name = rowString(item, "name") ?? slug;
  const publisher = rowString(item, "publisher") ?? rowString(item, "namespace");
  const summary = rowString(item, "summary");
  const tags = rowStringArray(item, "tags").slice(0, 3);
  const category = rowString(item, "category");
  const stars = rowNumber(item, "stars");
  const downloads = rowNumber(item, "downloads");
  const updatedAt = rowString(item, "updated_at") ?? rowString(item, "created_at");

  const TypeIcon = TYPE_META[type].icon;

  return (
    <a
      href={detailHref}
      className="catalog-card group flex min-h-[160px] flex-col gap-0 rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition-colors hover:border-slate-700"
    >
      {/* header: name + owner */}
      <div className="mb-2">
        <h3 className="text-[15px] font-bold leading-snug tracking-tight text-white group-hover:text-slate-100">
          {name}
        </h3>
        {publisher ? (
          <p className="mt-0.5 text-[12px] text-slate-500">@{publisher}</p>
        ) : null}
      </div>

      {/* description */}
      {summary ? (
        <p className="line-clamp-3 text-[13px] leading-relaxed text-slate-400">{summary}</p>
      ) : null}

      {/* category + tags */}
      {(category || tags.length > 0) ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500">
          {category ? (
            <span className="inline-flex items-center gap-1">
              <TypeIcon size={12} className="opacity-60" aria-hidden="true" />
              {category}
            </span>
          ) : null}
          {tags.map((t) => (
            <span key={t} className="text-slate-600">#{t}</span>
          ))}
        </div>
      ) : null}

      {/* footer */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-800/70 pt-2.5 text-[12px] text-slate-500" style={{ marginTop: "auto", paddingTop: "10px" }}>
        <span>{updatedAt ? `Updated ${timeAgo(updatedAt)}` : ""}</span>
        <span className="flex items-center gap-3">
          {stars != null ? (
            <span className="inline-flex items-center gap-1">
              <Bookmark size={12} className="opacity-60" aria-hidden="true" />
              {fmt(stars)}
            </span>
          ) : null}
          {downloads != null ? (
            <span className="inline-flex items-center gap-1">
              <Download size={12} className="opacity-60" aria-hidden="true" />
              {fmt(downloads)}
            </span>
          ) : null}
        </span>
      </div>
    </a>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 5) return `${wks}w ago`;
  const mos = Math.floor(days / 30);
  if (mos < 12) return `${mos}mo ago`;
  return `${Math.floor(mos / 12)}y ago`;
}

// Keep typeBadgeText for any callers that may still reference it
export function typeBadgeText(item: AssetRow, type: AssetType): string {
  switch (type) {
    case "skills": return rowStringArray(item, "language")[0] ?? rowString(item, "difficulty") ?? "";
    case "plugins": return rowString(item, "version") ?? "";
    case "mcp_servers": return rowString(item, "transport") ?? "";
    case "connectors": { const a = rowNumber(item, "actions_count"); return a != null ? `${a} actions` : ""; }
    case "loops": return `${rowNumber(item, "step_count") ?? "?"} steps`;
    case "graphs": return `${rowNumber(item, "node_count") ?? "?"}N · ${rowNumber(item, "edge_count") ?? "?"}E`;
    default: { const x: never = type; throw new Error(`Unhandled: ${String(x)}`); }
  }
}
