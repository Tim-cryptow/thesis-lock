"use client";

import { useEffect, useState } from "react";
import { useI18n } from "./I18nProvider";

const DISMISS_KEY = "thesislock.pwa.dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // Non-fatal if localStorage is unavailable.
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const remember = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Non-fatal if localStorage is unavailable.
    }
  };

  const dismiss = () => {
    setVisible(false);
    remember();
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
    remember();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="rounded-lg border border-foreground/15 bg-card p-4 shadow-lg">
        <p className="text-sm text-foreground/80">{t("common.install.prompt")}</p>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md px-3 py-1.5 text-sm text-foreground/60 hover:text-foreground transition"
          >
            {t("common.actions.dismiss")}
          </button>
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-md bg-heading px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 transition"
          >
            {t("common.actions.install")}
          </button>
        </div>
      </div>
    </div>
  );
}
