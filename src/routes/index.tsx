import { createFileRoute } from "@tanstack/react-router";
import { CoralPageWrapper } from "../components/CoralPageWrapper";
import { HomeCatalogSection } from "../components/home/HomeCatalogSection";
import { HomeRegistryTiers } from "../components/home/HomeRegistryTiers";
import { HomeAppsSection } from "../components/HomeAppsSection";
import { HomeBringSkillsSection } from "../components/HomeBringSkillsSection";
import { HomeV2FoldBottomFade } from "../components/HomeV2FoldBottomFade";

const FREELANCER_ANALOGY = [
  { concept: "Knowledge & Skillset", tier: "Skills" },
  { concept: "Work Methodology & Process", tier: "Loops & Graphs" },
  { concept: "Hardware & Local Toolbelt", tier: "MCP Servers" },
  { concept: "Client Passwords & SaaS Access", tier: "Connectors" },
  { concept: "Pre-Packaged Toolkit", tier: "Plugins" },
  { concept: "The Complete Specialist You Hire", tier: "Personas" },
] as const;

export const Route = createFileRoute("/")({
  component: CatalogHome,
});

function CatalogHome() {
  return (
    <CoralPageWrapper pageType="home">
      <main className="home-v2-main oc-app-surface">
        <HomeV2FoldBottomFade />

        {/* ═══ HERO ═══ */}
        <section className="home-v2-hero oc-hero">
          <div className="home-v2-hero-bg" aria-hidden="true" />

          <img
            src="/coral-logo.png"
            alt="CoralNest"
            className="home-v2-hero-logo"
            draggable={false}
          />

          <h1 className="home-v2-headline oc-hero-title">
            <span className="home-v2-action-word home-v2-static-headline">CoralNest</span>
          </h1>

          <p className="home-v2-sub oc-hero-lede">
            The premier open registry for AI agent flows, MCP servers, plugins, connectors, and
            personas
          </p>
        </section>

        <HomeRegistryTiers />

        {/* ═══ FREELANCER ANALOGY TABLE ═══ */}
        <section className="px-4 py-8">
          <table aria-label="Freelancer analogy" className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 pr-6 text-left font-semibold text-slate-300">
                  When a freelancer has…
                </th>
                <th className="py-3 text-left font-semibold text-slate-300">CoralNest calls it…</th>
              </tr>
            </thead>
            <tbody>
              {FREELANCER_ANALOGY.map((row) => (
                <tr key={row.concept} className="border-b border-slate-800">
                  <td className="py-3 pr-6 text-slate-400">{row.concept}</td>
                  <td className="py-3 font-medium text-white">{row.tier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <HomeCatalogSection
            type="skills"
            title="Top skills"
            subtitle="Atomic prompts, role guides, and reference workflows"
          />
          <HomeCatalogSection
            type="loops"
            title="Popular loops"
            subtitle="Iterative, closed-loop execution recipes"
            limit={4}
          />
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <HomeCatalogSection
            type="graphs"
            title="Featured graphs"
            subtitle="Stateful multi-agent topologies and routing logic"
            limit={4}
          />
          <HomeCatalogSection
            type="mcp_servers"
            title="Top MCP servers"
            subtitle="Real-time local tools, databases, and filesystem servers"
          />
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <HomeCatalogSection
            type="connectors"
            title="Popular connectors"
            subtitle="SaaS integrations with authenticated credentials and webhooks"
          />
          <HomeCatalogSection
            type="plugins"
            title="Top plugins"
            subtitle="Installable bundles of skills, MCP configs, and CLI helpers"
          />
        </div>

        <HomeAppsSection />
        <HomeBringSkillsSection />
      </main>
    </CoralPageWrapper>
  );
}

export default CatalogHome;
