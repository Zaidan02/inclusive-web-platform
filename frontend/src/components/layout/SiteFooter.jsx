import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Brand from "../common/Brand";

export default function SiteFooter() {
  const { t } = useTranslation("public");
  return (
    <footer className="site-footer">
      <div className="landing-container site-footer__grid">
        <div className="site-footer__intro"><Brand light /><p>{t("footer.intro")}</p></div>
        <nav aria-label={t("footer.platformNav")}><h2>{t("footer.platform")}</h2><a href="#purpose">{t("footer.purpose")}</a><a href="#how-it-works">{t("footer.how")}</a><a href="#paths">{t("footer.started")}</a></nav>
        <nav aria-label={t("footer.accountNav")}><h2>{t("footer.account")}</h2><Link to="/signin">{t("footer.signIn")}</Link><Link to="/signup?role=candidate">{t("footer.candidate")}</Link><Link to="/signup?role=employer">{t("footer.employer")}</Link></nav>
        <section aria-labelledby="footer-inclusion-heading"><h2 id="footer-inclusion-heading">{t("footer.inclusion")}</h2><span>{t("footer.ability")}</span><span>{t("footer.accessible")}</span><span>{t("footer.hospitality")}</span></section>
      </div>
      <div className="landing-container site-footer__bottom"><span>{t("footer.copyright", { year: new Date().getFullYear() })}</span><span>{t("footer.closing")}</span></div>
    </footer>
  );
}
