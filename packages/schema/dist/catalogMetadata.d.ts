export declare const CATALOG_CATEGORY_LIMIT = 3;
export declare const CATALOG_TOPIC_LIMIT = 5;
export declare const CATALOG_TOPIC_MAX_LENGTH = 48;
export declare const INTERNAL_UNCATEGORIZED_CATEGORY = "other";
export declare const RESERVED_CATALOG_TOPIC_SLUGS: readonly ["approved", "audited", "certified", "clawhub", "community", "curated", "endorsed", "featured", "official", "officials", "openclaw", "recommended", "staff-pick", "trusted", "trusted-publisher", "verified"];
export declare const SKILL_CATEGORY_DEFINITIONS: readonly [{
    readonly slug: "integrations";
    readonly label: "Integrations";
    readonly icon: "plug";
    readonly description: "Connect services, fetch data, reconcile records, and operate APIs.";
    readonly keywords: readonly ["api", "data", "database", "integration", "fetch", "http", "graphql"];
}, {
    readonly slug: "automation";
    readonly label: "Automation";
    readonly icon: "zap";
    readonly description: "Build repeatable processes, scheduled jobs, pipelines, and orchestration.";
    readonly keywords: readonly ["automation", "automate", "workflow", "workflows", "cron", "schedule", "pipeline", "orchestrate"];
}, {
    readonly slug: "research";
    readonly label: "Research";
    readonly icon: "globe";
    readonly description: "Search, browse, scrape, summarize, monitor, and extract web information.";
    readonly keywords: readonly ["web", "browser", "search", "scrape", "research", "crawl", "rss"];
}, {
    readonly slug: "development";
    readonly label: "Development";
    readonly icon: "wrench";
    readonly description: "Inspect, edit, test, build, debug, and operate codebases.";
    readonly keywords: readonly ["developer", "debug", "lint", "test", "build", "code", "git", "repo"];
}, {
    readonly slug: "productivity";
    readonly label: "Productivity";
    readonly icon: "list-checks";
    readonly description: "Manage tasks, calendars, email, meetings, projects, and business work.";
    readonly keywords: readonly ["task", "todo", "calendar", "email", "meeting", "project", "productivity"];
}, {
    readonly slug: "communication";
    readonly label: "Communication";
    readonly icon: "message-circle";
    readonly description: "Message, publish, and operate social or communication services.";
    readonly keywords: readonly ["message", "social", "discord", "slack", "telegram", "whatsapp", "chat"];
}, {
    readonly slug: "creative";
    readonly label: "Creative";
    readonly icon: "palette";
    readonly description: "Create and edit images, video, audio, music, design, and writing.";
    readonly keywords: readonly ["image", "video", "audio", "music", "design", "creative", "writing"];
}, {
    readonly slug: "knowledge";
    readonly label: "Knowledge";
    readonly icon: "book-open";
    readonly description: "Work with documents, notes, knowledge bases, teaching, and learning.";
    readonly keywords: readonly ["document", "docs", "pdf", "notes", "knowledge", "study", "learning"];
}, {
    readonly slug: "agents";
    readonly label: "Agents";
    readonly icon: "brain";
    readonly description: "Change how an agent plans, reflects, learns, remembers, or collaborates.";
    readonly keywords: readonly ["agent", "memory", "planning", "reflect", "reasoning", "context"];
}, {
    readonly slug: "operations";
    readonly label: "Operations";
    readonly icon: "activity";
    readonly description: "Inspect, monitor, deploy, and operate local systems or infrastructure.";
    readonly keywords: readonly ["deploy", "observability", "monitor", "infrastructure", "filesystem", "shell", "terminal"];
}, {
    readonly slug: "security";
    readonly label: "Security";
    readonly icon: "shield";
    readonly description: "Audit, scan, authenticate, and protect systems or data.";
    readonly keywords: readonly ["security", "audit", "scan", "auth", "encrypt", "policy", "secret"];
}, {
    readonly slug: "finance";
    readonly label: "Finance";
    readonly icon: "wallet-cards";
    readonly description: "Work with payments, budgets, banking, shopping, markets, and commerce.";
    readonly keywords: readonly ["finance", "payment", "budget", "bank", "shopping", "market", "commerce"];
}, {
    readonly slug: "lifestyle";
    readonly label: "Lifestyle";
    readonly icon: "shapes";
    readonly description: "Travel, health, fitness, cooking, sports, home, and daily-life utilities.";
    readonly keywords: readonly ["travel", "health", "fitness", "cooking", "sports", "weather", "home"];
}, {
    readonly slug: "other";
    readonly label: "Other";
    readonly icon: "package";
    readonly description: "Skills that do not yet fit another browse category.";
    readonly keywords: readonly [];
}];
export type SkillCategorySlug = (typeof SKILL_CATEGORY_DEFINITIONS)[number]["slug"];
export declare const SKILL_CATEGORY_SLUGS: ("agents" | "automation" | "communication" | "creative" | "development" | "finance" | "integrations" | "knowledge" | "lifestyle" | "operations" | "other" | "productivity" | "research" | "security")[];
export declare function isSkillCategorySlug(value: string | null | undefined): value is SkillCategorySlug;
export declare function normalizeSkillCategories(values: readonly string[] | null | undefined): SkillCategorySlug[];
export declare function resolveSkillCategories(input: {
    declared?: readonly string[] | null;
    inferred?: readonly string[] | null;
}): SkillCategorySlug[];
export declare function inferSkillCategories(input: {
    slug?: string | null;
    displayName?: string | null;
    summary?: string | null;
}): SkillCategorySlug[];
export declare function normalizeCatalogTopic(value: string): string | undefined;
export declare function normalizeCatalogTopics(values: readonly string[] | null | undefined): string[];
export declare function normalizeInferredCatalogTopics(values: readonly string[] | null | undefined): string[];
export declare function resolveCatalogTopics(input: {
    declared?: readonly string[] | null;
    inferred?: readonly string[] | null;
    inferenceCurrent?: boolean;
}): string[];
export declare function getCatalogTopicSlugs(values: readonly string[] | null | undefined): string[];
type SkillCategoryCandidate = {
    categories?: readonly string[] | null;
    inferredCategories?: readonly string[] | null;
    latestVersionId?: string | null;
    inferredFromVersionId?: string | null;
    slug: string;
    displayName: string;
    summary?: string | null;
};
export declare function resolveStoredSkillCategories(skill: SkillCategoryCandidate): SkillCategorySlug[];
export {};
