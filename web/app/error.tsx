"use client";

import { useEffect } from "react";
import Link from "next/link";
import ErrorPage from "./components/ErrorPage";

const ISSUES_URL = "https://github.com/Tim-cryptow/thesis-lock/issues/new";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      title="Something went wrong"
      description="An unexpected error occurred. You can try again, or head back home."
    >
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="px-5 py-2.5 rounded-md bg-heading text-background text-sm font-medium hover:opacity-90 press-scale"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-md border border-foreground/15 text-sm hover:border-foreground/40 transition"
        >
          Go home
        </Link>
        <a
          href={ISSUES_URL}
          target="_blank"
          rel="noreferrer"
          className="px-5 py-2.5 rounded-md border border-foreground/15 text-sm hover:border-foreground/40 transition"
        >
          Report this issue
        </a>
      </div>
      {process.env.NODE_ENV !== "production" && error.message ? (
        <pre className="mt-6 mx-auto max-w-xl overflow-auto rounded-lg border border-foreground/10 bg-card p-4 text-left text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
          {error.message}
        </pre>
      ) : null}
    </ErrorPage>
  );
}
