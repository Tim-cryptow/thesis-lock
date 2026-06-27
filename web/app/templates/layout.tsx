import type { Metadata } from "next";

const title = "Anchor Templates";
const description =
  "Pre-defined label formats for academic papers, legal documents, code releases, datasets, and certificates. Structure your anchors with consistent, searchable labels.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/templates" },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/templates",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
