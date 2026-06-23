import type { Metadata } from "next";
import dynamic from "next/dynamic";

// Client-only watchlist UI. Loaded through next/dynamic so the server component
// owns metadata while the interactive list runs in the browser.
const WatchlistClient = dynamic(() => import("./WatchlistClient"));

const title = "Watchlist";
const description =
  "Monitor specific document hashes, wallets, and groups over time. Save what you care about and see verification status and new anchors in one place.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: { canonical: "/watchlist" },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/watchlist",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <WatchlistClient />;
}
