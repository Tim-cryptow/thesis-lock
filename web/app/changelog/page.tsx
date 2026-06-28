import type { Metadata } from "next";
import ChangelogClient from "./ChangelogClient";
import { APP_VERSION } from "@/lib/version";

export function generateMetadata(): Metadata {
  return {
    title: { absolute: "Changelog | ThesisLock" },
    description: `Release notes and version history for ThesisLock, currently on v${APP_VERSION}.`,
    alternates: { canonical: "/changelog" },
  };
}

export default function ChangelogPage() {
  return <ChangelogClient />;
}
