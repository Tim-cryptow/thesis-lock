"use client";

import { useEffect, useState } from "react";
import type { ProtocolStats } from "@/lib/stats";

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default function HeroStats() {
  const [anchors, setAnchors] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/stats")
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
      5 smart contracts
      <span className="mx-2 text-foreground/30">&middot;</span>
      {docs}documents anchored
      <span className="mx-2 text-foreground/30">&middot;</span>
      100% client-side hashing
    </p>
  );
}
