"use client";

import { useI18n } from "./I18nProvider";

export default function SkipToContent() {
  const { t } = useI18n();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-heading focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus:shadow-lg"
    >
      {t("common.a11y.skipToContent")}
    </a>
  );
}
