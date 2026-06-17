import type { Metadata } from "next";
import DevelopersClientLoader from "./DevelopersClientLoader";

export const metadata: Metadata = {
  title: "Developer Tools",
  description:
    "Interactive API playground and developer resources for ThesisLock",
  openGraph: {
    type: "website",
    siteName: "ThesisLock",
    title: "Developer Tools | ThesisLock",
    description:
      "Interactive API playground and developer resources for ThesisLock",
    url: "/developers",
  },
  twitter: {
    card: "summary",
    title: "Developer Tools | ThesisLock",
    description:
      "Interactive API playground and developer resources for ThesisLock",
  },
};

export default function Page() {
  return <DevelopersClientLoader />;
}
