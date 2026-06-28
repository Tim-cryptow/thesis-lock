"use client";

import { useCallback, useEffect, useState } from "react";
import { FAQS, FAQ_CATEGORIES } from "@/lib/help";

export default function FaqClient() {
  // Slugs of the currently expanded questions. A question can be opened by a
  // click or by arriving with its slug in the URL hash.
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Expand and scroll to the question named in the URL hash, both on first load
  // and whenever the hash changes (for example a command-palette result while the
  // page is already mounted). Adding to the set leaves other open questions alone.
  useEffect(() => {
    const expandFromHash = () => {
      const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!slug || !FAQS.some((faq) => faq.slug === slug)) return;
      setOpen((prev) => new Set(prev).add(slug));
      requestAnimationFrame(() => {
        document.getElementById(slug)?.scrollIntoView({ block: "start" });
      });
    };
    expandFromHash();
    window.addEventListener("hashchange", expandFromHash);
    return () => window.removeEventListener("hashchange", expandFromHash);
  }, []);

  const toggle = useCallback((slug: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Frequently Asked Questions</h1>
      <p className="mt-4 text-lg text-foreground/80 leading-relaxed">
        Short answers to the questions people ask most. Select a question to expand it.
      </p>

      {FAQ_CATEGORIES.map((category) => (
        <section key={category} className="mt-10">
          <h2 className="text-2xl mb-4">{category}</h2>
          <div className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
            {FAQS.filter((faq) => faq.category === category).map((faq) => {
              const isOpen = open.has(faq.slug);
              return (
                <div key={faq.slug} id={faq.slug} className="scroll-mt-24">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggle(faq.slug)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-foreground/5"
                    >
                      <span className="font-medium text-foreground">{faq.question}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 text-foreground/40 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </h3>
                  {isOpen && (
                    <p className="px-4 pb-4 text-sm text-foreground/80 leading-relaxed">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
