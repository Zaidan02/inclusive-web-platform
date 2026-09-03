export const LOCALE_STORAGE_KEY = "join.locale";

export const SUPPORTED_LOCALES = Object.freeze({
  en: { code: "en", nativeName: "English", direction: "ltr" },
  fr: { code: "fr", nativeName: "Français", direction: "ltr" },
  ar: { code: "ar", nativeName: "العربية", direction: "rtl" },
});

export function normalizeLocale(value) {
  const base = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return Object.hasOwn(SUPPORTED_LOCALES, base) ? base : null;
}

export function resolveInitialLocale() {
  try {
    const stored = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }

  const browserLocales = Array.isArray(window.navigator.languages)
    ? window.navigator.languages
    : [window.navigator.language];
  return browserLocales.map(normalizeLocale).find(Boolean) || "en";
}

export function localeDirection(locale) {
  return SUPPORTED_LOCALES[normalizeLocale(locale) || "en"].direction;
}

