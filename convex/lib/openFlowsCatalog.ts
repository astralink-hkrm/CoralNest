import type { OpenFlowEntry, OpenFlowSource } from "clawhub-schema/flows";
import { parse as parseYaml } from "yaml";
import { BUNDLED_OPEN_FLOW_TEXTS } from "./openFlowsBundled";

/**
 * Open-source agent-flow catalog.
 *
 * Flows (loops and graphs) are NOT stored in a database. This file knows where
 * well-known open-source flow files live and how to read them; the catalog
 * items are produced from the live, fetched upstream content on every request.
 *
 * If an upstream fetch or parse fails, the source is served from a bundled
 * verified snapshot (see `openFlowsBundled.ts`) so the catalog never silently
 * drops loops/graphs; the source id is reported in `fallback` so clients know
 * the item may be stale. Only sources that fail both live AND bundled parsing
 * are reported as `failed` (and omitted from items).
 */

export const OPEN_FLOW_SOURCES: OpenFlowSource[] = [
  {
    id: "agent-loop-flow/simple-sequential",
    kind: "graph",
    repo: "dyoshikawa/agent-loop-flow",
    branch: "main",
    path: "examples/simple-sequential.jsonc",
    displayName: "Simple Sequential",
    topics: ["sequential", "skills", "code"],
  },
  {
    id: "agent-loop-flow/batch-process",
    kind: "loop",
    repo: "dyoshikawa/agent-loop-flow",
    branch: "main",
    path: "examples/loop-processing.jsonc",
    displayName: "Batch Process",
    topics: ["for-each", "while", "batch"],
  },
  {
    id: "agent-loop-flow/conditional-fix",
    kind: "graph",
    repo: "dyoshikawa/agent-loop-flow",
    branch: "main",
    path: "examples/conditional-fix.jsonc",
    displayName: "Conditional Fix",
    topics: ["conditional", "branching", "fix"],
  },
  {
    id: "flowai-workflow/autonomous-sdlc",
    kind: "graph",
    repo: "korchasa/flowai-workflow",
    branch: "main",
    path: ".flowai-workflow/autonomous-sdlc/workflow.yaml",
    displayName: "Autonomous SDLC",
    topics: ["multi-agent", "sdlc", "dag"],
  },
];

const JSONC_SOURCE_SUFFIXES = [".jsonc", ".json", ".json5"];
const YAML_SOURCE_SUFFIXES = [".yaml", ".yml"];

function rawUrlFor(source: OpenFlowSource) {
  return `https://raw.githubusercontent.com/${source.repo}/${source.branch ?? "main"}/${source.path}`;
}

export function sourceRepoUrl(source: OpenFlowSource) {
  return `https://github.com/${source.repo}/blob/${source.branch ?? "main"}/${source.path}`;
}

export function sourceRawUrl(source: OpenFlowSource) {
  return rawUrlFor(source);
}

/**
 * Strip `//` and `/* *​/` comments and trailing commas from a JSONC document
 * without touching string contents.
 */
export function stripJsonc(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const char = text[i]!;
    const next = text[i + 1];
    if (char === '"') {
      out += char;
      i += 1;
      while (i < text.length) {
        const ch = text[i]!;
        out += ch;
        i += 1;
        if (ch === "\\" && i < text.length) {
          out += text[i]!;
          i += 1;
        } else if (ch === '"') {
          break;
        }
      }
      continue;
    }
    if (char === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (char === ",") {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j]!)) j += 1;
      if (text[j] === "}" || text[j] === "]") {
        i += 1;
        continue;
      }
      out += char;
      i += 1;
      continue;
    }
    out += char;
    i += 1;
  }
  return out;
}

