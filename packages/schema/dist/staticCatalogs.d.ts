/**
 * Static catalog datasets shared by the CoralNest web UI and the public API.
 *
 * Connectors are surfaced by Composio (redirect targets live on the
 * composio.dev product surface) and MCP servers are open-source reference
 * servers. Neither is stored in Convex; both are served to clients from
 * these arrays, so the UI and the `/api/v1/connectors` + `/api/v1/mcp`
 * endpoints always expose the same catalog.
 */
export type StaticCatalogFamily = "connectors" | "mcp";
export type StaticCatalogItem = {
    name: string;
    displayName: string;
    family: StaticCatalogFamily;
    channel: "official" | "community" | "private";
    isOfficial: boolean;
    summary?: string;
    ownerHandle?: string;
    createdAt: number;
    updatedAt: number;
    latestVersion?: string;
    categories?: string[];
    topics?: string[];
    verificationTier?: string;
    stats?: {
        downloads: number;
        installs: number;
        stars: number;
        versions: number;
    };
    /** Optional destination for `GET /api/v1/{family}/:name` 302 redirects. */
    entryUrl?: string;
};
export declare const COMPOSIO_CONNECTORS: StaticCatalogItem[];
export declare const OPEN_SOURCE_MCP_SERVERS: StaticCatalogItem[];
