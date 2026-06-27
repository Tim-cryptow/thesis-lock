"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "./useConfirm";
import type { ConfirmVariant } from "./ConfirmDialog";

type UnsavedOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: ConfirmVariant;
};

// Warns before leaving the page while there is unsaved work. Hard navigations
// (refresh, tab close, browser back to another site) fall back to the native
// beforeunload prompt; in-app link clicks are intercepted and routed through the
// styled confirm dialog instead, so the warning is consistent within the app.
export function useUnsavedChanges(enabled: boolean, options: UnsavedOptions) {
  const router = useRouter();
  const confirm = useConfirm();
  const { title, message, confirmLabel, variant } = options;

  useEffect(() => {
    if (!enabled) return;

    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Some browsers still require returnValue to be set to show the prompt.
      e.returnValue = "";
    }

    function onClickCapture(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Ignore links that do not actually change the current route.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      // Take over the navigation: ask first, then route only if confirmed.
      e.preventDefault();
      e.stopPropagation();
      const target = url.pathname + url.search + url.hash;
      void confirm({
        title,
        message,
        confirmLabel: confirmLabel ?? "Leave",
        cancelLabel: "Stay",
        variant: variant ?? "warning",
      }).then((ok) => {
        if (!ok) return;
        window.removeEventListener("beforeunload", onBeforeUnload);
        router.push(target);
      });
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [enabled, title, message, confirmLabel, variant, router, confirm]);
}
