"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  getTranslation,
  interpolate,
  isLocale,
  resolvePath,
  type Locale,
  type Translations,
} from "@/lib/i18n";

const STORAGE_KEY = "thesislock.locale";

type TranslateParams = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  // Looks up a dot-path key for the current locale and interpolates {params}.
  t: (key: string, params?: TranslateParams) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readUrlLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("lang");
  return isLocale(param) ? param : null;
}

function readStoredLocale(): Locale | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

function readBrowserLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;
  const candidates = navigator.languages ?? [navigator.language];
  for (const lang of candidates) {
    const base = lang.slice(0, 2).toLowerCase();
    if (isLocale(base)) return base;
  }
  return null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start from the default on the server and first client render so markup
  // matches, then resolve the real preference in the mount effect. This mirrors
  // ThemeProvider and avoids a hydration mismatch.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const resolved = readUrlLocale() ?? readStoredLocale() ?? readBrowserLocale() ?? DEFAULT_LOCALE;
    setLocaleState(resolved);
  }, []);

  // Keep the document language attribute in sync for accessibility and SEO.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal if persistence is unavailable.
    }
    try {
      // Reflect the choice in the URL so a shared link keeps the language.
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.history.replaceState({}, "", url);
    } catch {
      // Non-fatal.
    }
  }, []);

  const translations: Translations = getTranslation(locale);

  const t = useCallback(
    (key: string, params?: TranslateParams) => interpolate(resolvePath(translations, key), params),
    [translations],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
