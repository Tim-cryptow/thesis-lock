import type { Metadata } from "next";

const title = "My Anchors";
const description =
  "View the documents you have anchored on the Stacks blockchain.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/anchors" },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/anchors",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function AnchorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
