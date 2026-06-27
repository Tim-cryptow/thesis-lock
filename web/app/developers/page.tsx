import type { Metadata } from "next";
import DevelopersClientLoader from "./DevelopersClientLoader";

export const metadata: Metadata = {
  title: "Developer Portal",
  description: "Interactive API playground and developer resources for ThesisLock",
  alternates: { canonical: "/developers" },
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: "Developer Portal | ThesisLock",
    description: "Interactive API playground and developer resources for ThesisLock",
    url: "/developers",
  },
  twitter: {
    card: "summary",
    title: "Developer Portal | ThesisLock",
    description: "Interactive API playground and developer resources for ThesisLock",
  },
};

export default function Page() {
  return <DevelopersClientLoader />;
}
