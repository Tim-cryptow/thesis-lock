import type { Metadata } from "next";

const title = "Performance";
const description =
  "In-browser performance monitoring for ThesisLock: Web Vitals, page load timings, and API response metrics, all measured and stored locally.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: `${title} | ThesisLock`,
    description,
    url: "/performance",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ThesisLock`,
    description,
  },
};

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
