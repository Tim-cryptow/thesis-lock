"use client";

import { useEffect, useId, useRef, useState } from "react";

type TooltipProps = {
  content: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  trigger?: "hover" | "click";
  // Accessible label for the trigger button.
  label?: string;
};

const PANEL_POSITION: Record<NonNullable<TooltipProps["position"]>, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const ARROW_POSITION: Record<NonNullable<TooltipProps["position"]>, string> = {
  top: "top-full left-1/2 -translate-x-1/2 -mt-1",
  bottom: "bottom-full left-1/2 -translate-x-1/2 -mb-1",
  left: "left-full top-1/2 -translate-y-1/2 -ml-1",
  right: "right-full top-1/2 -translate-y-1/2 -mr-1",
};

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 16v-4" />
      <path strokeLinecap="round" d="M12 8h.01" />
    </svg>
  );
}

export default function Tooltip({
  content,
  position = "top",
  trigger = "hover",
  label = "More information",
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  // For the click trigger, dismiss on outside click or Escape.
  useEffect(() => {
    if (trigger !== "click" || !open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [trigger, open]);

  const hoverHandlers =
    trigger === "hover"
      ? {
          onMouseEnter: () => setOpen(true),
          onMouseLeave: () => setOpen(false),
          onFocus: () => setOpen(true),
          onBlur: () => setOpen(false),
        }
      : {};

  return (
    <span ref={rootRef} className="relative inline-flex align-middle" {...hoverHandlers}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={trigger === "click" ? open : undefined}
        onClick={trigger === "click" ? () => setOpen((o) => !o) : undefined}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-foreground/45 transition hover:text-foreground"
      >
        <InfoIcon />
      </button>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={`absolute z-50 w-max max-w-[250px] rounded-md bg-zinc-900 px-2.5 py-1.5 text-left text-xs font-normal normal-case leading-snug tracking-normal text-zinc-50 shadow-lg ${PANEL_POSITION[position]}`}
        >
          {content}
          <span
            aria-hidden="true"
            className={`absolute h-2 w-2 rotate-45 bg-zinc-900 ${ARROW_POSITION[position]}`}
          />
        </span>
      ) : null}
    </span>
  );
}
