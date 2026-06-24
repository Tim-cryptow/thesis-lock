import type { Metadata } from "next";
import Link from "next/link";
import ErrorPage from "@/app/components/ErrorPage";
import { WrenchIcon } from "@/app/components/ErrorIcons";

export const metadata: Metadata = {
  title: "Maintenance",
  description:
    "ThesisLock is undergoing scheduled maintenance. Your anchored documents remain safe on the blockchain.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/maintenance" },
};

export default function MaintenancePage() {
  return (
    <ErrorPage
      icon={<WrenchIcon />}
      title="ThesisLock is undergoing maintenance"
      description="We'll be back shortly. Your anchored documents are safe on the blockchain."
    >
      <Link
        href="/status"
        className="inline-flex px-5 py-2.5 rounded-md border border-foreground/15 text-sm hover:border-foreground/40 transition"
      >
        Check system status
      </Link>
    </ErrorPage>
  );
}
