import Link from "next/link";
import ErrorPage from "@/app/components/ErrorPage";
import { WrenchIcon } from "@/app/components/ErrorIcons";

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
