-- =============================================================================
-- CoralNest Unified Catalog Schema for CockroachDB (Clean & Lean 6-Tier Architecture)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FLOW_SKILLS TABLE (Primary prompt-based recipes & atomic capabilities)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flow_skills (
  id STRING PRIMARY KEY,                                -- e.g. "skill:code-review", "skill:react-best-practices"
  slug STRING UNIQUE NOT NULL,                          -- e.g. "code-review", "unit-test-generator"
  name STRING NOT NULL,                                 -- e.g. "Code Review Specialist"
  provider STRING NOT NULL DEFAULT 'skills.sh',         -- 'skills.sh', 'mcpservers.org', 'clawhub.ai'
  category STRING NOT NULL DEFAULT 'general',           -- 'development', 'research', 'media', 'security'
  topics STRING[] DEFAULT ARRAY[]::STRING[],            -- e.g. ['testing', 'typescript', 'react']
  summary STRING,                                       -- Markdown short overview
  prompt_content STRING NOT NULL,                       -- Full SKILL.md body & prompt instructions
  author_handle STRING NOT NULL DEFAULT 'openclaw',     -- Organization/author username
  source_repo STRING,                                   -- Upstream repository URL
  downloads INT8 NOT NULL DEFAULT 0,                    -- Total downloads/installs
  stars INT8 NOT NULL DEFAULT 0,                        -- Bookmarks/stars
  is_official BOOL NOT NULL DEFAULT false,              -- Official verified badge
  raw_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,      -- Manifest metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_flow_skills_provider ON flow_skills (provider);
CREATE INDEX IF NOT EXISTS idx_flow_skills_category ON flow_skills (category);
CREATE INDEX IF NOT EXISTS idx_flow_skills_author ON flow_skills (author_handle);
CREATE INDEX IF NOT EXISTS idx_flow_skills_downloads ON flow_skills (downloads DESC);
CREATE INDEX IF NOT EXISTS idx_flow_skills_stars ON flow_skills (stars DESC);

-- -----------------------------------------------------------------------------
-- 2. FLOW_LOOPS TABLE (Iterative & closed-loop execution recipes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flow_loops (
  id STRING PRIMARY KEY,                                -- e.g. "loop:100-percent-test-coverage"
  slug STRING UNIQUE NOT NULL,                          -- e.g. "100-percent-test-coverage-loop"
  name STRING NOT NULL,                                 -- e.g. "The 100% Test Coverage Loop"
  loop_kind STRING NOT NULL DEFAULT 'feedback-loop',    -- 'feedback-loop', 'step-verifier'
  max_iterations INT4 NOT NULL DEFAULT 10,              -- Max iterations before stopping
  exit_criteria STRING NOT NULL,                        -- Explicit rule condition for completion
  step_count INT4 NOT NULL DEFAULT 1,                   -- Step count
  step_definitions JSONB NOT NULL DEFAULT '[]'::JSONB,  -- Array of step configs & actions
  summary STRING,                                       -- Summary overview
  prompt_content STRING,                                -- Detailed loop prompt & instructions
  author_handle STRING DEFAULT 'forwardfuture',         -- Author handle
  category STRING NOT NULL DEFAULT 'operations',        -- 'engineering', 'operations', 'evaluation'
  topics STRING[] DEFAULT ARRAY[]::STRING[],            -- Tags
  downloads INT8 NOT NULL DEFAULT 0,
  stars INT8 NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_flow_loops_kind ON flow_loops (loop_kind);
CREATE INDEX IF NOT EXISTS idx_flow_loops_category ON flow_loops (category);

-- -----------------------------------------------------------------------------
-- 3. FLOW_GRAPHS TABLE (Multi-agent DAGs & state topologies)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flow_graphs (
  id STRING PRIMARY KEY,                                -- e.g. "graph:supervisor-worker-research"
  slug STRING UNIQUE NOT NULL,                          -- e.g. "supervisor-worker-research-graph"
  name STRING NOT NULL,                                 -- e.g. "Supervisor-Worker Research DAG"
  graph_type STRING NOT NULL DEFAULT 'dag',             -- 'dag', 'state-machine', 'router'
  entry_node STRING,                                    -- Starting node key
  nodes JSONB NOT NULL DEFAULT '[]'::JSONB,             -- Nodes definition
  edges JSONB NOT NULL DEFAULT '[]'::JSONB,             -- Transitions & conditions
  summary STRING,                                       -- Overview
  prompt_content STRING,                                -- Topology prompt & instructions
  author_handle STRING DEFAULT 'openclaw',              -- Author handle
  category STRING NOT NULL DEFAULT 'agents',
  topics STRING[] DEFAULT ARRAY[]::STRING[],
  downloads INT8 NOT NULL DEFAULT 0,
  stars INT8 NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- -----------------------------------------------------------------------------
-- 4. CONNECTORS TABLE (SaaS Integrations & Composio 2,000+ Actions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connectors (
  id STRING PRIMARY KEY,                                -- e.g. "connector:composio-slack"
  slug STRING UNIQUE NOT NULL,                          -- e.g. "composio-slack"
  name STRING NOT NULL,                                 -- e.g. "Slack Connector"
  provider STRING NOT NULL DEFAULT 'composio',          -- 'composio', 'native', 'custom'
  category STRING NOT NULL DEFAULT 'integrations',
  summary STRING,
  auth_type STRING DEFAULT 'oauth2',                    -- 'oauth2', 'api_key', 'bearer'
  actions_count INT4 NOT NULL DEFAULT 0,                -- Number of executable actions (e.g. 42)
  actions_schema JSONB NOT NULL DEFAULT '[]'::JSONB,    -- Full OpenAPI action parameters & endpoints
  topics STRING[] DEFAULT ARRAY[]::STRING[],
  downloads INT8 NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_connectors_provider ON connectors (provider);
CREATE INVERTED INDEX IF NOT EXISTS idx_connectors_actions ON connectors (actions_schema);

-- -----------------------------------------------------------------------------
-- 5. MCP SERVERS TABLE (Model Context Protocol Servers across the Web)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mcp_servers (
  id STRING PRIMARY KEY,                                -- e.g. "mcp:github", "mcp:postgres"
  slug STRING UNIQUE NOT NULL,
  name STRING NOT NULL,
  transport STRING NOT NULL DEFAULT 'stdio',            -- 'stdio', 'sse', 'websocket'
  repo_url STRING,                                      -- Upstream repository URL
  command STRING,                                       -- Execution command (e.g. "npx -y @modelcontextprotocol/server-github")
  tools_count INT4 NOT NULL DEFAULT 0,
  tools_manifest JSONB NOT NULL DEFAULT '[]'::JSONB,    -- JSON-RPC tool declarations
  topics STRING[] DEFAULT ARRAY[]::STRING[],
  downloads INT8 NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- -----------------------------------------------------------------------------
-- 6. PLUGINS TABLE (Installable Packages & Tool Bundles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plugins (
  id STRING PRIMARY KEY,                                -- e.g. "plugin:dev-tools"
  slug STRING UNIQUE NOT NULL,
  name STRING NOT NULL,
  version STRING NOT NULL DEFAULT '1.0.0',
  summary STRING,
  package_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,  -- package.json / manifest definition
  bundle_url STRING,                                    -- Downloadable tarball/WASM artifact
  downloads INT8 NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- -----------------------------------------------------------------------------
-- 7. PERSONAS TABLE (Complete "Freelancer" Agent Archetypes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas (
  id STRING PRIMARY KEY,                                -- e.g. "persona:devops-engineer"
  slug STRING UNIQUE NOT NULL,
  name STRING NOT NULL,                                 -- e.g. "Autonomous DevOps Lead"
  role STRING NOT NULL,                                 -- e.g. "Infrastructure & Kubernetes Specialist"
  avatar_url STRING,                                    -- Profile image/avatar
  system_prompt STRING NOT NULL,                        -- Core agent system prompt & instructions
  attached_flows STRING[] DEFAULT ARRAY[]::STRING[],    -- Array of flow/skill IDs
  attached_mcp STRING[] DEFAULT ARRAY[]::STRING[],      -- Array of MCP server IDs
  attached_connectors STRING[] DEFAULT ARRAY[]::STRING[], -- Array of connector IDs
  downloads INT8 NOT NULL DEFAULT 0,
  stars INT8 NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
