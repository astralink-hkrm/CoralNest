import type { StaticCatalogItem } from "clawhub-schema/staticCatalogs";
import { COMPOSIO_CONNECTORS as SHARED_COMPOSIO_CONNECTORS } from "clawhub-schema/staticCatalogs";

/**
 * Shared Composio connector catalog. The data lives in `clawhub-schema` so
 * both the web UI (`packageApi.ts`) and the public HTTP API
 * (`convex/httpApiV1/staticCatalogsV1.ts`) serve the same dataset.
 */
export const COMPOSIO_CONNECTORS: StaticCatalogItem[] = SHARED_COMPOSIO_CONNECTORS;
