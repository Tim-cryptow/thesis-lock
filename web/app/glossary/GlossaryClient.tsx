"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { GLOSSARY } from "@/lib/glossary";

// Turn a term into a stable URL fragment so each definition can be linked to
// directly, for example /glossary#sha-256-hash.
function slugify(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Alphabetical, computed once: the source list is small and unordered.
const SORTED = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));

export default function GlossaryClient() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SORTED;
    return SORTED.filter(
      (entry) => entry.term.toLowerCase().includes(q) || entry.definition.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          Home
        </Link>
        <Link href="/docs" className="text-foreground/60 hover:text-foreground">
          Docs
        </Link>
        <Link href="/anchor" className="text-foreground/60 hover:text-foreground">
          Anchor
        </Link>
      </div>

      <h1 className="text-3xl mb-2">Glossary</h1>
      <p className="text-foreground/70 mb-8">
        Plain-English definitions of the technical terms you will run into across ThesisLock.
      </p>

      <div className="mb-8">
        <label htmlFor="glossary-search" className="sr-only">
          Search the glossary
        </label>
        <input
          id="glossary-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms and definitions"
          className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-card focus:outline-none focus:border-foreground/50"
        />
      </div>

      {results.length === 0 ? (
        <p className="rounded-lg border border-foreground/10 bg-card p-6 text-center text-sm text-foreground/50">
          No terms match your search.
        </p>
      ) : (
        <dl className="space-y-4">
          {results.map((entry) => {
            const id = slugify(entry.term);
            return (
              <div
                key={entry.term}
                id={id}
                className="scroll-mt-24 rounded-lg border border-foreground/10 bg-card p-5"
              >
                <dt className="flex items-baseline gap-2">
                  <span className="text-lg font-medium">{entry.term}</span>
                  <a
                    href={`#${id}`}
                    aria-label={`Link to ${entry.term}`}
                    className="text-xs text-foreground/40 hover:text-foreground transition"
                  >
                    #
                  </a>
                </dt>
                <dd className="mt-1 text-sm text-foreground/70 leading-relaxed">
                  {entry.definition}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      <p className="mt-10 text-sm text-foreground/60">
        Looking for more detail? The{" "}
        <Link href="/docs" className="underline hover:no-underline">
          documentation
        </Link>{" "}
        covers each feature in depth.
      </p>
    </div>
  );
}
