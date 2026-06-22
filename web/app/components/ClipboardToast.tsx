"use client";

import { useEffect, useRef, useState } from "react";
import { CLIPBOARD_COPY_EVENT, type ClipboardCopyDetail } from "./CopyButton";

function truncate(value: string): string {
  if (value.length <= 28) return value;
  return `${value.slice(0, 16)}...${value.slice(-8)}`;
}

// A single global toast that confirms any copy action. It listens for the
// clipboard copy event dispatched by CopyButton (and the truncation
// components), shows the copied value briefly at the bottom center, and
// replaces any previous toast rather than stacking.
export default function ClipboardToast() {
  const [text, setText] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };

    const onCopy = (event: Event) => {
      const value = (event as CustomEvent<ClipboardCopyDetail>).detail?.value;
      if (!value) return;
      clearTimers();
      setText(truncate(value));
      // Mount hidden, then fade in on the next tick so the transition runs.
      setVisible(false);
      timers.current.push(window.setTimeout(() => setVisible(true), 10));
      timers.current.push(window.setTimeout(() => setVisible(false), 1500));
      timers.current.push(window.setTimeout(() => setText(null), 1800));
    };

    window.addEventListener(CLIPBOARD_COPY_EVENT, onCopy);
    return () => {
      window.removeEventListener(CLIPBOARD_COPY_EVENT, onCopy);
      clearTimers();
    };
  }, []);

  if (!text) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
    >
      <div
        className={`rounded-lg border border-foreground/10 bg-card px-4 py-2 text-sm shadow-lg transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        Copied: <span className="mono text-foreground/70">{text}</span>
      </div>
    </div>
  );
}
