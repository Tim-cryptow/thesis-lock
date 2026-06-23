import type { Metadata } from "next";

const title = "Anchor a Document";
const description =
  "Hash a document in your browser and anchor it on the Stacks blockchain. The file never leaves your device.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/anchor" },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/anchor",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function AnchorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
