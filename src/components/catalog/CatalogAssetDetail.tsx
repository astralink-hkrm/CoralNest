import {
  ArrowLeft,
  Bookmark,
  Check,
  Copy,
  Download,
  File,
  FileText,
  Folder,
  PackageSearch,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assetDownloadUrl,
  assetFileUrl,
  getAssetDetailClient,
  getAssetPayloadClient,
  getAssetTreeClient,
  parsePayloadJson,
  rowNumber,
  rowString,
  rowStringArray,
} from "../../lib/assetsClient";
import type {
  AssetDetailResponse,
  AssetPayloadResponse,
  AssetTreeFile,
  AssetType,
} from "../../lib/assetTypes";
import { CoralPageWrapper } from "../CoralPageWrapper";
import { MarkdownPreview } from "../MarkdownPreview";
import { assetTypeMeta } from "./CatalogCard";

type DetailField = { key: string; label: string };
type Tab = "readme" | "files" | "payload";

const DETAIL_FIELDS: Record<AssetType, DetailField[]> = {
  skills:     [{ key:"publisher",label:"Publisher" },{ key:"category",label:"Category" },{ key:"subcategory",label:"Subcategory" },{ key:"language",label:"Language" },{ key:"version",label:"Version" },{ key:"license",label:"License" },{ key:"source_repo",label:"Source Repo" },{ key:"difficulty",label:"Difficulty" }],
  plugins:    [{ key:"publisher",label:"Publisher" },{ key:"category",label:"Category" },{ key:"subcategory",label:"Subcategory" },{ key:"version",label:"Version" },{ key:"license",label:"License" },{ key:"source_repo",label:"Source Repo" },{ key:"plugin_type",label:"Plugin Type" }],
  mcp_servers:[{ key:"namespace",label:"Namespace" },{ key:"transport",label:"Transport" },{ key:"hosting",label:"Hosting" },{ key:"tools_count",label:"Tools" },{ key:"env_vars_count",label:"Env Vars" },{ key:"license",label:"License" },{ key:"source_repo",label:"Source Repo" }],
  connectors: [{ key:"provider",label:"Provider" },{ key:"auth_type",label:"Auth Type" },{ key:"actions_count",label:"Actions" },{ key:"triggers_count",label:"Triggers" },{ key:"webhooks_count",label:"Webhooks" },{ key:"category",label:"Category" },{ key:"subcategory",label:"Subcategory" }],
  loops:      [{ key:"loop_kind",label:"Loop Kind" },{ key:"category",label:"Category" },{ key:"difficulty",label:"Difficulty" },{ key:"max_iterations",label:"Max Iterations" },{ key:"step_count",label:"Steps" },{ key:"convergence_strategy",label:"Convergence" }],
  graphs:     [{ key:"graph_type",label:"Graph Type" },{ key:"framework",label:"Framework" },{ key:"node_count",label:"Nodes" },{ key:"edge_count",label:"Edges" },{ key:"supports_streaming",label:"Streaming" },{ key:"supports_human_in_loop",label:"Human-in-loop" },{ key:"license",label:"License" }],
};

function fmtVal(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "string" && v) return v;
  if (typeof v === "number") return String(v);
  return "";
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function isText(p: string) {
  return /\.(md|markdown|json|txt|yml|yaml|py|ts|tsx|js|jsx|toml|env|sh|lock)$/i.test(p);
}

function tryJson(s: string): string {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}

type TreeNode = { name: string; path: string; isDir: boolean; size?: number; children: TreeNode[] };

function buildTree(files: AssetTreeFile[]): TreeNode[] {
  const nodes: TreeNode[] = [];
  const map = new Map<string, TreeNode>();
  for (const f of files) {
    const parts = f.path.split("/").filter(Boolean);
    if (!parts.length) continue;
    let cur = nodes; let cp = "";
    parts.forEach((p, i) => {
      const full = cp ? `${cp}/${p}` : p;
      const last = i === parts.length - 1;
      let node = map.get(full);
      if (!node) {
        node = last ? { name: p, path: f.path, isDir: false, size: f.size, children: [] }
                    : { name: p, path: full, isDir: true, children: [] };
        map.set(full, node);
      }
      if (!cur.find((n) => n === node)) cur.push(node);
      cur = node.isDir ? node.children : [];
      cp = full;
    });
  }
  const sort = (list: TreeNode[]) => {
    list.sort((a, b) => a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1);
    list.forEach((n) => n.isDir && sort(n.children));
  };
  sort(nodes);
  return nodes;
}