export function parseJsonc(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(stripJsonc(text)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type StepNode = Record<string, unknown>;

const LOOP_STEP_TYPES = new Set(["for-each", "while", "while-loop", "loop", "repeat"]);

function detectLoopKindsInStep(step: StepNode): string[] {
  const type = asString(step.type)?.toLowerCase() ?? "";
  const kinds: string[] = [];
  if (LOOP_STEP_TYPES.has(type)) {
    if (type.includes("each") || asString(step.items) || asString(step.collection)) {
      kinds.push("for-each");
    }
    if (type.includes("while") || asString(step.condition)) kinds.push("while");
    if (type === "repeat" || typeof step.maxIterations === "number") kinds.push("repeat");
  }
  if (Array.isArray(step.steps)) {
    for (const child of step.steps as unknown[]) {
      if (child && typeof child === "object" && !Array.isArray(child)) {
        for (const nested of detectLoopKindsInStep(child as StepNode)) {
          if (!kinds.includes(nested)) kinds.push(nested);
        }
      }
    }
  }
  return kinds;
}

function collectStepPrompts(step: StepNode, out: string[]): void {
  const prompt = asString(step.prompt);
  if (prompt) out.push(prompt);
  if (Array.isArray(step.steps)) {
    for (const child of step.steps as unknown[]) {
      if (child && typeof child === "object" && !Array.isArray(child)) {
        collectStepPrompts(child as StepNode, out);
      }
    }
  }
}

function countStackSteps(step: StepNode): number {
  let count = 1;
  if (Array.isArray(step.steps)) {
    for (const child of step.steps as unknown[]) {
      if (child && typeof child === "object" && !Array.isArray(child)) {
        count += countStackSteps(child as StepNode);
      }
    }
  }
  return count;
}

function countAgentLoopSteps(flow: Record<string, unknown>): number {
  const steps = flow.steps;
  if (!Array.isArray(steps)) return 0;
  let count = 0;
  for (const step of steps as unknown[]) {
    if (step && typeof step === "object" && !Array.isArray(step)) {
      count += countStackSteps(step as StepNode);
    }
  }
  return count;
}

function detectFlowLoopKinds(flow: Record<string, unknown>): string[] {
  const steps = flow.steps;
  if (!Array.isArray(steps)) return [];
  const kinds: string[] = [];
  for (const step of steps as unknown[]) {
    if (step && typeof step === "object" && !Array.isArray(step)) {
      for (const kind of detectLoopKindsInStep(step as StepNode)) {
        if (!kinds.includes(kind)) kinds.push(kind);
      }
    }
  }
  return kinds;
}

function firstNodePrompt(flow: Record<string, unknown>): string | null {
  const steps = flow.steps;
  if (!Array.isArray(steps)) return null;
  const prompts: string[] = [];
  for (const step of steps as unknown[]) {
    if (step && typeof step === "object" && !Array.isArray(step)) {
      collectStepPrompts(step as StepNode, prompts);
      if (prompts.length > 0) break;
    }
  }
  return prompts[0] ?? null;
}

function parseAgentLoopFlow(source: OpenFlowSource, text: string) {
  const parsed = parseJsonc(text);
  if (!parsed) return null;
  const name = asString(parsed.name) ?? source.id.split("/").at(-1) ?? "untitled-flow";
  const rawDescription = asString(parsed.description);
  const firstPrompt = firstNodePrompt(parsed);
  const loopKinds = detectFlowLoopKinds(parsed);
  return {
    name,
    displayName: source.displayName ?? name,
    summary: rawDescription ?? (firstPrompt ? firstPrompt.slice(0, 160) : null),
    defaultTool: asString(parsed.defaultTool) ?? undefined,
    stepCount: countAgentLoopSteps(parsed),
    loopKinds,
  };
}

function countYamlNodes(document: Record<string, unknown>): number {
  const nodes = document.nodes;
  if (nodes && typeof nodes === "object") {
    const keys = Object.keys(nodes as Record<string, unknown>);
    if (keys.length > 0) return keys.length;
  }
  if (Array.isArray(nodes)) return nodes.length;
  if (Array.isArray(document.steps)) return document.steps.length;
  return 0;
}

function firstYamlPrompt(document: Record<string, unknown>): string | null {
  const nodes = document.nodes;
  const nodeList =
    nodes && typeof nodes === "object" ? Object.values(nodes as Record<string, unknown>) : [];
  for (const node of nodeList) {
    if (node && typeof node === "object" && !Array.isArray(node)) {
      const prompt = asString((node as Record<string, unknown>).prompt);
      if (prompt) return prompt;
    }
  }
  return null;
}

function parseFlowaiWorkflow(source: OpenFlowSource, text: string) {
  let document: unknown;
  try {
    document = parseYaml(text);
  } catch {
    return null;
  }
  if (!document || typeof document !== "object" || Array.isArray(document)) return null;
  const doc = document as Record<string, unknown>;
  const name =
    asString(doc.name) ?? source.displayName ?? source.id.split("/").at(-1) ?? "workflow";
  const firstPrompt = firstYamlPrompt(doc);
  const description = asString(doc.description) ?? (firstPrompt ? firstPrompt.slice(0, 160) : null);
  return {
    name,
    displayName: source.displayName ?? name,
    summary: description,
    stepCount: countYamlNodes(doc),
    loopKinds: [] as string[],
    defaultTool: undefined,
  };
}

export function parseOpenFlowSource(source: OpenFlowSource, text: string): OpenFlowEntry | null {
  const hasJsoncSuffix = JSONC_SOURCE_SUFFIXES.some((suffix) => source.path.endsWith(suffix));
  const hasYamlSuffix = YAML_SOURCE_SUFFIXES.some((suffix) => source.path.endsWith(suffix));
  const parsed = hasYamlSuffix
    ? parseFlowaiWorkflow(source, text)
    : hasJsoncSuffix
      ? parseAgentLoopFlow(source, text)
      : null;
  if (!parsed) return null;
  return {
    kind: source.kind,
    id: source.id,
    name: parsed.name,
    displayName: parsed.displayName,
    summary: parsed.summary,
    ...(parsed.defaultTool ? { defaultTool: parsed.defaultTool } : {}),
    stepCount: parsed.stepCount,
    loopKinds: parsed.loopKinds,
    topics: source.topics ?? [],
    source: {
      repo: source.repo,
      path: source.path,
      url: sourceRepoUrl(source),
    },
    updatedAt: Date.now(),
  };
}

export type OpenFlowsFetchResult = {
  items: OpenFlowEntry[];
  failed: string[];
  fallback: string[];
  total: number;
};

async function fetchRawText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "text/plain", "User-Agent": "coraltide-community-flow-catalog" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch and parse every open-source flow source. Each source is served from
 * live upstream content when possible; on live fetch/parse failure it falls
 * back to a bundled verified snapshot (`fallback` ids). Successful sources
 * are returned regardless of how many sister sources failed.
 */
export async function fetchOpenFlowsCatalog(options?: {
  timeoutMs?: number;
}): Promise<OpenFlowsFetchResult> {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const results = await Promise.allSettled(
    OPEN_FLOW_SOURCES.map(async (source) => {
      const text = await fetchRawText(rawUrlFor(source), timeoutMs);
      const entry = parseOpenFlowSource(source, text);
      if (!entry) throw new Error(`Failed to parse ${source.path}`);
      return entry;
    }),
  );

  const items: OpenFlowEntry[] = [];
  const failed: string[] = [];
  const fallback: string[] = [];
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index]!;
    const source = OPEN_FLOW_SOURCES[index]!;
    if (result.status === "fulfilled") {
      items.push(result.value);
      continue;
    }
    const bundledText = BUNDLED_OPEN_FLOW_TEXTS[source.id];
    if (bundledText) {
      const entry = parseOpenFlowSource(source, bundledText);
      if (entry) {
        items.push(entry);
        fallback.push(source.id);
        continue;
      }
    }
    failed.push(source.id);
  }

  return { items, failed, fallback, total: OPEN_FLOW_SOURCES.length };
}
