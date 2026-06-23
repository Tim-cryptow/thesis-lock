import type { Metadata } from "next";
import ReportClientLoader from "./ReportClientLoader";

export function generateMetadata(): Metadata {
  return {
    title: "Verification Report",
    description:
      "Generate a formal, multi-document verification report from on-chain ThesisLock anchors, exportable as HTML, JSON, or CSV.",
    alternates: { canonical: "/report" },
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: "Verification Report | ThesisLock",
      description:
        "Generate a formal, multi-document verification report from on-chain ThesisLock anchors.",
      url: "/report",
    },
    twitter: {
      card: "summary",
      title: "Verification Report | ThesisLock",
      description:
        "Generate a formal, multi-document verification report from on-chain ThesisLock anchors.",
    },
  };
}

export default function Page() {
  return <ReportClientLoader />;
}
