import { describe, expect, it } from "vitest";
import { BUNDLED_OPEN_FLOW_TEXTS } from "./openFlowsBundled";
import {
  OPEN_FLOW_SOURCES,
  fetchOpenFlowsCatalog,
  parseOpenFlowSource,
  sourceRepoUrl,
  stripJsonc,
} from "./openFlowsCatalog";

describe("openFlowsCatalog JSONC parsing", () => {
  it("strips line comments, block comments, and trailing commas", () => {
    const input = `{
      // line comment
      /* block comment */
      "name": "demo", // trailing
      "nested": {
        "a": 1,
      },
    }`;
    expect(JSON.parse(stripJsonc(input))).toEqual({ name: "demo", nested: { a: 1 } });
  });

  it("keeps comment-like text inside string values", () => {
    const input = `{ "url": "https://example.com/#foo", "why": "he said \\"// x\\"" }`;
    const parsed = JSON.parse(stripJsonc(input)) as { url: string; why: string };
    expect(parsed.url).toBe("https://example.com/#foo");
    expect(parsed.why).toBe('he said "// x"');
  });

  it("parses real agent-loop-flow examples", () => {
    const source = OPEN_FLOW_SOURCES[0]!;
    const text = `{
  // Simple sequential flow example
  "$schema": "../flow-schema.json",
  "name": "simple-sequential",
  "description": "A simple flow that runs skills in sequence",
  "defaultTool": "opencode",
  "steps": [
    { "type": "skill", "name": "analyze", "skill": "code-analysis",
      "prompt": "Analyze the code in {{targetFile}}" },
  ],
}`;
    const entry = parseOpenFlowSource(source, text);
    expect(entry).not.toBeNull();
    expect(entry?.kind).toBe("graph");
    expect(entry?.id).toBe("agent-loop-flow/simple-sequential");
    expect(entry?.name).toBe("simple-sequential");
    expect(entry?.summary).toBe("A simple flow that runs skills in sequence");
    expect(entry?.stepCount).toBe(1);
    expect(entry?.defaultTool).toBe("opencode");
  });
});

describe("openFlowsCatalog loop detection", () => {
  it("detects for-each and while loop kinds", () => {
    const source = { ...OPEN_FLOW_SOURCES[1]! };
    const text = `{
  "name": "batch-process",
  "steps": [
    { "type": "for-each", "name": "process", "items": "files",
      "steps": [
        { "type": "skill", "skill": "linter", "prompt": "lint" },
        { "type": "skill", "skill": "formatter", "prompt": "format" },
      ] },
    { "type": "while-loop", "name": "retry", "condition": "retryEnabled", "maxIterations": 3,
      "steps": [ { "type": "skill", "skill": "runner", "prompt": "retry" } ] },
  ],
}`;
    const entry = parseOpenFlowSource(source, text);
    expect(entry?.kind).toBe("loop");
    expect(entry?.loopKinds).toContain("for-each");
    expect(entry?.loopKinds).toContain("while");
    expect(entry?.stepCount).toBe(5);
  });

  it("returns empty loop kinds for plain sequential flows", () => {
    const source = { ...OPEN_FLOW_SOURCES[0]! };
    const text = `{
  "name": "sequential",
  "steps": [
    { "type": "skill", "skill": "a", "prompt": "a prompt" },
    { "type": "skill", "skill": "b" },
  ],
}`;
    const entry = parseOpenFlowSource(source, text);
    expect(entry?.loopKinds).toEqual([]);
    expect(entry?.stepCount).toBe(2);
  });
});

describe("openFlowsCatalog YAML parsing", () => {
  it("parses a flowai-workflow YAML document into a graph entry", () => {
    const source = OPEN_FLOW_SOURCES[3]!;
    const text = `name: "Demo-sdlc"
version: "1"
phases:
  plan: [specification]
  impl: [implementation]
nodes:
  specification:
    type: agent
    label: "Project Manager"
    prompt: |
      Analyze the project state.
  implementation:
    type: agent
    label: "Developer"
    prompt: |
      Implement the spec.
`;
    const entry = parseOpenFlowSource(source, text);
    expect(entry?.kind).toBe("graph");
    expect(entry?.name).toBe("Demo-sdlc");
    expect(entry?.stepCount).toBe(2);
    expect(entry?.summary).toContain("Analyze the project state");
  });

  it("returns null for invalid yaml", () => {
    const source = { ...OPEN_FLOW_SOURCES[3]! };
    expect(parseOpenFlowSource(source, "nodes: [unclosed")).toBeNull();
  });
});

describe("openFlowsCatalog sources", () => {
  it("exposes a GitHub blob URL per source", () => {
    const entry = OPEN_FLOW_SOURCES[0]!;
    expect(sourceRepoUrl(entry)).toMatch(/^https:\/\/github\.com\//);
    expect(sourceRepoUrl(entry)).toContain(entry.repo);
    expect(sourceRepoUrl(entry)).toContain(entry.path);
  });

  it("remembers exactly the declared open-source flow sources", () => {
    const kinds = OPEN_FLOW_SOURCES.map((source) => source.kind);
    expect(kinds).toContain("loop");
    expect(kinds).toContain("graph");
  });

  it("serves every source from bundled snapshots when the live fetch fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("network down");
    };
    try {
      const result = await fetchOpenFlowsCatalog({ timeoutMs: 1 });
      expect(result.items.length).toBe(OPEN_FLOW_SOURCES.length);
      expect(result.fallback.length).toBe(OPEN_FLOW_SOURCES.length);
      expect(result.failed.length).toBe(0);
      expect(result.items.every((entry) => entry.summary !== undefined)).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("bundles a parseable verified snapshot for every declared source", () => {
    for (const source of OPEN_FLOW_SOURCES) {
      const text = BUNDLED_OPEN_FLOW_TEXTS[source.id];
      expect(text, `missing bundled snapshot for ${source.id}`).toBeDefined();
      const entry = parseOpenFlowSource(source, text!);
      expect(entry, `bundled snapshot for ${source.id} must parse`).not.toBeNull();
      expect(entry!.name.length).toBeGreaterThan(0);
    }
  });
});
