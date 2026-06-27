import type { Metadata } from "next";
import dynamic from "next/dynamic";

const SharedCollectionClient = dynamic(() => import("./SharedCollectionClient"));

const title = "Shared Collection";
const description =
  "View a shared ThesisLock collection of anchored documents. Verify every hash on chain and import the collection into your own browser.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: { canonical: "/collections/shared" },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/collections/shared",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <SharedCollectionClient />;
}
