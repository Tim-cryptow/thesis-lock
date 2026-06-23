import type { Metadata } from "next";

const title = "Activity Log";
const description =
  "A unified, chronological log of every interaction with the ThesisLock contracts for your wallet: anchors, batches, registry entries, proof mints, and group actions.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/activity" },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/activity",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
