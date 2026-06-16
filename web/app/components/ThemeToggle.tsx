"use client";

import { useTheme } from "./ThemeProvider";
import { useI18n } from "./I18nProvider";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { mode, cycle } = useTheme();
  const { t } = useI18n();

  const label = t(`common.theme.${mode}`);
  const icon =
    mode === "light" ? (
      <SunIcon />
    ) : mode === "dark" ? (
      <MoonIcon />
    ) : (
      <MonitorIcon />
    );

  return (
    <button
      type="button"
      onClick={cycle}
      title={t("common.theme.label", { mode: label })}
      aria-label={t("common.theme.ariaLabel", { mode: label })}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-foreground/15 text-foreground/70 hover:border-foreground/40 hover:text-foreground transition"
    >
      {icon}
    </button>
  );
}
