import type { Metadata } from "next";
import SearchClientLoader from "./SearchClientLoader";

const TITLE = "Search Anchors";
const DESCRIPTION = "Search for anchored documents by hash, wallet address, or label";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/search" },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${TITLE} | ThesisLock`,
    description: DESCRIPTION,
    url: "/search",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ThesisLock`,
    description: DESCRIPTION,
  },
};

export default function Page() {
  return <SearchClientLoader />;
}
