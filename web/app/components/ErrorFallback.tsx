"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "./I18nProvider";

type ErrorFallbackProps = {
  message: string;
  onRetry?: () => void;
  icon?: ReactNode;
};

function DefaultIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function ErrorFallback({ message, onRetry, icon }: ErrorFallbackProps) {
  const { t } = useI18n();
  return (
    <div role="alert" className="rounded-lg border border-foreground/10 bg-card p-8 text-center">
      <div className="mb-3 flex justify-center text-foreground/50">{icon ?? <DefaultIcon />}</div>
      <p className="text-foreground/70 mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm px-4 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
        >
          {t("common.actions.tryAgain")}
        </button>
      )}
      <p className="mt-4 text-sm text-foreground/50">
        <Link href="/help/troubleshooting" className="underline transition hover:text-foreground">
          Need help?
        </Link>
      </p>
    </div>
  );
}
