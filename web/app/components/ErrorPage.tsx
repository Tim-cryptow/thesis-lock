import Link from "next/link";
import type { ReactNode } from "react";
import ErrorSearch from "./ErrorSearch";

export type ErrorSuggestion = {
  label: string;
  href: string;
  hint?: string;
};

type ErrorPageProps = {
  // An optional icon shown in a circle above the code and title.
  icon?: ReactNode;
  // A short status code shown large and faint above the title, e.g. "404".
  code?: string;
  title: string;
  description: ReactNode;
  // Quick links rendered as a card grid under a "places to start" heading.
  suggestions?: ErrorSuggestion[];
  // When true, renders the inline hash search box.
  showSearch?: boolean;
  // Action buttons or extra content (retry, report, dev error details).
  children?: ReactNode;
};

// Shared layout for every not-found and error page so they stay visually
// consistent. Theme tokens keep it correct in light and dark modes. This is a
// shared component (no "use client") so server not-found pages render it on the
// server while client error boundaries can render it too; the only interactive
// piece, the search box, is its own client island.
export default function ErrorPage({
  icon,
  code,
  title,
  description,
  suggestions,
  showSearch = false,
  children,
}: ErrorPageProps) {
  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-16 sm:py-24 text-center">
      {icon ? (
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-foreground/5 text-foreground/50">
            {icon}
          </span>
        </div>
      ) : null}

      {code ? (
        <p
          aria-hidden="true"
          className="font-mono text-6xl sm:text-7xl font-bold tracking-tight text-foreground/15 tabular-nums"
        >
          {code}
        </p>
      ) : null}

      <h1 className="mt-4 text-3xl sm:text-4xl">{title}</h1>
      <div className="mt-4 text-foreground/70 leading-relaxed">{description}</div>

      {children ? <div className="mt-8">{children}</div> : null}

      {showSearch ? <ErrorSearch /> : null}

      {suggestions && suggestions.length > 0 ? (
        <div className="mt-12 text-left">
          <p className="text-sm font-medium text-foreground/60 mb-3">
            Here are some places to start
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestions.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 bg-card p-4 hover:border-foreground/30 transition h-full"
                >
                  <span>
                    <span className="block font-medium">{s.label}</span>
                    {s.hint ? (
                      <span className="block text-sm text-foreground/60">
                        {s.hint}
                      </span>
                    ) : null}
                  </span>
                  <span aria-hidden="true" className="text-foreground/40">
                    &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
