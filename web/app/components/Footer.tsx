"use client";

import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import LiveBadge from "@/app/components/LiveBadge";
import FooterStatus from "@/app/components/FooterStatus";
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
          <Link href="/settings" className="hover:text-foreground transition">
            Settings
          </Link>
          <Link href="/performance" className="hover:text-foreground transition">
            Performance
          </Link>
          <Link href="/tags" className="hover:text-foreground transition">
            Tags
          </Link>
          <Link href="/glossary" className="hover:text-foreground transition">
            Glossary
          </Link>
          <Link href="/audit" className="hover:text-foreground transition">
            Audit
          </Link>
          <Link
            href="/calendar"
            data-tour="calendar-nav"
            className="hover:text-foreground transition"
          >
            Calendar
          </Link>
          <a
            href="/api/feed/rss"
            target="_blank"
            rel="noreferrer"
            aria-label="RSS feed"
            title="RSS feed"
            className="hover:text-foreground transition"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="6.18" cy="17.82" r="2.18" />
              <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83C19.56 11.4 12.6 4.44 4 4.44z" />
              <path d="M4 10.1v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" />
            </svg>
          </a>
          <FooterStatus />
          <LiveBadge />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
