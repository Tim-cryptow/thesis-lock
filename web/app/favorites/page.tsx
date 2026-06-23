import type { Metadata } from "next";
import dynamic from "next/dynamic";

// Client-only favorites UI. Loaded through next/dynamic so the server component
// owns metadata while the interactive list runs in the browser.
const FavoritesClient = dynamic(() => import("./FavoritesClient"));

const title = "Favorites";
const description =
  "Your starred hashes, wallets, groups, and pages, in one place for quick access. Stored only in this browser.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: { canonical: "/favorites" },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/favorites",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <FavoritesClient />;
}