function FileTree({ nodes, depth = 0, type, slug, onPreview, previewPath }: {
  nodes: TreeNode[]; depth?: number; type: AssetType; slug: string;
  onPreview: (p: string) => void; previewPath: string | null;
}) {
  return (
    <ul className={depth > 0 ? "mt-1 ml-4 space-y-0.5 border-l border-slate-800 pl-3" : "space-y-0.5"}>
      {nodes.map((n) => (
        <li key={n.path}>
          {n.isDir ? (
            <div className="flex items-center gap-2 py-0.5 text-xs font-semibold text-slate-400">
              <Folder className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" /> {n.name}/
            </div>
          ) : (
            <div className="group flex items-center gap-2 py-0.5 text-xs">
              {isText(n.path)
                ? <FileText className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
                : <File    className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />}
              <button type="button" onClick={() => onPreview(n.path)}
                className={`truncate font-mono transition-colors ${previewPath === n.path ? "text-slate-200" : "text-slate-400 hover:text-white"}`}>
                {n.name}
              </button>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-600">
                {n.size != null ? fmtBytes(n.size) : ""}
              </span>
              <a href={assetFileUrl(type, slug, n.path)} download
                className="ml-1 inline-flex shrink-0 items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                aria-label={`Download ${n.name}`}>
                <Download className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          )}
          {n.isDir && <FileTree nodes={n.children} depth={depth + 1} type={type} slug={slug} onPreview={onPreview} previewPath={previewPath} />}
        </li>
      ))}
    </ul>
  );
}

function PayloadPanel({ type, slug }: { type: AssetType; slug: string }) {
  const [payload, setPayload] = useState<AssetPayloadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void getAssetPayloadClient(type, slug).then((r) => { if (!cancelled) { setPayload(r); setLoading(false); } });
    return () => { cancelled = true; };
  }, [type, slug]);
  const json = useMemo(() => {
    if (!payload) return null;
    const p = parsePayloadJson(payload);
    return p != null ? JSON.stringify(p, null, 2) : payload.content;
  }, [payload]);
  const copy = () => {
    if (!json) return;
    void navigator.clipboard.writeText(json);
    setCopied(true); window.setTimeout(() => setCopied(false), 2000);
  };
  if (loading) return <div className="h-32 animate-pulse rounded-lg bg-slate-900" />;
  if (!payload || !json) return <p className="text-sm text-slate-500">No payload available.</p>;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="truncate font-mono text-xs text-slate-600">{payload.storagePath}</span>
        <button type="button" onClick={copy}
          className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-400 hover:text-white">
          {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <pre className="max-h-[480px] overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-300">{json}</pre>
    </div>
  );
}

