import type { ReactNode } from "react";
import Link from "next/link";

type EmptyStateProps = {
  // A large icon shown at the top. Pass an EmptyStateIcon (or any node).
  icon: ReactNode;
  title: string;
  description: string;
  // Primary call to action. Use actionHref to navigate, or onAction for an
  // in-page action such as connecting a wallet or focusing a form.
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  // Optional secondary call to action, rendered as a quieter button or link.
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
};

const PRIMARY_CLASS =
  "inline-flex items-center rounded-md bg-heading px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50";
const SECONDARY_CLASS =
  "inline-flex items-center rounded-md border border-foreground/15 px-5 py-2.5 text-sm transition hover:border-foreground/40";

// A friendly, centered empty state: a large icon, a bold title, a muted
// explanation of what belongs here, and a clear call to action that points the
// user toward filling it.
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  actionDisabled,
  secondaryLabel,
  secondaryHref,
  onSecondary,
}: EmptyStateProps) {
  const hasPrimary = Boolean(actionLabel && (actionHref || onAction));
  const hasSecondary = Boolean(secondaryLabel && (secondaryHref || onSecondary));

  return (
    <div className="flex flex-col items-center rounded-lg border border-foreground/10 bg-card px-6 py-12 text-center">
      <div className="mb-4 text-foreground/35">{icon}</div>
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-foreground/60">{description}</p>

      {hasPrimary || hasSecondary ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {hasPrimary ? (
            actionHref ? (
              <Link href={actionHref} className={PRIMARY_CLASS}>
                {actionLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAction}
                disabled={actionDisabled}
                className={PRIMARY_CLASS}
              >
                {actionLabel}
              </button>
            )
          ) : null}

          {hasSecondary ? (
            secondaryHref ? (
              <Link href={secondaryHref} className={SECONDARY_CLASS}>
                {secondaryLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSecondary}
                className={SECONDARY_CLASS}
              >
                {secondaryLabel}
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
