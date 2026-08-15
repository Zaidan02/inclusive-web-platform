import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PRIVACY_VERSION } from "../privacy";
import "../styles/privacy.css";

export default function PrivacyPage() {
  const { t } = useTranslation("public");
  const sections = t("privacy.sections", { returnObjects: true });
  return (
    <main className="privacy-page">
      <nav className="privacy-page__back" aria-label={t("privacy.navigation")}>
        <Link to="/">{t("privacy.back")}</Link>
      </nav>
      <header className="privacy-page__header">
        <span>JoIn Hospitality</span>
        <h1>{t("privacy.title")}</h1>
        <p>{t("privacy.subtitle")}</p>
        <p className="privacy-page__version">{t("privacy.version", { version: PRIVACY_VERSION })}</p>
      </header>
      <div className="privacy-page__sections">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id}>{section.title}</h2>
            <p>{section.text}</p>
          </section>
        ))}
      </div>
      <div className="privacy-page__actions">
        <Link className="button button--primary" to="/signup">{t("privacy.registration")}</Link>
        <Link className="button button--secondary" to="/signin">{t("privacy.signIn")}</Link>
      </div>
    </main>
  );
}
