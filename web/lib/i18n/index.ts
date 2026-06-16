import { en } from "./locales/en";
import { es } from "./locales/es";
import { fr } from "./locales/fr";

export type Locale = "en" | "es" | "fr";

export const LOCALES: Locale[] = ["en", "es", "fr"];
export const DEFAULT_LOCALE: Locale = "en";

// Short labels for the language switcher pills.
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  fr: "FR",
};

// Full native names, used for accessible labels.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
};

// The English locale is the canonical shape. Every other locale is typed as
// Translations, so TypeScript forces es and fr to mirror its keys exactly.
export type Translations = typeof en;

const TRANSLATIONS: Record<Locale, Translations> = { en, es, fr };

export function getTranslation(locale: Locale): Translations {
  return TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE];
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "es" || value === "fr";
}

// Resolves a dot path like "common.nav.anchor" against a translations object.
// Falls back to returning the path itself if the key is missing, which keeps
// rendering safe and makes missing keys visible during development.
export function resolvePath(translations: Translations, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, translations);
  return typeof value === "string" ? value : path;
}

// Replaces {name} placeholders with the matching param value. A missing param
// leaves the placeholder untouched so the gap is obvious.
export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}
