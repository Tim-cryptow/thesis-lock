import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

const title = "Privacy Policy";
const description =
  "ThesisLock collects no data. Everything is stored locally in your browser, hashing happens client-side, and only the transactions you sign are public on Stacks. No cookies or tracking.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/privacy",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function PrivacyPage() {
  return (
    <div className="w-full flex-1">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm text-foreground/60 transition hover:text-foreground"
          >
            &larr; ThesisLock
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="mb-2 text-3xl">Privacy Policy</h1>
        <p className="mb-8 text-sm text-foreground/55">Last updated June 2026</p>

        <div className="space-y-6 leading-relaxed text-foreground/80">
          <section>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              We collect nothing
            </h2>
            <p>
              ThesisLock has no accounts, no backend database, and no servers
              that store your information. We do not collect, sell, or share any
              personal data, because we never receive any in the first place.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              Your data stays in your browser
            </h2>
            <p>
              Everything ThesisLock remembers, including your settings,
              favorites, watchlist, collections, tags, and recent activity, is
              stored only in your own browser using local storage. It lives on
              your device, never leaves it, and clearing your browser data
              removes it.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              Files never leave your device
            </h2>
            <p>
              Hashing happens entirely in your browser. The files you drop are
              read locally to compute their SHA-256 hash and are never uploaded.
              Only the resulting hash, and any label you choose, is included in a
              transaction you sign.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              On-chain activity is public
            </h2>
            <p>
              Transactions you sign are recorded on the public Stacks blockchain.
              The hashes you anchor, their labels, the signing wallet address,
              and timestamps are visible to anyone, on ThesisLock and through any
              Stacks explorer. Reads use the public Hiro API directly from your
              browser.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              No cookies or tracking
            </h2>
            <p>
              ThesisLock sets no cookies and runs no analytics, advertising, or
              third-party trackers. There is nothing following you across the
              site.
            </p>
          </section>

          <p className="text-sm text-foreground/55">
            See also the{" "}
            <Link href="/terms" className="underline hover:no-underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