export function CatalogAssetDetail({
  type, slug, backHref,
}: {
  type: AssetType; slug: string; backHref: { to: string; label: string };
}) {
  const { label, icon: Icon } = assetTypeMeta(type);
  const [detail, setDetail] = useState<AssetDetailResponse | null>(null);
  const [treeFiles, setTreeFiles] = useState<AssetTreeFile[]>([]);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("readme");
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(false); setDetail(null);
    setTreeFiles([]); setStoragePath(null);
    setPreviewPath(null); setPreviewContent(null);
    void Promise.allSettled([
      getAssetDetailClient(type, slug),
      getAssetTreeClient(type, slug),
    ]).then(([dr, tr]) => {
      if (cancelled) return;
      if (dr.status === "rejected" || !dr.value) { setError(true); setLoading(false); return; }
      setDetail(dr.value);
      if (tr.status === "fulfilled" && tr.value) {
        setTreeFiles(tr.value.files);
        setStoragePath(tr.value.storagePath ?? null);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [type, slug]);

  const item = detail?.item ?? null;
  const readme = detail?.readme ?? null;
  const name = item ? (rowString(item, "name") ?? slug) : slug;
  const summary = item ? rowString(item, "summary") : undefined;
  const publisher = item ? (rowString(item, "publisher") ?? rowString(item, "namespace")) : undefined;
  const category = item ? rowString(item, "category") : undefined;
  const quality = item ? rowNumber(item, "quality_score") : undefined;
  const security = item ? rowNumber(item, "security_score") : undefined;
  const stars = item ? rowNumber(item, "stars") : undefined;
  const downloads = item ? rowNumber(item, "downloads") : undefined;
  const version = item ? (rowString(item, "version") ?? rowString(item, "github_current_commit")?.slice(0, 7)) : undefined;
  const license = item ? rowString(item, "license") : undefined;
  const updatedAt = item ? (rowString(item, "updated_at") ?? rowString(item, "created_at")) : undefined;
  const tags = item ? rowStringArray(item, "tags") : [];
  const runCommand = item ? rowString(item, "command") : undefined;
  const rowSP = storagePath ?? (item ? (rowString(item, "storage_path") ?? rowString(item, "storage_url")) : null);
  const payloadFileName = rowSP?.split("/").pop() ?? "asset.json";
  const treeNodes = useMemo(() => buildTree(treeFiles), [treeFiles]);

  const handlePreview = useCallback(async (path: string) => {
    if (previewPath === path) { setPreviewPath(null); setPreviewContent(null); return; }
    setPreviewPath(path); setPreviewContent(null); setPreviewLoading(true);
    try {
      const res = await fetch(assetFileUrl(type, slug, path));
      if (!res.ok) { setPreviewContent(`Unable to load "${path}".`); return; }
      const text = await res.text();
      setPreviewContent(path.toLowerCase().endsWith(".json") ? tryJson(text) : text);
    } catch { setPreviewContent(`Unable to load "${path}".`); }
    finally { setPreviewLoading(false); }
  }, [previewPath, type, slug]);

  const copyCmd = () => {
    if (!runCommand) return;
    void navigator.clipboard.writeText(runCommand);
    setCopiedCmd(true); window.setTimeout(() => setCopiedCmd(false), 2000);
  };

  const tabs: { id: Tab; label: string }[] = [
    ...(readme ? [{ id: "readme" as Tab, label: "README" }] : []),
    ...(treeFiles.length > 0 ? [{ id: "files" as Tab, label: "Files" }] : []),
    { id: "payload" as Tab, label: payloadFileName },
  ];
  // Default to first available tab
  const defaultTab = readme ? "readme" : treeFiles.length > 0 ? "files" : "payload";
  const activeTab = tabs.find((t) => t.id === tab)?.id ?? defaultTab;

  return (
    <CoralPageWrapper>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-4">
            <div className="h-5 w-24 animate-pulse rounded bg-slate-800/60" />
            <div className="h-8 w-64 animate-pulse rounded bg-slate-800/60" />
            <div className="h-20 animate-pulse rounded bg-slate-800/50" />
          </div>
        ) : error || !item ? (
          <div className="py-16 text-center">
            <PackageSearch className="mx-auto mb-4 h-12 w-12 text-slate-700" aria-hidden="true" />
            <h2 className="text-xl font-bold text-white">{label} not found</h2>
            <p className="mt-2 text-sm text-slate-500">The requested {label.toLowerCase()} could not be located.</p>
            <a href={backHref.to} className="mt-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> {backHref.label}
            </a>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">

            {/* ── LEFT ── */}
            <div className="min-w-0">

              {/* back + category breadcrumb */}
              <div className="mb-4 flex items-center gap-2 text-[13px] text-slate-500">
                <a href={backHref.to} className="inline-flex items-center gap-1 hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" /> {backHref.label}
                </a>
                {category ? (
                  <>
                    <span className="text-slate-700">/</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                      {category}
                    </span>
                  </>
                ) : null}
              </div>

              {/* name */}
              <h1 className="mb-2 text-[28px] font-extrabold leading-tight tracking-tight text-white">
                {name}
              </h1>

              {/* summary — truncated with expand */}
              {summary ? (
                <p className="mb-4 max-w-2xl text-[14px] leading-relaxed text-slate-400">{summary}</p>
              ) : null}

              {/* publisher row */}
              {publisher ? (
                <div className="mb-6 flex items-center gap-2 text-[13px] text-slate-400">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white uppercase">
                    {publisher.slice(0, 1)}
                  </span>
                  <span className="font-medium text-slate-300">{publisher}</span>
                  <span className="text-slate-600">@{publisher}</span>
                </div>
              ) : null}

              {/* tags */}
              {tags.length > 0 ? (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{t}</span>
                  ))}
                </div>
              ) : null}

              {/* install / run command */}
              {runCommand ? (
                <div className="mb-6">
                  <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Run</p>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 font-mono text-[13px] text-slate-200">
                    <span className="text-slate-600 select-none">$</span>
                    <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{runCommand}</code>
                    <button type="button" onClick={copyCmd}
                      className="shrink-0 rounded p-1 text-slate-500 transition-colors hover:text-white"
                      aria-label="Copy command">
                      {copiedCmd ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* download button */}
              <div className="mb-6">
                <a href={assetDownloadUrl(type, slug)}
                  style={{ backgroundColor: "#1e293b" }}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-slate-200 transition-colors hover:brightness-110">
                  <Download className="h-4 w-4" /> Download {payloadFileName}
                </a>
              </div>

              {/* stats */}
              {(stars != null || downloads != null || quality != null) ? (
                <div className="mb-6 flex flex-wrap gap-5 text-[13px] text-slate-500">
                  {quality  != null ? <span>Q {quality}/100</span>  : null}
                  {security != null ? <span>Sec {security}/100</span> : null}
                  {stars    != null ? <span className="inline-flex items-center gap-1"><Bookmark size={13} className="opacity-50" />{stars.toLocaleString()}</span> : null}
                  {downloads != null ? <span className="inline-flex items-center gap-1"><Download size={13} className="opacity-50" />{downloads.toLocaleString()}</span> : null}
                </div>
              ) : null}

              {/* tabs */}
              {tabs.length > 0 ? (
                <div className="mb-0 border-b border-slate-800">
                  <nav className="flex gap-0" aria-label="Content sections">
                    {tabs.map((t) => (
                      <button key={t.id} type="button" onClick={() => setTab(t.id)}
                        className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
                          activeTab === t.id
                            ? "border-white text-white"
                            : "border-transparent text-slate-500 hover:text-slate-300"
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </nav>
                </div>
              ) : null}

              {/* tab content */}
              <div className="pt-5">
                {activeTab === "readme" && readme ? (
                  <MarkdownPreview>{readme}</MarkdownPreview>
                ) : activeTab === "files" && treeFiles.length > 0 ? (
                  <div>
                    {rowSP ? <p className="mb-3 font-mono text-[11px] text-slate-600">{rowSP}</p> : null}
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <div className="rounded-lg bg-slate-950/60 p-4">
                        <FileTree nodes={treeNodes} type={type} slug={slug} onPreview={handlePreview} previewPath={previewPath} />
                      </div>
                      <div>
                        {previewLoading ? (
                          <div className="h-full min-h-40 animate-pulse rounded-lg bg-slate-950" />
                        ) : previewPath && previewContent != null ? (
                          <div className="flex h-full flex-col">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="truncate font-mono text-[11px] text-slate-500">{previewPath}</span>
                              <button type="button" onClick={() => { setPreviewPath(null); setPreviewContent(null); }}
                                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400 hover:text-white">Close</button>
                            </div>
                            <pre className="min-h-40 flex-1 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-300">{previewContent}</pre>
                          </div>
                        ) : (
                          <p className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-600">Click a file to preview.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : activeTab === "payload" ? (
                  <PayloadPanel type={type} slug={slug} />
                ) : (
                  <p className="text-sm text-slate-500">No content available.</p>
                )}
              </div>
            </div>{/* end left */}

            {/* ── RIGHT sidebar ── */}
            <aside className="min-w-0 lg:sticky lg:top-6">

              {/* stats summary at top */}
              {(downloads != null || stars != null) ? (
                <div className="mb-5 flex gap-5 text-[13px]">
                  {stars != null ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Bookmarks</p>
                      <p className="text-xl font-bold text-white">{stars.toLocaleString()}</p>
                    </div>
                  ) : null}
                  {downloads != null ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Downloads</p>
                      <p className="text-xl font-bold text-white">{downloads.toLocaleString()}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* metadata rows — label left, value right */}
              <div className="divide-y divide-slate-800/50">
                {DETAIL_FIELDS[type]
                  .filter((f) => { const v = item[f.key]; return v !== undefined && v !== null && v !== ""; })
                  .map((f) => (
                    <div key={f.key} className="flex items-baseline justify-between gap-3 py-2.5">
                      <dt className="shrink-0 text-[12px] text-slate-500">{f.label}</dt>
                      <dd className="min-w-0 text-right text-[12px] text-slate-300 break-all">
                        {fmtVal(item[f.key])}
                      </dd>
                    </div>
                  ))}
                {updatedAt ? (
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt className="shrink-0 text-[12px] text-slate-500">Last updated</dt>
                    <dd className="min-w-0 text-right text-[12px] text-slate-300">{updatedAt}</dd>
                  </div>
                ) : null}
                {quality != null ? (
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt className="shrink-0 text-[12px] text-slate-500">Quality</dt>
                    <dd className="text-right text-[12px] text-slate-300">{quality}/100</dd>
                  </div>
                ) : null}
              </div>

              {/* download */}
              <div className="mt-5 border-t border-slate-800/50 pt-4">
                <a href={assetDownloadUrl(type, slug)}
                  style={{ backgroundColor: "#1e293b" }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-slate-200 transition-colors hover:brightness-110">
                  <Download className="h-4 w-4" /> Download
                </a>
              </div>

            </aside>

          </div>
        )}
      </div>
    </CoralPageWrapper>
  );
}
