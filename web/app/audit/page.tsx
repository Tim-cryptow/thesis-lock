import type { Metadata } from "next";
import dynamic from "next/dynamic";

const AuditClient = dynamic(() => import("./AuditClient"));

const title = "Audit Trail";
const description =
  "A tamper-evident, browser-local record of every action taken in the app, with filtering, integrity verification, and exportable compliance reports.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/audit",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <AuditClient />;
}
