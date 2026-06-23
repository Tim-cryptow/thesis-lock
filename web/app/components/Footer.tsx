"use client";

import Link from "next/link";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import FooterStatus from "@/app/components/FooterStatus";
import SocialLinks from "@/app/components/SocialLinks";

const YEAR = 2026;

type FooterLink = { label: string; href: string };

const SECTIONS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Anchor", href: "/anchor" },
      { label: "Batch Anchor", href: "/anchor?mode=batch" },
      { label: "Verify", href: "/search" },
      { label: "Bulk Verify", href: "/verify-bulk" },
      { label: "Search", href: "/search" },
      { label: "Hash Matcher", href: "/match" },
    ],
  },
  {
    heading: "Protocol",
    links: [
      { label: "Stats", href: "/stats" },
      { label: "Feed", href: "/feed" },
      { label: "Explorer", href: "/explorer" },
      { label: "Groups", href: "/groups" },
      { label: "Calendar", href: "/calendar" },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "API Playground", href: "/developers" },
      { label: "SDK", href: "/docs/sdk" },
      { label: "CLI", href: "/docs/cli" },
      { label: "GitHub Action", href: "/docs/github-action" },
      { label: "Docs", href: "/docs" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "My Anchors", href: "/anchors" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Activity", href: "/activity" },
      { label: "Collections", href: "/collections" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-foreground/10 bg-card/40">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {SECTIONS.map((section) => (
            <nav key={section.heading} aria-label={section.heading}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                {section.heading}
              </h2>
              <ul className="space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-foreground/70 transition hover:text-foreground nav-underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-foreground/10 pt-6 text-sm text-foreground/60 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-foreground/70">
              Built on Stacks &middot; Secured by Bitcoin
            </span>
            <span className="text-foreground/50">&copy; {YEAR} ThesisLock</span>
            <div className="mt-1 flex items-center gap-3 text-xs">
              <Link
                href="/terms"
                className="text-foreground/55 transition hover:text-foreground nav-underline"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-foreground/55 transition hover:text-foreground nav-underline"
              >
                Privacy
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <SocialLinks size="sm" />
            <FooterStatus />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
