import type { Metadata } from "next";
import dynamic from "next/dynamic";

const CalendarClient = dynamic(() => import("./CalendarClient"));

const title = "Calendar";
const description =
  "Your anchoring activity mapped to dates: a GitHub-style contribution graph, a monthly calendar, and streak tracking so you can see your patterns and keep your momentum.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: { canonical: "/calendar" },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/calendar",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <CalendarClient />;
}
