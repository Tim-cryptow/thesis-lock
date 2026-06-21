"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AUDIT_CATEGORIES, type AuditCategory, logAudit } from "@/lib/audit";
import { AUDIT_EVENT, type AuditEventDetail } from "@/lib/auditEvents";
import { getStxAddress } from "@/lib/wallet";

function asCategory(value: string): AuditCategory {
  return (AUDIT_CATEGORIES as string[]).includes(value)
    ? (value as AuditCategory)
    : "system";
}

// Invisible component, mounted once in the layout. It records page navigation on
// its own and listens for dispatched audit events from across the app, writing
// each to the tamper-evident log. The actor is resolved live from the wallet at
// record time so it reflects the current connection regardless of which
// component triggered the action.
export default function AuditLogger() {
  const pathname = usePathname();

  // Page navigation: fires on first mount and on every client-side route change
  // (this component persists across navigations, so each change logs once).
  useEffect(() => {
    if (typeof window === "undefined") return;
    logAudit({
      action: "page_view",
      category: "system",
      actor: getStxAddress(),
      target: pathname,
      metadata: {},
      ipHash: null,
    });
  }, [pathname]);

  // Dispatched actions from the rest of the app.
  useEffect(() => {
    const onAudit = (event: Event) => {
      const detail = (event as CustomEvent<AuditEventDetail>).detail;
      if (!detail || typeof detail.action !== "string") return;
      // A wallet event carries its address in metadata (the live wallet may
      // already be cleared on disconnect); otherwise read the current actor.
      const fromMeta =
        detail.metadata && typeof detail.metadata.address === "string"
          ? (detail.metadata.address as string)
          : null;
      logAudit({
        action: detail.action,
        category: asCategory(detail.category),
        actor: fromMeta ?? getStxAddress(),
        target: detail.target ?? null,
        metadata: detail.metadata ?? {},
        ipHash: null,
      });
    };
    window.addEventListener(AUDIT_EVENT, onAudit as EventListener);
    return () =>
      window.removeEventListener(AUDIT_EVENT, onAudit as EventListener);
  }, []);

  return null;
}
