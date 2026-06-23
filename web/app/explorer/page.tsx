import type { Metadata } from "next";
import dynamic from "next/dynamic";

// Client-only explorer UI. Loaded through next/dynamic so the server component
// can own metadata while the interactive view (tabs, live calls, read-only
// tester) runs in the browser.
const ExplorerClient = dynamic(() => import("./ExplorerClient"));

const title = "Contract Explorer";
const description =
  "Explore the five ThesisLock Clarity contracts on Stacks mainnet: their functions, maps, data variables, recent on-chain calls, and an interactive read-only function tester.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: { canonical: "/explorer" },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/explorer",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <ExplorerClient />;
}
