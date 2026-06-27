import type { Metadata } from "next";
import Link from "next/link";
import ErrorPage from "@/app/components/ErrorPage";
import { WifiOffIcon } from "@/app/components/ErrorIcons";

export const metadata: Metadata = {
  title: "Offline",
  description:
    "You are offline. File hashing still works in your browser; anchoring and verification need a connection.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/offline" },
};

const WORKS_OFFLINE = [
  "Hash a file. SHA-256 runs entirely in your browser.",
  "Open pages you have already visited.",
  "Read documentation you have opened before.",
];

const NEEDS_CONNECTION = [
  "Anchoring a new document on chain.",
  "Verifying a hash against the blockchain.",
  "The live feed, protocol stats, and wallet profiles.",
];

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-foreground/40"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export default function OfflinePage() {
  return (
    <ErrorPage
      icon={<WifiOffIcon />}
      title="You're offline"
      description="No internet connection right now. Your anchored documents are safe on the blockchain, and the core hashing tools still run on your device."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        <div className="rounded-lg border border-foreground/10 bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Works offline</h2>
          <ul className="space-y-2 text-sm text-foreground/70">
            {WORKS_OFFLINE.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Needs a connection</h2>
          <ul className="space-y-2 text-sm text-foreground/70">
            {NEEDS_CONNECTION.map((item) => (
              <li key={item} className="flex gap-2">
                <CrossIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-6">
        <Link href="/anchor" className="text-sm text-foreground underline hover:no-underline">
          Hash a file offline &rarr;
        </Link>
      </div>
    </ErrorPage>
  );
}
