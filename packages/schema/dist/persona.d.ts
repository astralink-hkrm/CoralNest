import { type BaseType, type inferred } from "arktype";
export declare const PERSONA_SCHEMA_VERSION: 1;
export declare const PERSONA_SUMMARY_NAME_MAX_CHARS = 128;
export declare const PERSONA_SUMMARY_DESCRIPTION_MAX_CHARS = 1024;
export declare const PERSONA_MANIFEST_FILE_NAMES: readonly ["persona.json", "PERSONA.md"];
export declare const PERSONA_PACKAGE_JSON_FIELD: "openclaw.persona";
export declare const PersonaManifestSchema: import("arktype/internal/variants/object.ts").ObjectType<{
    schemaVersion: 1;
    id: string;
    name?: string | undefined;
    description?: string | undefined;
    identity?: {
        name?: string | undefined;
        theme?: string | undefined;
        emoji?: string | undefined;
        avatar?: string | undefined;
    } | undefined;
    traits?: string[] | undefined;
    instructions?: {
        source?: string | undefined;
        files?: string[] | undefined;
    } | undefined;
}, {}>;
export type PersonaManifest = (typeof PersonaManifestSchema)[inferred];
export type PersonaManifestSummary = {
    schemaVersion: 1;
    id: string;
    name?: string;
    description?: string;
    traitCount: number;
    instructionFileCount: number;
};
export type PersonaManifestSummarySchemaAdapter<TValue, TOptional = TValue> = {
    literalOne: TValue;
    string: TValue;
    number: TValue;
    boundedString: (maxCharacters: number) => TValue;
    optional: (schema: TValue) => TOptional;
    object: (fields: Record<string, TValue | TOptional>) => TValue;
};
/** Builds the v1 summary structure for both the public schema and durable storage validators. */
export declare function createPersonaManifestSummarySchema<TValue, TOptional = TValue>(adapter: PersonaManifestSummarySchemaAdapter<TValue, TOptional>): TValue;
export declare const PersonaManifestSummarySchema: BaseType<PersonaManifestSummary>;
export declare const PERSONA_MANIFEST_VALIDATION_PHASE: "schema";
export declare const PERSONA_MANIFEST_VALIDATION_CODES: {
    readonly invalidManifestShape: "persona_v1_invalid_manifest_shape";
    readonly invalidId: "persona_v1_invalid_id";
    readonly nonCanonicalString: "persona_v1_non_canonical_string";
    readonly emptyList: "persona_v1_empty_list";
    readonly invalidAvatar: "persona_v1_invalid_avatar";
};
export type PersonaManifestValidationCode = (typeof PERSONA_MANIFEST_VALIDATION_CODES)[keyof typeof PERSONA_MANIFEST_VALIDATION_CODES];
export type PersonaManifestValidationIssue = {
    code: PersonaManifestValidationCode;
    phase: typeof PERSONA_MANIFEST_VALIDATION_PHASE;
    path: string;
    message: string;
};
/** Validate a Persona v1 manifest. Persona contents are still being defined; shape stays strict. */
export declare function validatePersonaManifest(value: unknown): {
    ok: true;
    manifest: PersonaManifest;
} | {
    ok: false;
    issues: PersonaManifestValidationIssue[];
};
export declare function summarizePersonaManifest(manifest: PersonaManifest): PersonaManifestSummary;
