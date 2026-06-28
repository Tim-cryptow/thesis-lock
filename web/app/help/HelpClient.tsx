"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FAQS, GUIDES, HELP_CATEGORIES, TROUBLESHOOTING } from "@/lib/help";

// A flat index of every help topic, so a search from the landing page reaches
// the actual FAQ, guide, and troubleshooting entries (matching their question,
// steps, or solution text), not just the category cards.
type SearchItem = { key: string; title: string; href: string; context: string; haystack: string };

const SEARCH_INDEX: SearchItem[] = [
  ...FAQS.map((faq) => ({
    key: `faq-${faq.slug}`,
    title: faq.question,
    href: `/help/faq#${faq.slug}`,
    context: `FAQ: ${faq.category}`,
    haystack: `${faq.question} ${faq.answer}`.toLowerCase(),
  })),
  ...GUIDES.map((guide) => ({
    key: `guide-${guide.slug}`,
    title: guide.title,
    href: `/help/guides#${guide.slug}`,
    context: "Guide",
    haystack: `${guide.title} ${guide.steps.join(" ")}`.toLowerCase(),
  })),
  ...TROUBLESHOOTING.map((entry) => ({
    key: `troubleshooting-${entry.slug}`,
    title: entry.problem,
    href: `/help/troubleshooting#${entry.slug}`,
    context: "Troubleshooting",
    haystack: `${entry.problem} ${entry.solution}`.toLowerCase(),
  })),
];

export default function HelpClient() {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const results = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX.filter((item) => item.haystack.includes(q));
  }, [trimmed]);

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

      {!trimmed ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {HELP_CATEGORIES.map((cat) => (
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
      ) : results.length > 0 ? (
        <ul className="mt-8 divide-y divide-foreground/10 rounded-lg border border-foreground/10">
          {results.map((item) => (
            <li key={item.key}>
              <Link href={item.href} className="block px-4 py-3 transition hover:bg-foreground/5">
                <span className="block text-sm text-foreground">{item.title}</span>
                <span className="block text-xs text-foreground/50">{item.context}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-foreground/60">
          No help topics match &ldquo;{trimmed}&rdquo;. Try the{" "}
          <Link href="/help/faq" className="underline hover:text-foreground">
            FAQ
          </Link>{" "}
          or{" "}
          <Link href="/help/contact" className="underline hover:text-foreground">
            contact us
          </Link>
          .
        </p>
      )}
    </div>
  );
}
