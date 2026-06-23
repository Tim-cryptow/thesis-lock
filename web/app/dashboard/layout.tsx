import type { Metadata } from "next";

const title = "My Dashboard";
const description =
  "View your anchoring activity, stats, and history on ThesisLock";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/dashboard" },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/dashboard",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
