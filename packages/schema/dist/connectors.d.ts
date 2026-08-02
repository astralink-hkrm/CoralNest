import { type BaseType, type inferred } from "arktype";
export declare const CONNECTOR_SCHEMA_VERSION: 1;
export declare const CONNECTOR_SUMMARY_NAME_MAX_CHARS = 128;
export declare const CONNECTOR_SUMMARY_DESCRIPTION_MAX_CHARS = 1024;
export declare const CONNECTOR_MANIFEST_FILE_NAMES: readonly ["connector.json", "connectors.json"];
export declare const CONNECTOR_PACKAGE_JSON_FIELD: "openclaw.connector";
export declare const ConnectorManifestSchema: import("arktype/internal/variants/object.ts").ObjectType<{
    schemaVersion: 1;
    id: string;
    name?: string | undefined;
    description?: string | undefined;
    service: string;
    transport: "http" | "managed" | "mcp" | "sdk";
    auth: "api-key" | "managed" | "none" | "oauth2";
    scopes?: string[] | undefined;
    targets?: string[] | undefined;
}, {}>;
export type ConnectorManifest = (typeof ConnectorManifestSchema)[inferred];
export type ConnectorManifestSummary = {
    schemaVersion: 1;
    id: string;
    name?: string;
    description?: string;
    service: string;
    transport: "managed" | "mcp" | "http" | "sdk";
    auth: "managed" | "oauth2" | "api-key" | "none";
    scopeCount: number;
    targetCount: number;
};
export type ConnectorManifestSummarySchemaAdapter<TValue, TOptional = TValue> = {
    literalOne: TValue;
    string: TValue;
    number: TValue;
    boundedString: (maxCharacters: number) => TValue;
    optional: (schema: TValue) => TOptional;
    object: (fields: Record<string, TValue | TOptional>) => TValue;
};
/** Builds the v1 summary structure for both the public schema and durable storage validators. */
export declare function createConnectorManifestSummarySchema<TValue, TOptional = TValue>(adapter: ConnectorManifestSummarySchemaAdapter<TValue, TOptional>): TValue;
export declare const ConnectorManifestSummarySchema: BaseType<ConnectorManifestSummary>;
export declare const CONNECTOR_MANIFEST_VALIDATION_PHASE: "schema";
export declare const CONNECTOR_MANIFEST_VALIDATION_CODES: {
    readonly invalidManifestShape: "connector_v1_invalid_manifest_shape";
    readonly invalidId: "connector_v1_invalid_id";
    readonly nonCanonicalString: "connector_v1_non_canonical_string";
    readonly invalidTransport: "connector_v1_invalid_transport";
    readonly invalidAuth: "connector_v1_invalid_auth";
    readonly emptyList: "connector_v1_empty_list";
    readonly duplicateListEntry: "connector_v1_duplicate_list_entry";
};
export type ConnectorManifestValidationCode = (typeof CONNECTOR_MANIFEST_VALIDATION_CODES)[keyof typeof CONNECTOR_MANIFEST_VALIDATION_CODES];
export type ConnectorManifestValidationIssue = {
    code: ConnectorManifestValidationCode;
    phase: typeof CONNECTOR_MANIFEST_VALIDATION_PHASE;
    path: string;
    message: string;
};
/** Validate a Connector v1 manifest (connector.json). */
export declare function validateConnectorManifest(value: unknown): {
    ok: true;
    manifest: ConnectorManifest;
} | {
    ok: false;
    issues: ConnectorManifestValidationIssue[];
};
export declare function summarizeConnectorManifest(manifest: ConnectorManifest): ConnectorManifestSummary;
