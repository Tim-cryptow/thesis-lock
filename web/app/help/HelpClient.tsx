"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HELP_CATEGORIES } from "@/lib/help";

export default function HelpClient() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_CATEGORIES;
    return HELP_CATEGORIES.filter(
      (cat) => cat.title.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Help Center</h1>
      <p className="mt-4 text-lg text-foreground/80 leading-relaxed">
        Answers, step-by-step guides, and fixes for common problems, so you can get unstuck without
        leaving the app.
      </p>

      <label htmlFor="help-search" className="sr-only">
        Search help topics
      </label>
      <input
        id="help-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search help topics..."
        className="mt-8 w-full rounded-lg border border-foreground/15 bg-card px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-foreground/60">
          No help topics match &ldquo;{query.trim()}&rdquo;. Try the{" "}
          <Link href="/help/faq" className="underline hover:text-foreground">
            FAQ
          </Link>{" "}
          or{" "}
          <Link href="/help/contact" className="underline hover:text-foreground">
            contact us
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="block rounded-lg border border-foreground/10 bg-card p-5 transition hover:border-foreground/30"
            >
              <h2 className="text-lg">{cat.title}</h2>
              <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{cat.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
