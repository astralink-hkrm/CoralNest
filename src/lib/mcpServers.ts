import type { StaticCatalogItem } from "clawhub-schema/staticCatalogs";
import { OPEN_SOURCE_MCP_SERVERS as SHARED_OPEN_SOURCE_MCP_SERVERS } from "clawhub-schema/staticCatalogs";

/**
 * Shared open-source MCP server catalog. The data lives in `clawhub-schema`
 * so both the web UI (`packageApi.ts`) and the public HTTP API
 * (`convex/httpApiV1/staticCatalogsV1.ts`) serve the same dataset.
 */
export const OPEN_SOURCE_MCP_SERVERS: StaticCatalogItem[] = SHARED_OPEN_SOURCE_MCP_SERVERS;
