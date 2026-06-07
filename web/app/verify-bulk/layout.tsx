import type { Metadata } from "next";

const title = "Bulk Verify";
const description =
  "Verify multiple documents at once against the Stacks blockchain";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/verify-bulk",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function BulkVerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
