import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  FOOTER_NAV_SECTIONS,
  FOOTER_PLATFORM_LINKS,
} from "../lib/nav-items";

const FOOTER_EASTER_ASCII = [
  "....:: coralnest ::....  skills publishers trust signals",
  ">>> install scan publish verify    @@ gateway @@ registry @@ agents @@",
  "  /api/v1/skills   /owners   /audit   /ship",
  ":::: signed manifests ::::: moderated releases ::::: version history ::::",
  "  hooks runners slash-commands skill.md templates scanners review-bots",
  "---- downloads installs stars lineage ownership docs package integrity",
  "  safe browse paths   verified gateways   publisher handles   org trust",
];
const FOOTER_EASTER_ASCII_FIELD = Array.from({ length: 44 }, (_, row) => {
  const a = FOOTER_EASTER_ASCII[row % FOOTER_EASTER_ASCII.length];
  const b = FOOTER_EASTER_ASCII[(row + 3) % FOOTER_EASTER_ASCII.length];
  const c = FOOTER_EASTER_ASCII[(row + 5) % FOOTER_EASTER_ASCII.length];
  return `${a}   ${b}   ${c}`;
}).join("\n");

function sectionId(title: string) {
  return `footer-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

const MOBILE_BREAKPOINT = 760;

function FooterGitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="footer-col-link-icon"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18.92-.26 1.9-.38 2.88-.39.98 0 1.96.13 2.88.39 2.19-1.49 3.15-1.18 3.15-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.08 0 4.42-2.69 5.39-5.25 5.67.42.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}



function FooterEasterBackdrop() {
  const easterRef = useRef<HTMLDivElement>(null);

  // Scroll-driven parallax: as the reveal area below the footer scrolls into
  // view, drift the composition into place for a depth effect. 0 = hidden
  // below the fold, 1 = fully revealed.
  useEffect(() => {
    const el = easterRef.current;
    if (!el) return undefined;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.style.setProperty("--footer-easter-reveal", "1");
      return undefined;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight || 1;
      const progress = (viewportH - rect.top) / (rect.height || viewportH);
      el.style.setProperty("--footer-easter-reveal", String(Math.max(0, Math.min(1, progress))));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--footer-easter-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--footer-easter-y", `${event.clientY - rect.top}px`);
    event.currentTarget.style.setProperty("--footer-easter-intensity", "1");
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--footer-easter-intensity", "0");
  };

  return (
    <div
      ref={easterRef}
      className="footer-v2-easter"
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="footer-v2-easter-image footer-v2-easter-image--base" />
      <pre className="footer-v2-easter-ascii">{FOOTER_EASTER_ASCII_FIELD}</pre>
      <div className="footer-v2-easter-image footer-v2-easter-image--top" />
    </div>
  );
}

export function Footer() {
  const [openSections, setOpenSections] = useState<ReadonlySet<string>>(() => new Set());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      setIsMobile(false);
      return () => {};
    }

    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleSection = (title: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const year = new Date().getFullYear();

  return (
    <footer className="site-footer site-footer-v2" role="contentinfo">
      <div className="site-footer-inner">
        <div className="footer-v2-main">
          <div className="footer-v2-brand">
            <Link to="/" className="footer-v2-brand-lockup">
              <span className="footer-v2-brand-name">CoralNest</span>
            </Link>
            <p className="footer-v2-brand-tagline">
              A fast skill registry for agents, with vector search.
            </p>
          </div>

          <div className="footer-grid">
            {FOOTER_NAV_SECTIONS.map((section) => {
              const isOpen = openSections.has(section.title);
              const id = sectionId(section.title);
              const ariaExpanded = isMobile ? isOpen : true;

              return (
                <div key={section.title} className="footer-col">
                  <h4 className="footer-col-title">
                    <button
                      type="button"
                      className="footer-col-toggle"
                      aria-controls={`${id}-links`}
                      aria-expanded={ariaExpanded}
                      onClick={() => {
                        if (isMobile) toggleSection(section.title);
                      }}
                    >
                      <span>{section.title}</span>
                      <ChevronDown
                        className="footer-col-toggle-icon"
                        size={16}
                        aria-hidden="true"
                      />
                    </button>
                  </h4>
                  <div className="footer-col-links" id={`${id}-links`} data-open={isOpen}>
                    {section.items
                      .filter((item) => item.featureFlag !== false)
                      .map((item) => {
                        if (item.kind === "link") {
                          return (
                            <Link key={item.label} to={item.to} search={item.search ?? {}}>
                              {item.label}
                            </Link>
                          );
                        }
                        if (item.kind === "external") {
                          return (
                            <a
                              key={item.label}
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              className={`footer-col-link-external${item.icon ? " footer-col-link-with-icon" : ""}`}
                            >
                              {item.icon === "github" ? <FooterGitHubIcon /> : null}
                              {item.label}
                              <ArrowUpRight
                                className="footer-col-link-external-icon"
                                size={12}
                                aria-hidden="true"
                              />
                            </a>
                          );
                        }
                        return <span key={item.label}>{item.label}</span>;
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="footer-v2-bottom">
          <p className="footer-v2-copy">
            © {year}{" "}
            <Link to="/" className="footer-v2-copy-link">
              CoralNest
            </Link>
          </p>
          <p className="footer-v2-meta">
            {FOOTER_PLATFORM_LINKS.map((link, index) => (
              <span key={link.label}>
                {index > 0 ? (
                  <span className="footer-v2-meta-sep" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="footer-col-link-external"
                >
                  {link.label}
                  <ArrowUpRight
                    className="footer-col-link-external-icon"
                    size={12}
                    aria-hidden="true"
                  />
                </a>
              </span>
            ))}
          </p>
        </div>
      </div>
      <FooterEasterBackdrop />
    </footer>
  );
}
