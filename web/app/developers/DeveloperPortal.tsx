"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import Footer from "@/app/components/Footer";
import { useI18n } from "@/app/components/I18nProvider";
import PlaygroundClient from "./PlaygroundClient";
import ApiKeysClient from "./ApiKeysClient";
import IntegrationGuidesClient, {
  type GuideTabId,
} from "./IntegrationGuidesClient";
import QuickStartGuide from "./QuickStartGuide";

type PortalTab = "playground" | "keys" | "guides";

const TABS: { id: PortalTab; label: string; hash: string }[] = [
  { id: "playground", label: "Playground", hash: "#playground" },
  { id: "keys", label: "API Keys", hash: "#keys" },
  { id: "guides", label: "Integration Guides", hash: "#guides" },
];

const STORAGE_KEY = "thesislock_dev_tab";

function tabFromHash(): PortalTab | null {
  if (typeof window === "undefined") return null;
  const found = TABS.find((tab) => tab.hash === window.location.hash);
  return found ? found.id : null;
}

function storedTab(): PortalTab | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return TABS.some((tab) => tab.id === raw) ? (raw as PortalTab) : null;
  } catch {
    return null;
  }
}

export default function DeveloperPortal() {
  const { t } = useI18n();
  const [tab, setTab] = useState<PortalTab>("playground");
  const [guideTab, setGuideTab] = useState<GuideTabId>("javascript");

  // The hash and sessionStorage are only available in the browser, so the
  // active tab is resolved after mount rather than during the initial render.
  useEffect(() => {
    const initial = tabFromHash() ?? storedTab() ?? "playground";
    setTab(initial);
    const onHashChange = () => {
      const next = tabFromHash();
      if (next) setTab(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const selectTab = useCallback((next: PortalTab) => {
    setTab(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is best-effort.
    }
    const hash = TABS.find((entry) => entry.id === next)?.hash ?? "";
    // replaceState avoids the scroll jump a direct hash assignment causes.
    window.history.replaceState(null, "", hash || window.location.pathname);
  }, []);

  return (
    <>
      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="order-last ml-auto">
            <ThemeToggle />
          </div>
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.back")}
          </Link>
          <Link
            href="/docs"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.docs")}
          </Link>
          <Link
            href="/docs/api"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.api")}
          </Link>
          <span className="text-foreground font-medium">Developers</span>
        </div>

        <header className="mt-8 mb-8">
          <h1 className="text-3xl mb-2">Developer Portal</h1>
          <p className="text-foreground/70 max-w-2xl">
            API playground, key management, and integration guides for building
            on ThesisLock.
          </p>
          <p className="text-foreground/70 max-w-2xl mt-2">
            Optimizing or debugging? The{" "}
            <Link
              href="/performance"
              className="underline hover:text-foreground"
            >
              performance dashboard
            </Link>{" "}
            tracks Web Vitals, page load, and API response times in your browser.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Developer portal sections"
          className="mb-8 flex flex-wrap gap-1 border-b border-foreground/10"
        >
          {TABS.map((entry) => {
            const active = entry.id === tab;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(entry.id)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
                  active
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-foreground/60 hover:text-foreground"
                }`}
              >
                {entry.label}
              </button>
            );
          })}
        </div>

        {tab === "playground" ? <PlaygroundClient /> : null}
        {tab === "keys" ? <ApiKeysClient /> : null}
        {tab === "guides" ? (
          <div className="flex flex-col gap-8">
            <QuickStartGuide onLearnMore={setGuideTab} />
            <IntegrationGuidesClient
              activeTab={guideTab}
              onTabChange={setGuideTab}
            />
          </div>
        ) : null}
      </div>
      <Footer />
    </>
  );
}
