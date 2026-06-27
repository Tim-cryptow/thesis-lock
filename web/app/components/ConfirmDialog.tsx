"use client";

import { useEffect, useId, useRef, useState } from "react";

export type ConfirmVariant = "danger" | "warning" | "info";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  // When set, the confirm button stays disabled until the user types this exact
  // word (for example "DELETE"), guarding the most destructive actions.
  requireType?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const CONFIRM_CLASSES: Record<ConfirmVariant, string> = {
  danger: "bg-red-600 hover:bg-red-700 text-white",
  warning: "bg-amber-500 hover:bg-amber-600 text-black",
  info: "bg-blue-600 hover:bg-blue-700 text-white",
};

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

// A modal confirmation dialog. Presentational and fully controlled: it renders
// nothing when closed, and reports the user's choice through onConfirm/onCancel.
// The promise-based useConfirm hook drives it for one-off confirmations.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "info",
  requireType,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [typed, setTyped] = useState("");
  const titleId = useId();
  const messageId = useId();

  // Clear the type-to-confirm field whenever the dialog opens or the required
  // word changes, so a stale value never pre-enables the confirm button.
  useEffect(() => {
    if (open) setTyped("");
  }, [open, requireType]);

  // While open: focus into the dialog, restore focus on close, close on Escape,
  // and keep Tab cycling within the dialog (a focus trap).
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const frame = window.requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;
      (getFocusable(card)[0] ?? card).focus();
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const focusable = getFocusable(card);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !card.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !card.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  const typeSatisfied = !requireType || typed === requireType;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        // Clicking the backdrop dismisses only the non-destructive info variant;
        // danger and warning require an explicit button press.
        if (e.target === e.currentTarget && variant === "info") onCancel();
      }}
    >
      <div
        ref={cardRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="w-full max-w-md rounded-lg border border-foreground/15 bg-card p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-medium">
          {title}
        </h2>
        <p id={messageId} className="mt-2 text-sm text-foreground/70">
          {message}
        </p>

        {requireType ? (
          <label className="mt-4 block text-sm">
            <span className="text-foreground/70">
              Type <span className="mono font-semibold text-foreground">{requireType}</span> to
              confirm.
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="mt-1.5 w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
          </label>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm text-foreground/70 transition hover:text-foreground"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!typeSatisfied}
            className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${CONFIRM_CLASSES[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
