import { useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLocale, SUPPORTED_LOCALES } from "../../i18n/locales";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation("common");
  const [announcement, setAnnouncement] = useState("");
  const currentLocale = normalizeLocale(i18n.resolvedLanguage) || "en";

  async function changeLanguage(event) {
    const nextLocale = normalizeLocale(event.target.value);
    if (!nextLocale || nextLocale === currentLocale) return;
    await i18n.changeLanguage(nextLocale);
    setAnnouncement(t("language.changed", {
      language: t(`languages.${nextLocale}`, { lng: nextLocale }),
      lng: nextLocale,
    }));
  }

  return (
    <div className="language-toolbar" role="region" aria-label={t("language.region")}>
      <div className="language-toolbar__inner">
        <label htmlFor="interface-language">{t("language.label")}</label>
        <select id="interface-language" value={currentLocale} onChange={changeLanguage}>
          {Object.values(SUPPORTED_LOCALES).map((locale) => (
            <option key={locale.code} value={locale.code} lang={locale.code} dir={locale.direction}>
              {locale.nativeName}
            </option>
          ))}
        </select>
        <span className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </div>
    </div>
  );
}

