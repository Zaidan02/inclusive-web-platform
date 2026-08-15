import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./resources/en/common.json";
import enAuth from "./resources/en/auth.json";
import enVoice from "./resources/en/voice.json";
import enProfile from "./resources/en/profile.json";
import enPublic from "./resources/en/public.json";
import enVoiceHelp from "./resources/en/voiceHelp.json";
import enDashboards from "./resources/en/dashboards.json";
import frCommon from "./resources/fr/common.json";
import frAuth from "./resources/fr/auth.json";
import frVoice from "./resources/fr/voice.json";
import frProfile from "./resources/fr/profile.json";
import frPublic from "./resources/fr/public.json";
import frVoiceHelp from "./resources/fr/voiceHelp.json";
import frDashboards from "./resources/fr/dashboards.json";
import arCommon from "./resources/ar/common.json";
import arAuth from "./resources/ar/auth.json";
import arVoice from "./resources/ar/voice.json";
import arProfile from "./resources/ar/profile.json";
import arPublic from "./resources/ar/public.json";
import arVoiceHelp from "./resources/ar/voiceHelp.json";
import arDashboards from "./resources/ar/dashboards.json";
import {
  LOCALE_STORAGE_KEY,
  localeDirection,
  normalizeLocale,
  resolveInitialLocale,
} from "./locales";

const resources = {
  en: { common: enCommon, auth: enAuth, voice: enVoice, profile: enProfile, public: enPublic, voiceHelp: enVoiceHelp, dashboards: enDashboards },
  fr: { common: frCommon, auth: frAuth, voice: frVoice, profile: frProfile, public: frPublic, voiceHelp: frVoiceHelp, dashboards: frDashboards },
  ar: { common: arCommon, auth: arAuth, voice: arVoice, profile: arProfile, public: arPublic, voiceHelp: arVoiceHelp, dashboards: arDashboards },
};

export function applyDocumentLocale(value) {
  const locale = normalizeLocale(value) || "en";
  document.documentElement.lang = locale;
  document.documentElement.dir = localeDirection(locale);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The interface still works when browser storage is unavailable.
  }
  return locale;
}

const initialLocale = resolveInitialLocale();
applyDocumentLocale(initialLocale);

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLocale,
    supportedLngs: ["en", "fr", "ar"],
    fallbackLng: "en",
    load: "languageOnly",
    ns: ["common", "auth", "voice", "profile", "public", "voiceHelp", "dashboards"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
  });

i18n.on("languageChanged", applyDocumentLocale);

export default i18n;
