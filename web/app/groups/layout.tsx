import type { Metadata } from "next";

const title = "Groups";
const description =
  "Create groups and anchor documents under them with a shared, verifiable history on the Stacks blockchain.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/groups" },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/groups",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
