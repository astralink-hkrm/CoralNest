-- -----------------------------------------------------------------------------
-- CoralNest Registry Schema for Cloudflare D1 (5 GB Free SQL)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS registry_items (
  id TEXT PRIMARY KEY,                       -- e.g. "flow:skill:code-review", "mcp:github", "connector:composio-slack"
  slug TEXT UNIQUE NOT NULL,                 -- URL slug (e.g. "composio-slack")
  name TEXT NOT NULL,                        -- Display title
  type TEXT NOT NULL,                        -- 'flow', 'mcp', 'plugin', 'connector', 'persona'
  sub_type TEXT,                             -- 'skill', 'loop', 'graph' for flows
  summary TEXT,                              -- Short markdown/text description
  category TEXT NOT NULL DEFAULT 'other',    -- Category slug (e.g. 'automation', 'coding', 'integrations')
  topics TEXT NOT NULL DEFAULT '[]',         -- JSON string array of topic tags
  owner_handle TEXT,                         -- Publisher handle or organization
  source_repo TEXT,                          -- Upstream GitHub/GitLab repo URL
  downloads INTEGER NOT NULL DEFAULT 0,      -- Total download count
  stars INTEGER NOT NULL DEFAULT 0,          -- Community stars / bookmarks
  r2_payload_key TEXT,                       -- Key pointer to full raw JSON in Cloudflare R2
  is_official INTEGER NOT NULL DEFAULT 0,    -- 1 if official / verified
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fast Indexing for Instant Catalog Filtering & Sub-Millisecond Search
CREATE INDEX IF NOT EXISTS idx_registry_type ON registry_items (type);
CREATE INDEX IF NOT EXISTS idx_registry_category ON registry_items (category);
CREATE INDEX IF NOT EXISTS idx_registry_sub_type ON registry_items (sub_type);
CREATE INDEX IF NOT EXISTS idx_registry_downloads ON registry_items (downloads DESC);
CREATE INDEX IF NOT EXISTS idx_registry_stars ON registry_items (stars DESC);

-- -----------------------------------------------------------------------------
-- Personas Composition Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS persona_configs (
  persona_id TEXT PRIMARY KEY REFERENCES registry_items(id) ON DELETE CASCADE,
  system_prompt TEXT NOT NULL,
  attached_flows TEXT NOT NULL DEFAULT '[]',      -- JSON array of flow IDs
  attached_mcp TEXT NOT NULL DEFAULT '[]',        -- JSON array of MCP IDs
  attached_connectors TEXT NOT NULL DEFAULT '[]', -- JSON array of connector IDs
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
