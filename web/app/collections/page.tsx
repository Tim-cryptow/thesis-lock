import type { Metadata } from "next";
import dynamic from "next/dynamic";

// Client-only collections UI. Loaded through next/dynamic so the server
// component owns metadata while the interactive grid runs in the browser.
const CollectionsClient = dynamic(() => import("./CollectionsClient"));

const title = "Collections";
const description =
  "Organize anchored documents into named collections. Create folders, add anchors, and share collection links. A lightweight, browser-local way to group your proofs.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: { canonical: "/collections" },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/collections",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <CollectionsClient />;
}
