import { Bookmark, Download } from "lucide-react";
import { rowNumber, rowString, rowStringArray } from "../../lib/assetsClient";
import { assetDownloadUrl } from "../../lib/assetsClient";
import type { AssetRow, AssetType } from "../../lib/assetTypes";

export function CatalogListRow({
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

  return (
    <a
      href={detailHref}
      className="catalog-list-row group relative grid min-w-0 items-start border-b border-slate-800/60 px-1 py-3.5 last:border-b-0"
      style={{ gridTemplateColumns: "minmax(0,1fr) 160px 190px" }}
    >
      {/* hover bg */}
      <span
        className="pointer-events-none absolute inset-x-[-6px] inset-y-[4px] rounded-md bg-transparent transition-colors group-hover:bg-white/[0.025]"
        aria-hidden="true"
      />

      {/* col 1: name + owner + tags + summary */}
      <div className="relative min-w-0 pr-4">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[15px] font-bold leading-snug tracking-tight text-white">
            {name}
          </span>
          {publisher ? (
            <span className="text-[12px] text-slate-500">@{publisher}</span>
          ) : null}
          {tags.map((t) => (
            <span key={t} className="text-[11px] text-slate-600">#{t}</span>
          ))}
        </div>
        {summary ? (
          <p className="mt-0.5 line-clamp-1 text-[13px] leading-relaxed text-slate-500">
            {summary}
          </p>
        ) : null}
      </div>

      {/* col 2: category */}
      <div className="relative self-center text-[13px] text-slate-400">
        {category ?? ""}
      </div>

      {/* col 3: popularity — updated + stars + downloads + download btn */}
      <div className="relative flex flex-col items-end gap-0.5 self-center text-[12px] text-slate-500">
        {updatedAt ? (
          <span className="whitespace-nowrap">Updated {timeAgo(updatedAt)}</span>
        ) : null}
        <span className="flex items-center gap-3">
          {stars != null ? (
            <span className="inline-flex items-center gap-1">
              <Bookmark size={12} className="opacity-55" aria-hidden="true" />
              {fmt(stars)}
            </span>
          ) : null}
          {downloads != null ? (
            <span className="inline-flex items-center gap-1">
              <Download size={12} className="opacity-55" aria-hidden="true" />
              {fmt(downloads)}
            </span>
          ) : null}
          <a
            href={assetDownloadUrl(type, slug)}
            onClick={(e) => e.stopPropagation()}
            className="ml-1 rounded bg-slate-800/80 p-1 text-slate-500 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label={`Download ${name}`}
            title="Download"
          >
            <Download size={11} aria-hidden="true" />
          </a>
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
