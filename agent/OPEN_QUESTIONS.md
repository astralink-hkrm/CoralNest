# Open questions

## Category taxonomy — align with SPEC §6?
SPEC §6 defines a fixed taxonomy: `agents, prompt-engineering, rag, ai-workflows, llm-integrations, automation, ai-apis, mcp, memory, templates, datasets, evaluation, fine-tuning, deployment, tutorials`.

The current schema (from upstream ClawHub) has a different set: `integrations, automation, research, development, productivity, communication, creative, knowledge, agents, operations, security, finance, lifestyle, other`.

Only `agents` and `automation` overlap. Changing would:
- Break all existing skills with categories outside the SPEC §6 list
- Require a Convex data migration
- Potentially break the search UI and category filter components

Deferred in M4 — pending discussion about whether to align or keep the current taxonomy.

## Runtime dead fields still being written
- `publishedPackages` in publishers (convex/publishers.ts, publisherAbuse.ts)
- `activePluginsCount` in globalStats (convex/statsMaintenance.ts, lib/globalStats.ts)

These fields are no longer read by any skill-only feature. They can be cleaned up in a future sweep. The safest approach is to stop writing them (swap to writing `0` / `undefined`) rather than a destructive schema migration.

## Stale `Id<"packages">` / `Id<"packageReleases">` references
Several convex functions still reference these removed types. Deferred to convex/ test cleanup sweep since all convex tests are currently failing anyway from M1 deletions.
