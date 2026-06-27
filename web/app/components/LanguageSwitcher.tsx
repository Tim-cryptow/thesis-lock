"use client";

import { LOCALES, LOCALE_LABELS, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("common.language.label")}
      className="inline-flex items-center rounded-md border border-foreground/15 text-xs font-mono"
    >
      {LOCALES.map((code: Locale, index) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            aria-label={LOCALE_NAMES[code]}
            title={LOCALE_NAMES[code]}
            className={`px-2 py-1 transition ${
              active ? "bg-heading text-background" : "text-foreground/60 hover:text-foreground"
            } ${index === 0 ? "rounded-l-md" : ""} ${
              index === LOCALES.length - 1 ? "rounded-r-md" : ""
            }`}
          >
            {LOCALE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
