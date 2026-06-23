import type { Metadata } from "next";
import dynamic from "next/dynamic";

// Client-only hash matcher UI. Loaded through next/dynamic so the server
// component owns metadata while the interactive tool runs in the browser.
const MatchClient = dynamic(() => import("./MatchClient"));

const title = "Hash Matcher";
const description =
  "Confirm two files are identical by comparing their SHA-256 hashes in the browser. Compare a hash against a file, or two files against each other.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: { canonical: "/match" },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/match",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <MatchClient />;
}
