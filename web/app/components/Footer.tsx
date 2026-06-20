"use client";

import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import LiveBadge from "@/app/components/LiveBadge";
import { useTour } from "@/app/components/TourProvider";
import { resetTour } from "@/lib/onboarding";
import { useI18n } from "@/app/components/I18nProvider";

const REPO_URL = "https://github.com/Tim-cryptow/thesis-lock";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const EXPLORER_URL = `https://explorer.hiro.so/address/${CONTRACT_ADDRESS}?chain=mainnet`;

export default function Footer() {
  const { t } = useI18n();
  const { startTour } = useTour();

  return (
    <footer className="mt-auto border-t border-foreground/10 py-8 px-6 text-sm text-foreground/60">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-foreground">{t("common.brand")}</span>
          <span className="text-foreground/50">{t("common.tagline")}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              resetTour();
              startTour();
            }}
            className="hover:text-foreground transition"
          >
            Restart onboarding tour
          </button>
          <Link href="/docs" className="hover:text-foreground transition">
            {t("common.footer.docs")}
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition"
          >
            {t("common.footer.github")}
          </a>
          <a
            href={EXPLORER_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition"
          >
            {t("common.footer.explorer")}
          </a>
          <Link href="/docs/api" className="hover:text-foreground transition">
            {t("common.footer.api")}
          </Link>
          <Link
            href="/developers"
            data-tour="developers-link"
            className="hover:text-foreground transition"
          >
            {t("common.footer.developers")}
          </Link>
          <LiveBadge />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
