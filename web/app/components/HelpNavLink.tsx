"use client";

import Link from "next/link";

// Fixed help icon mounted once in the root layout, in the top-right cluster
// alongside settings and notifications, so the help center is one tap from every
// page without a shared nav bar.
export default function HelpNavLink() {
  return (
    <Link
      href="/help"
      aria-label="Help"
      title="Help"
      className="fixed right-[11.75rem] top-2 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-card text-foreground/70 shadow-sm transition hover:border-foreground/30 hover:text-foreground"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </Link>
  );
}
