"use client";

import { useEffect } from "react";
import Link from "next/link";
import ErrorPage from "./ErrorPage";
import RateLimitError from "./RateLimitError";

const RATE_LIMIT = /\b429\b|rate.?limit|too many requests/i;

type RouteErrorProps = {
  title: string;
  error: Error & { digest?: string };
  unstable_retry: () => void;
  backHref?: string;
  backLabel?: string;
};

// Shared body for the route-level error boundaries. Each error.tsx is a thin
// wrapper that sets the title and the contextual "back" link, so retry, logging,
// and dev error details stay consistent across routes.
export default function RouteError({
  title,
  error,
  unstable_retry,
  backHref = "/",
  backLabel = "Go home",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // A rate limit is transient, so show the dedicated auto-retrying view instead
  // of the generic error layout.
  if (RATE_LIMIT.test(error.message ?? "")) {
    return <RateLimitError onRetry={unstable_retry} />;
  }

  return (
    <ErrorPage
      title={title}
      description="We could not load this right now. The blockchain API may be busy. Try again in a moment."
    >
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="px-5 py-2.5 rounded-md bg-heading text-background text-sm font-medium hover:opacity-90 press-scale"
        >
          Try again
        </button>
        <Link
          href={backHref}
          className="px-5 py-2.5 rounded-md border border-foreground/15 text-sm hover:border-foreground/40 transition"
        >
          {backLabel}
        </Link>
      </div>
      {process.env.NODE_ENV !== "production" && error.message ? (
        <pre className="mt-6 mx-auto max-w-xl overflow-auto rounded-lg border border-foreground/10 bg-card p-4 text-left text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
          {error.message}
        </pre>
      ) : null}
    </ErrorPage>
  );
}
