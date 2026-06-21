import type { Metadata } from "next";
import dynamic from "next/dynamic";

const StatusClient = dynamic(() => import("./StatusClient"));

const title = "System Status";
const description =
  "Live health of the ThesisLock smart contracts, API endpoints, and upstream Hiro and Stacks dependencies, with uptime history and incident reporting.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/status",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <StatusClient />;
}
