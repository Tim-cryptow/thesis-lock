"use client";

import Link from "next/link";
import { useI18n } from "@/app/components/I18nProvider";

// Nav-cluster link to the collections page. Carries the tour target so the
// onboarding tour can highlight it, mirroring the watchlist nav link.
export default function CollectionsNavLink({
  className = "text-foreground/60 hover:text-foreground",
}: {
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Link href="/collections" data-tour="collections-nav" className={className}>
      {t("common.nav.collections")}
    </Link>
  );
}
