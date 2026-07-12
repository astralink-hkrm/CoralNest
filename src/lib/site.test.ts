/* @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getClawHubSiteUrl, normalizeCoralNestSiteOrigin } from "./site";

function withServerEnv<T>(values: Record<string, string | undefined>, run: () => T): T {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function clearSiteEnv() {
  delete process.env.VITE_SITE_URL;
}

beforeEach(() => {
  clearSiteEnv();
});

afterEach(() => {
  clearSiteEnv();
});

describe("site helpers", () => {
  it("normalizes origins", () => {
    expect(normalizeCoralNestSiteOrigin("https://example.com/some/path")).toBe("https://example.com");
  });

  it("returns null for missing or invalid origins", () => {
    expect(normalizeCoralNestSiteOrigin(null)).toBeNull();
    expect(normalizeCoralNestSiteOrigin(undefined)).toBeNull();
    expect(normalizeCoralNestSiteOrigin("")).toBeNull();
    expect(normalizeCoralNestSiteOrigin("not a url")).toBeNull();
  });

  it("returns default and env configured site URLs", () => {
    expect(getClawHubSiteUrl()).toBe("https://coralnest.ai");
    withServerEnv({ VITE_SITE_URL: "https://example.com" }, () => {
      expect(getClawHubSiteUrl()).toBe("https://example.com");
    });
    withServerEnv({ VITE_SITE_URL: "https://clawdhub.com" }, () => {
      expect(getClawHubSiteUrl()).toBe("https://clawhub.ai");
    });
    withServerEnv({ VITE_SITE_URL: "https://auth.clawdhub.com" }, () => {
      expect(getClawHubSiteUrl()).toBe("https://clawhub.ai");
    });
    withServerEnv({ VITE_SITE_URL: "not a url" }, () => {
      expect(getClawHubSiteUrl()).toBe("https://clawhub.ai");
    });
  });
});
