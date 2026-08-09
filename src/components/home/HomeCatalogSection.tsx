import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { searchAssetsClient, rowString } from "../../lib/assetsClient";
import type { AssetRow, AssetType } from "../../lib/assetTypes";
import { catalogBrowseHref, catalogDetailHref } from "../../lib/catalogPaths";
import { TIER_LINK_COLOR } from "../../lib/tierTheme";
import { CatalogListRow } from "../catalog/CatalogListRow";

type HomeCatalogSectionProps = {
  type: AssetType;
  title: string;
  subtitle: string;
  limit?: number;
};

export function HomeCatalogSection({ type, title, subtitle, limit = 6 }: HomeCatalogSectionProps) {
  const [items, setItems] = useState<AssetRow[] | null>(null);
  const [error, setError] = useState(false);
  const linkClass = TIER_LINK_COLOR[type] ?? "text-slate-400 hover:text-slate-300";

  useEffect(() => {
    let cancelled = false;
    void searchAssetsClient({ type, sortBy: "quality", limit, offset: 0 })
      .then((result) => {
        if (!cancelled) setItems(result?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [type, limit]);

  return (
    <section aria-label={title} className="home-v2-listing-section">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
        <a
          href={catalogBrowseHref(type)}
          className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${linkClass}`}
        >
          Browse all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      {error ? (
        <p className="rounded-xl border border-slate-800 p-6 text-center text-xs text-slate-500">
          This section is temporarily unavailable.
        </p>
      ) : items == null ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading">
          {Array.from({ length: limit }, (_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton count
              key={index}
              className="h-14 animate-pulse rounded-xl bg-slate-900/60"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
          Nothing in this section yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const slug = rowString(item, "slug") ?? "";
            return (
              <CatalogListRow
                key={`${type}:${slug}`}
                item={item}
                type={type}
                detailHref={catalogDetailHref(type, slug)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
