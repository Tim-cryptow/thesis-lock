import Link from "next/link";

const REPO_URL = "https://github.com/Tim-cryptow/thesis-lock";

export default function Page() {
  return (
    <main className="flex-1 flex flex-col">
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 w-full">
        <h1 className="text-5xl md:text-6xl leading-tight">
          Permanent, verifiable timestamps for your work.
        </h1>
        <p className="mt-6 text-lg max-w-2xl text-foreground/80">
          Hash a document. Anchor the hash on Bitcoin via Stacks. Verify it
          forever, without ever sharing the file.
        </p>
        <div className="mt-10">
          <Link
            href="/anchor"
            className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
          >
            Anchor a document
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border border-foreground/10 bg-white p-6">
            <h3 className="text-xl mb-2">Timestamp</h3>
            <p className="text-foreground/80 text-sm leading-relaxed">
              The Bitcoin block height at the moment you anchored proves when
              the document existed.
            </p>
          </div>
          <div className="rounded-lg border border-foreground/10 bg-white p-6">
            <h3 className="text-xl mb-2">Signature</h3>
            <p className="text-foreground/80 text-sm leading-relaxed">
              Your Stacks wallet signs the anchor, so anyone can verify which
              key claimed authorship.
            </p>
          </div>
          <div className="rounded-lg border border-foreground/10 bg-white p-6">
            <h3 className="text-xl mb-2">Privacy</h3>
            <p className="text-foreground/80 text-sm leading-relaxed">
              The file never leaves your device. Only its fingerprint is
              published on chain.
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-foreground/10 py-6 px-6 text-sm text-foreground/60">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>ThesisLock</span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
