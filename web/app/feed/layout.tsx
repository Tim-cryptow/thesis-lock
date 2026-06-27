import type { Metadata } from "next";

const title = "Recent Anchors";
const description = "Browse the latest documents anchored on the Stacks blockchain via ThesisLock.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/feed" },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/feed",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
