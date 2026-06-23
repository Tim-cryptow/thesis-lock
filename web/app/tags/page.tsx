import type { Metadata } from "next";
import dynamic from "next/dynamic";

const TagsClient = dynamic(() => import("./TagsClient"));

const title = "Tags";
const description =
  "Organize and explore your anchors by tag: a tag cloud, usage stats, and tag management, all stored locally in your browser.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: { canonical: "/tags" },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/tags",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <TagsClient />;
}
