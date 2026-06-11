import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

const REPO_URL = "https://github.com/Tim-cryptow/thesis-lock";

export default function Page() {
  return (
    <div className="flex-1 flex flex-col">
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 w-full">
        <h1 className="text-5xl md:text-6xl leading-tight">
          Permanent, verifiable timestamps for your work.
        </h1>
        <p className="mt-6 text-lg max-w-2xl text-foreground/80">
          Hash a document. Anchor the hash on Bitcoin via Stacks. Verify it
          forever, without ever sharing the file.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/anchor"
            className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
          >
            Anchor a document
          </Link>
          <Link
            href="/anchors"
            className="inline-flex items-center px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
          >
            My anchors
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
          >
            Search anchors
          </Link>
          <Link
            href="/groups"
            className="inline-flex items-center px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
          >
            Groups
          </Link>
          <Link
            href="/feed"
            className="inline-flex items-center px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
          >
            Recent anchors
          </Link>
          <Link
            href="/stats"
            className="inline-flex items-center px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
          >
            Protocol stats
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-lg border border-foreground/10 bg-card p-6">
            <h3 className="text-xl mb-2">Timestamp</h3>
            <p className="text-foreground/80 text-sm leading-relaxed">
              The Bitcoin block height at the moment you anchored proves when
              the document existed.
            </p>
          </div>
          <div className="rounded-lg border border-foreground/10 bg-card p-6">
            <h3 className="text-xl mb-2">Signature</h3>
            <p className="text-foreground/80 text-sm leading-relaxed">
              Your Stacks wallet signs the anchor, so anyone can verify which
              key claimed authorship.
            </p>
          </div>
          <div className="rounded-lg border border-foreground/10 bg-card p-6">
            <h3 className="text-xl mb-2">Privacy</h3>
            <p className="text-foreground/80 text-sm leading-relaxed">
              The file never leaves your device. Only its fingerprint is
              published on chain.
            </p>
          </div>
          <div className="rounded-lg border border-foreground/10 bg-card p-6">
            <h3 className="text-xl mb-2">Batch &amp; history</h3>
            <p className="text-foreground/80 text-sm leading-relaxed">
              Anchor up to ten documents in a single transaction, then browse
              everything anchored from your wallet.
            </p>
          </div>
          <div className="rounded-lg border border-foreground/10 bg-card p-6">
            <h3 className="text-xl mb-2">Bulk verify</h3>
            <p className="text-foreground/80 text-sm leading-relaxed">
              Drop many documents at once to check them all against the chain in
              one pass, then export the results.
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-foreground/10 py-6 px-6 text-sm text-foreground/60">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>ThesisLock</span>
          <div className="flex items-center gap-4">
            <Link href="/stats" className="hover:text-foreground transition">
              Stats
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition"
            >
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
