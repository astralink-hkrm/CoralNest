import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

describe("production deploy workflow", () => {
  type WorkflowStep = {
    name?: string;
    env?: Record<string, string>;
    if?: string;
    run?: string;
  };

  type WorkflowJob = {
    env?: Record<string, string>;
    needs?: string | string[];
    permissions?: Record<string, string>;
    steps?: WorkflowStep[];
  };

  it("queues active deploys instead of cancelling them", async () => {
    const workflow = parseYaml(await readFile(".github/workflows/deploy.yml", "utf8")) as {
      concurrency?: {
        group?: string;
        "cancel-in-progress"?: boolean;
      };
    };

    expect(workflow.concurrency).toEqual({
      group: "deploy-production",
      "cancel-in-progress": false,
    });
  });

  it("scopes production permissions and outputs", async () => {
    const workflow = parseYaml(await readFile(".github/workflows/deploy.yml", "utf8")) as {
      permissions?: Record<string, string>;
      jobs?: Record<string, WorkflowJob>;
    };
    const deployJob = workflow.jobs?.["deploy-production"];
    const tagJob = workflow.jobs?.["tag-production-deployment"];

    expect(workflow.permissions).toEqual({});
    expect(deployJob?.permissions).toEqual({ contents: "read", statuses: "read" });
    expect(deployJob?.env).toEqual({ PLAYWRIGHT_BASE_URL: "https://clawhub.ai" });
    expect(tagJob?.permissions).toEqual({ contents: "write" });
    expect(tagJob?.needs).toEqual(["validate-deploy-request", "deploy-production"]);
  });
});
