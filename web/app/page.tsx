import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import HeroStats from "@/app/components/HeroStats";

const REPO_URL = "https://github.com/Tim-cryptow/thesis-lock";

const STEPS = [
  {
    title: "Drop your file",
    body: "Your browser hashes the document with SHA-256. The file itself never leaves your device.",
    icon: (
      <>
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </>
    ),
  },
  {
    title: "Sign with your wallet",
    body: "Approve one Stacks transaction. Your wallet signs the hash and anchors it on chain with an optional label.",
    icon: (
      <>
        <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M16 11h2" />
        <path d="M3 9h18" />
      </>
    ),
  },
  {
    title: "Verify anytime",
    body: "Anyone can confirm when the document existed, by which wallet, forever. The proof lives on Bitcoin via Stacks.",
    icon: (
      <>
        <path d="M12 3 4 6v6c0 4 3.5 7.5 8 9 4.5-1.5 8-5 8-9V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
];

export default function Page() {
  return (
    <div className="flex-1 flex flex-col">
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 w-full">
        <h1 className="text-5xl md:text-6xl leading-tight">
          Prove any document existed. On Bitcoin.
        </h1>
        <p className="mt-6 text-lg max-w-2xl text-foreground/80">
          ThesisLock anchors SHA-256 hashes on the Stacks blockchain.
          Permanent, verifiable, private. Your file never leaves your device.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/anchor"
            className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
          >
            Anchor a Document
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
          >
            Verify a Hash
          </Link>
        </div>
        <HeroStats />
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 w-full">
        <h2 className="text-3xl mb-10">How it works</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="rounded-lg border border-foreground/10 bg-card p-6 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-heading text-background text-sm font-mono">
                  {i + 1}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6 text-foreground/70"
                  aria-hidden="true"
                >
                  {step.icon}
                </svg>
              </div>
              <h3 className="text-xl mb-2">{step.title}</h3>
              <p className="text-foreground/80 text-sm leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-auto border-t border-foreground/10 py-6 px-6 text-sm text-foreground/60">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>ThesisLock</span>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-foreground transition">
              Docs
            </Link>
            <Link href="/stats" className="hover:text-foreground transition">
              Stats
            </Link>
            <Link href="/embed" className="hover:text-foreground transition">
              Embed
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
