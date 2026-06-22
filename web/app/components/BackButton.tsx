"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getPreviousPage } from "@/lib/navigationHistory";

// A compact "back to the previous page" control shown beside the breadcrumbs on
// nested pages. It points at the most recent distinct page in the session
// history; with no history (a fresh tab opened straight onto a deep link) it
// falls back to the browser's own back, and it hides on the landing page.
export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [previous, setPrevious] = useState<{
    path: string;
    title: string;
  } | null>(null);

  // Read history on the client only, refreshing whenever the route changes so
  // the target reflects where the user actually came from.
  useEffect(() => {
    setPrevious(getPreviousPage());
  }, [pathname]);

  // Nothing meaningful to go back to from the landing page.
  if (pathname === "/") return null;

  const className =
    "inline-flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground transition";

  if (previous) {
    return (
      <Link href={previous.path} className={className}>
        <span aria-hidden="true">&larr;</span>
        Back to {previous.title}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} className={className}>
      <span aria-hidden="true">&larr;</span>
      Back
    </button>
  );
}
