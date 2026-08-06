<p align="center">
  <img src="public/coral-logo.png" alt="CoralNest Logo" width="140">
</p>

<h1 align="center">🪸 CoralNest</h1>

<p align="center">
  <strong>The Premier Open Registry for AI Agent Skills, Plugins, Connectors, MCP Servers, and Personas</strong>
</p>

<p align="center">
  <img src="public/coral-bg.jpg" alt="CoralNest Banner" width="100%" style="border-radius: 12px; max-height: 280px; object-fit: cover;">
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-0284c7.svg?style=for-the-badge" alt="MIT License"></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Runtime-Bun-fbf0df?style=for-the-badge&logo=bun" alt="Bun"></a>
  <a href="https://convex.dev"><img src="https://img.shields.io/badge/Backend-Convex-ff5252?style=for-the-badge" alt="Convex"></a>
  <a href="https://typescriptlang.org"><img src="https://img.shields.io/badge/Language-TypeScript-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript"></a>
</p>

---

## 🌊 Overview

**CoralNest** is a high-performance, unified public registry for modern AI agent ecosystems. It provides seamless discovery, versioning, vector search, and installation for text-based agent skills, native code plugins, API connectors, Model Context Protocol (MCP) servers, and agent personas.

Whether you're developing autonomous agents, building custom toolchains, or hosting enterprise MCP servers, CoralNest provides a CLI-friendly API and a modern web interface powered by TanStack Start and Convex.

---

## 🎨 Ecosystem Registries & Color Identity

CoralNest categorizes agent capabilities into five dedicated registries, each with distinct color branding:

| Registry | Icon Logo | Description |
| :--- | :---: | :--- |
| **Skills** | <img src="public/coral-logo-olive.png" width="28"> | Text-based prompt instructions, workflows, and `SKILL.md` packs |
| **Plugins** | <img src="public/coral-logo-purple.png" width="28"> | Executable code modules, WASM bundles, and extension packages |
| **Connectors** | <img src="public/coral-logo-orange.png" width="28"> | Third-party API integrations, webhook handlers, and auth tunnels |
| **Personas** | <img src="public/coral-logo-pink.png" width="28"> | Agent identity profiles, prompt personas, and specialized system prompts |
| **MCP Servers** | <img src="public/coral-logo-red.png" width="28"> | Model Context Protocol servers for extended real-time LLM tools |

---

## ✨ Key Features

- **Unified Catalog**: Single entry point to browse, search, and inspect skills, plugins, connectors, MCP servers, and personas.
- **Embedding & Vector Search**: OpenAI vector embeddings (`text-embedding-3-small`) combined with Convex vector search for semantic discovery.
- **Version Control & Package History**: Publish new versions with semver tags (`latest`), changelogs, and atomic releases.
- **Pin & Lock Installs**: Freeze local skill/plugin versions to prevent unwanted overwrites during auto-updates.
- **Moderation & Security Verification**: Built-in automated security scanners, staff approval flows, and permission gating.
- **CLI & REST API Integration**: CLI tool for quick terminal search, installation, version management, and remote device auth.

---

## 🛠️ Technology Stack

- **Frontend**: TanStack Start (React 19, Vite, Nitro server engine).
- **Backend & Database**: [Convex](https://convex.dev) (Real-time DB, file storage, HTTP actions, Convex Auth).
- **Search Engine**: Convex Vector Search + OpenAI Embeddings.
- **Language & Tooling**: TypeScript (Strict ESM), Bun runtime, Biome & Oxlint.

---

## 💻 CLI Commands

Common CLI operations for managing your CoralNest packages:

```bash
# Authentication
coralnest login
coralnest whoami
coralnest login --device

# Discovery & Catalog Exploration
coralnest search "database automation"
coralnest explore
coralnest package inspect @coral/github-connector

# Managing Local Packages & Skills
coralnest install @coral/pdf-parser
coralnest pin pdf-parser
coralnest unpin pdf-parser
coralnest update --all
coralnest list

# Publishing Packages & Skills
coralnest skill publish ./my-skill
coralnest package publish ./my-plugin
```

---

## 🚀 Local Development Setup

### Prerequisites
- [Bun](https://bun.sh/) (v1.1+)
- Node.js 20+

### Step-by-Step Setup

After pulling this repo, run these commands in order:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/astralink-hkrm/CoralNest.git
   cd CoralNest
   ```

2. **Install dependencies**:
   The repo ships an `only-allow` preinstall hook. If plain `bun install` fails on it, use:
   ```bash
   bun install --ignore-scripts
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   You can run against the hosted public backend by filling in `VITE_CONVEX_URL`
   (plus the matching `VITE_CONVEX_SITE_URL` / `CONVEX_SITE_URL`), or run a local
   Convex deployment with `bunx convex dev`.

4. **Start Local Backend (Convex)** — only needed if you are NOT using the hosted backend:
   ```bash
   bunx convex dev --typecheck=disable
   ```

5. **Start Web App**:
   ```bash
   bun run dev
   ```
   *The app will be available at `http://localhost:3000`.*

6. **Seed Test Fixtures & Sample Corpus** — local/dev fixtures only, never on production:
   ```bash
   bun run seed:dev
   ```

---

## 📁 Repository Structure

```
CoralNest/
├── src/                    # TanStack Start application (routes, components, styles)
│   ├── components/         # Shared UI components (CoralPageWrapper, Header, Footer)
│   ├── routes/             # Route pages (index, skills, plugins, connectors, mcp, persona)
│   ├── design-system.css   # Carapace design tokens & typography
│   └── styles.css          # Application layout styles
├── convex/                 # Convex backend functions, schema, auth, and HTTP API
├── packages/               # Workspace packages (clawhub CLI, admin tools, schema)
├── public/                 # Static assets, coral logo variants, and background images
├── docs/                   # Public documentation & guides
└── specs/                  # Product specifications & architectural intent
```

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
