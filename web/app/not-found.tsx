import Link from "next/link";

const SUGGESTIONS = [
  { href: "/", label: "Go home", hint: "ThesisLock overview" },
  { href: "/anchor", label: "Anchor a document", hint: "Timestamp a file" },
  { href: "/search", label: "Search anchors", hint: "By hash, wallet, or label" },
];

export default function NotFound() {
  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          &larr; ThesisLock
        </Link>
        <Link href="/search" className="text-foreground/60 hover:text-foreground">
          Search
        </Link>
        <Link href="/anchor" className="text-foreground/60 hover:text-foreground">
          Anchor
        </Link>
        <Link href="/feed" className="text-foreground/60 hover:text-foreground">
          Feed
        </Link>
      </div>

      <h1 className="text-3xl mt-8 mb-2">Page not found.</h1>
      <p className="text-foreground/70 mb-8">
        The page you are looking for does not exist or may have moved. Try one of
        these instead.
      </p>

      <ul className="space-y-3">
        {SUGGESTIONS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 bg-card p-5 hover:border-foreground/30 transition"
            >
              <span>
                <span className="block font-medium">{s.label}</span>
                <span className="block text-sm text-foreground/60">
                  {s.hint}
                </span>
              </span>
              <span aria-hidden="true" className="text-foreground/40">
                &rarr;
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
