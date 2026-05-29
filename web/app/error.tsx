"use client";

import { useEffect } from "react";
import Link from "next/link";

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
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <Link
        href="/"
        className="text-sm text-foreground/60 hover:text-foreground"
      >
        &larr; ThesisLock
      </Link>
      <h1 className="text-3xl mt-8 mb-2">Something went wrong.</h1>
      <p className="text-foreground/70 mb-6">
        An unexpected error occurred. You can try again.
      </p>
      <button
        onClick={() => unstable_retry()}
        className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
      >
        Try again
      </button>
    </div>
  );
}
