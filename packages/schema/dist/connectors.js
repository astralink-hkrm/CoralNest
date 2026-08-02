import { ArkErrors, type } from "arktype";
// Connector manifests describe managed, agent-agnostic SaaS integrations
// (GitHub, Slack, Notion, ...). A connector captures how an agent connects to
// the service, who holds the credentials, and which scopes it exposes, so
// browse and install surfaces work across any agent host (Claude, Copilot,
// Composer, Codex, Gemini, OpenClaw, ...).
export const CONNECTOR_SCHEMA_VERSION = 1;
export const CONNECTOR_SUMMARY_NAME_MAX_CHARS = 128;
export const CONNECTOR_SUMMARY_DESCRIPTION_MAX_CHARS = 1_024;
export const CONNECTOR_MANIFEST_FILE_NAMES = ["connector.json", "connectors.json"];
export const CONNECTOR_PACKAGE_JSON_FIELD = "openclaw.connector";
const StrictStringArraySchema = type("string[]");
export const ConnectorManifestSchema = type({
    "+": "reject",
    schemaVersion: "1",
    id: "string",
    name: "string?",
    description: "string?",
    service: "string",
    transport: '"managed"|"mcp"|"http"|"sdk"',
    auth: '"managed"|"oauth2"|"api-key"|"none"',
    scopes: StrictStringArraySchema.optional(),
    targets: StrictStringArraySchema.optional(),
});
/** Builds the v1 summary structure for both the public schema and durable storage validators. */
export function createConnectorManifestSummarySchema(adapter) {
    return adapter.object({
        schemaVersion: adapter.literalOne,
        id: adapter.string,
        name: adapter.optional(adapter.boundedString(CONNECTOR_SUMMARY_NAME_MAX_CHARS)),
        description: adapter.optional(adapter.boundedString(CONNECTOR_SUMMARY_DESCRIPTION_MAX_CHARS)),
        service: adapter.string,
        transport: adapter.string,
        auth: adapter.string,
        scopeCount: adapter.number,
        targetCount: adapter.number,
    });
}
export const ConnectorManifestSummarySchema = createConnectorManifestSummarySchema({
    literalOne: type("1"),
    string: type("string"),
    number: type("number"),
    boundedString: (maxCharacters) => type("string").narrow((value) => Array.from(value).length <= maxCharacters),
    optional: (schema) => schema.optional(),
    object: (fields) => type({ "+": "reject", ...fields }),
});
export const CONNECTOR_MANIFEST_VALIDATION_PHASE = "schema";
export const CONNECTOR_MANIFEST_VALIDATION_CODES = {
    invalidManifestShape: "connector_v1_invalid_manifest_shape",
    invalidId: "connector_v1_invalid_id",
    nonCanonicalString: "connector_v1_non_canonical_string",
    invalidTransport: "connector_v1_invalid_transport",
    invalidAuth: "connector_v1_invalid_auth",
    emptyList: "connector_v1_empty_list",
    duplicateListEntry: "connector_v1_duplicate_list_entry",
};
const CONNECTOR_ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const CONNECTOR_TRANSPORTS = ["managed", "mcp", "http", "sdk"];
const CONNECTOR_AUTH_METHODS = ["managed", "oauth2", "api-key", "none"];
function isStrictNonEmpty(value) {
    return value.length > 0 && value === value.trim();
}
function validationIssue(code, path, message) {
    return { code, phase: CONNECTOR_MANIFEST_VALIDATION_PHASE, path, message };
}
function arkIssues(errors) {
    return Array.from(errors, (error) => validationIssue(CONNECTOR_MANIFEST_VALIDATION_CODES.invalidManifestShape, error.path.length > 0 ? `$.${error.path.join(".")}` : "$", error.description ?? "Manifest must match the strict Connector v1 shape."));
}
function pushNonEmpty(issues, path, value) {
    if (value !== undefined && !isStrictNonEmpty(value)) {
        issues.push(validationIssue(CONNECTOR_MANIFEST_VALIDATION_CODES.nonCanonicalString, path, "Must be non-empty without leading or trailing whitespace."));
    }
}
function pushList(issues, path, values, requireEntry) {
    if (requireEntry && values !== undefined && values.length === 0) {
        issues.push(validationIssue(CONNECTOR_MANIFEST_VALIDATION_CODES.emptyList, path, "Must contain at least one value."));
    }
    const seen = new Set();
    for (const [index, value] of (values ?? []).entries()) {
        pushNonEmpty(issues, `${path}.${index}`, value);
        if (seen.has(value)) {
            issues.push(validationIssue(CONNECTOR_MANIFEST_VALIDATION_CODES.duplicateListEntry, `${path}.${index}`, "Entries must be unique."));
        }
        seen.add(value);
    }
}
/** Validate a Connector v1 manifest (connector.json). */
export function validateConnectorManifest(value) {
    const parsed = ConnectorManifestSchema(value);
    if (parsed instanceof ArkErrors)
        return { ok: false, issues: arkIssues(parsed) };
    const issues = [];
    if (!CONNECTOR_ID_PATTERN.test(parsed.id)) {
        issues.push(validationIssue(CONNECTOR_MANIFEST_VALIDATION_CODES.invalidId, "$.id", "Invalid portable connector id."));
    }
    pushNonEmpty(issues, "$.name", parsed.name);
    pushNonEmpty(issues, "$.description", parsed.description);
    pushNonEmpty(issues, "$.service", parsed.service);
    if (!CONNECTOR_TRANSPORTS.includes(parsed.transport)) {
        issues.push(validationIssue(CONNECTOR_MANIFEST_VALIDATION_CODES.invalidTransport, "$.transport", `Must be one of: ${CONNECTOR_TRANSPORTS.join(", ")}.`));
    }
    if (!CONNECTOR_AUTH_METHODS.includes(parsed.auth)) {
        issues.push(validationIssue(CONNECTOR_MANIFEST_VALIDATION_CODES.invalidAuth, "$.auth", `Must be one of: ${CONNECTOR_AUTH_METHODS.join(", ")}.`));
    }
    pushList(issues, "$.scopes", parsed.scopes, false);
    pushList(issues, "$.targets", parsed.targets, true);
    return issues.length > 0 ? { ok: false, issues } : { ok: true, manifest: parsed };
}
function truncateSummaryText(value, maxChars) {
    if (!value)
        return undefined;
    return Array.from(value).slice(0, maxChars).join("");
}
export function summarizeConnectorManifest(manifest) {
    const name = truncateSummaryText(manifest.name, CONNECTOR_SUMMARY_NAME_MAX_CHARS);
    const description = truncateSummaryText(manifest.description, CONNECTOR_SUMMARY_DESCRIPTION_MAX_CHARS);
    return {
        schemaVersion: CONNECTOR_SCHEMA_VERSION,
        id: manifest.id,
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
        service: manifest.service,
        transport: manifest.transport,
        auth: manifest.auth,
        scopeCount: manifest.scopes?.length ?? 0,
        targetCount: manifest.targets?.length ?? 0,
    };
}
//# sourceMappingURL=connectors.js.map