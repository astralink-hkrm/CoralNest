import { type BaseType, type inferred } from "arktype";
export declare const MCP_SCHEMA_VERSION: 1;
export declare const MCP_SUMMARY_NAME_MAX_CHARS = 128;
export declare const MCP_SUMMARY_DESCRIPTION_MAX_CHARS = 1024;
export declare const MCP_MANIFEST_FILE_NAMES: readonly ["mcp.json", ".mcp.json"];
export declare const MCP_PACKAGE_JSON_FIELD: "openclaw.mcp";
export declare const McpManifestSchema: import("arktype/internal/variants/object.ts").ObjectType<{
    schemaVersion: 1;
    name: string;
    description?: string | undefined;
    transport: "sse" | "stdio" | "streamable-http";
    command?: string | undefined;
    args?: string[] | undefined;
    env?: {
        [x: string]: string;
    } | undefined;
    url?: string | undefined;
    headers?: {
        [x: string]: string;
    } | undefined;
    toolFilter?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    } | undefined;
    timeout?: number | undefined;
    connectTimeout?: number | undefined;
}, {}>;
export type McpManifest = (typeof McpManifestSchema)[inferred];
export type McpManifestSummary = {
    schemaVersion: 1;
    name: string;
    description?: string;
    transport: "stdio" | "sse" | "streamable-http";
    command?: string;
    url?: string;
    argCount: number;
    envCount: number;
    toolCount: number;
};
export type McpManifestSummarySchemaAdapter<TValue, TOptional = TValue> = {
    literalOne: TValue;
    string: TValue;
    number: TValue;
    boundedString: (maxCharacters: number) => TValue;
    optional: (schema: TValue) => TOptional;
    object: (fields: Record<string, TValue | TOptional>) => TValue;
};
/** Builds the v1 summary structure for both the public schema and durable storage validators. */
export declare function createMcpManifestSummarySchema<TValue, TOptional = TValue>(adapter: McpManifestSummarySchemaAdapter<TValue, TOptional>): TValue;
export declare const McpManifestSummarySchema: BaseType<McpManifestSummary>;
export declare const MCP_MANIFEST_VALIDATION_PHASE: "schema";
export declare const MCP_MANIFEST_VALIDATION_CODES: {
    readonly invalidManifestShape: "mcp_v1_invalid_manifest_shape";
    readonly invalidName: "mcp_v1_invalid_name";
    readonly nonCanonicalString: "mcp_v1_non_canonical_string";
    readonly invalidTransport: "mcp_v1_invalid_transport";
    readonly invalidCommand: "mcp_v1_invalid_command";
    readonly invalidMcpUrl: "mcp_v1_invalid_url";
    readonly mcpUrlCredentials: "mcp_v1_url_credentials";
    readonly timeoutsRequiredForRemote: "mcp_v1_timeouts_required_for_remote";
    readonly invalidToolFilter: "mcp_v1_invalid_tool_filter";
    readonly duplicateToolFilter: "mcp_v1_duplicate_tool_filter";
    readonly invalidEnvironmentKey: "mcp_v1_invalid_environment_key";
    readonly blockedEnvironmentKey: "mcp_v1_blocked_environment_key";
    readonly invalidEnvironmentValue: "mcp_v1_invalid_environment_value";
    readonly invalidTimeout: "mcp_v1_invalid_timeout";
};
export type McpManifestValidationCode = (typeof MCP_MANIFEST_VALIDATION_CODES)[keyof typeof MCP_MANIFEST_VALIDATION_CODES];
export type McpManifestValidationIssue = {
    code: McpManifestValidationCode;
    phase: typeof MCP_MANIFEST_VALIDATION_PHASE;
    path: string;
    message: string;
};
/** Validate an MCP v1 manifest (mcp.json). See clawhub-schema/src/mcp.ts. */
export declare function validateMcpManifest(value: unknown): {
    ok: true;
    manifest: McpManifest;
} | {
    ok: false;
    issues: McpManifestValidationIssue[];
};
export declare function summarizeMcpManifest(manifest: McpManifest): McpManifestSummary;
