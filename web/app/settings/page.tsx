import type { Metadata } from "next";
import SettingsClientLoader from "./SettingsClientLoader";

const title = "Settings";
const description =
  "Manage everything ThesisLock keeps in your browser: back up and restore your data, tune preferences, and control your privacy.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "ThesisLock",
      title: `${title} | ThesisLock`,
      description,
      url: "/settings",
    },
    twitter: {
      card: "summary",
      title: `${title} | ThesisLock`,
      description,
    },
  };
}

export default function Page() {
  return <SettingsClientLoader />;
}
