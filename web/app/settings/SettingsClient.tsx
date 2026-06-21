"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/app/components/Footer";
import DataManagement from "./DataManagement";
import PreferencesSection from "./PreferencesSection";

type SettingsTab = "data" | "preferences" | "privacy" | "about";

const TABS: { id: SettingsTab; label: string; hash: string }[] = [
  { id: "data", label: "Data Management", hash: "#data" },
  { id: "preferences", label: "Preferences", hash: "#preferences" },
  { id: "privacy", label: "Privacy", hash: "#privacy" },
  { id: "about", label: "About", hash: "#about" },
];

function tabFromHash(): SettingsTab | null {
  if (typeof window === "undefined") return null;
  const found = TABS.find((tab) => tab.hash === window.location.hash);
  return found ? found.id : null;
}

export default function SettingsClient() {
  const [tab, setTab] = useState<SettingsTab>("data");

  // The hash is only available in the browser, so the active tab is resolved
  // after mount and kept in sync with back/forward navigation.
  useEffect(() => {
    const initial = tabFromHash() ?? "data";
    setTab(initial);
    const onHashChange = () => {
      const next = tabFromHash();
      if (next) setTab(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const selectTab = useCallback((next: SettingsTab) => {
    setTab(next);
    const hash = TABS.find((entry) => entry.id === next)?.hash ?? "";
    // replaceState avoids the scroll jump a direct hash assignment causes.
    window.history.replaceState(null, "", hash || window.location.pathname);
  }, []);

  return (
    <>
      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            Back to app
          </Link>
          <Link href="/docs" className="text-foreground/60 hover:text-foreground">
            Docs
          </Link>
          <span className="text-foreground font-medium">Settings</span>
        </div>

        <header className="mt-8 mb-8">
          <h1 className="text-3xl mb-2">Settings</h1>
          <p className="text-foreground/70 max-w-2xl">
            ThesisLock keeps everything on your device. From here you can back up
            and restore your data, move it to another browser, fine-tune your
            preferences, and control exactly what is stored.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Settings sections"
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

        {tab === "data" ? <DataManagement /> : null}
        {tab === "preferences" ? <PreferencesSection /> : null}
        {tab === "privacy" ? <ComingInThisUpdate name="Privacy" /> : null}
        {tab === "about" ? <ComingInThisUpdate name="About" /> : null}
      </div>
      <Footer />
    </>
  );
}

// Temporary stand-in for sections wired up later in this update.
function ComingInThisUpdate({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-6 text-sm text-foreground/60">
      {name} settings are part of this update.
    </div>
  );
}
