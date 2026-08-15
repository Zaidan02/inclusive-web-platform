import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Brand from "../components/common/Brand";
import ArrowIcon from "../components/common/ArrowIcon";
import "../styles/employersPage.css";

export default function EmployersPage() {
  const { t } = useTranslation("public");
  return (
    <main className="employers-placeholder">
      <header className="employers-placeholder__header">
        <Brand />
        <Link to="/" className="employers-placeholder__home">{t("employers.back")}</Link>
      </header>
      <section className="employers-placeholder__content">
        <div className="employers-placeholder__visual" aria-hidden="true">
          <span>🏗</span>
          <i /><i /><i />
        </div>
        <span className="employers-placeholder__eyebrow">{t("employers.eyebrow")}</span>
        <h1>{t("employers.title")}</h1>
        <p>{t("employers.text")}</p>
        <div className="employers-placeholder__actions">
          <Link to="/signup?role=employer" className="button button--primary">{t("employers.create")} <ArrowIcon /></Link>
          <Link to="/signin" className="button button--secondary">{t("employers.signIn")}</Link>
        </div>
        <small>{t("employers.note")}</small>
      </section>
    </main>
  );
}
