"use client";

import { useEffect, useState } from "react";
import type { ProtocolStats } from "@/lib/stats";
import { instrumentedFetch } from "@/lib/fetchInstrumented";
import { useI18n } from "@/app/components/I18nProvider";

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default function HeroStats() {
  const { t } = useI18n();
  const [anchors, setAnchors] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    instrumentedFetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ProtocolStats | null) => {
        if (active && data) setAnchors(data.totalAnchors);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Until the live count resolves, the document figure stays understated rather
  // than flashing a zero that would read as "nothing anchored yet".
  const docs = anchors === null ? "" : `${formatNumber(anchors)} `;

  return (
    <p className="mt-10 text-sm text-foreground/60 font-mono">
      {t("landing.heroStats.contracts")}
      <span className="mx-2 text-foreground/30">&middot;</span>
      {docs}
      {t("landing.heroStats.documentsAnchored")}
      <span className="mx-2 text-foreground/30">&middot;</span>
      {t("landing.heroStats.clientSide")}
    </p>
  );
}
