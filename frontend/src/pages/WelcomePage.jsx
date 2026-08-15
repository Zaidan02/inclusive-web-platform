import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import heroImage from "../assets/hero.png";
import ArrowIcon from "../components/common/ArrowIcon";
import SiteHeader from "../components/layout/SiteHeader";
import SiteFooter from "../components/layout/SiteFooter";
import "../styles/landing.css";

export default function WelcomePage() {
  const { t } = useTranslation("public");
  const steps = t("welcome.steps", { returnObjects: true });
  const principles = t("welcome.principles", { returnObjects: true });
  const trust = t("welcome.trust", { returnObjects: true });
  const candidateBenefits = t("welcome.candidateBenefits", { returnObjects: true });
  const employerBenefits = t("welcome.employerBenefits", { returnObjects: true });
  return (
    <div className="landing-page">
      <SiteHeader />
      <main>
        <section className="hero-section" id="hero" data-voice-section="hero">
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow"><i /> {t("welcome.heroEyebrow")}</span>
              <h1>{t("welcome.heroStart")} <em>{t("welcome.heroEmphasis")}</em></h1>
              <p>{t("welcome.heroText")}</p>
              <div className="hero-actions">
                <Link className="button button--primary" to="/signup?role=candidate">{t("welcome.findOpportunity")} <ArrowIcon /></Link>
                <a className="button button--secondary" href="#purpose">{t("welcome.explorePurpose")}</a>
              </div>
              <div className="hero-trust">{trust.map((item) => <span key={item}><b>✓</b> {item}</span>)}</div>
            </div>
            <div className="hero-visual">
              <div className="hero-visual__glow" />
              <div className="hero-visual__frame"><img src={heroImage} alt={t("welcome.heroAlt")} /></div>
              <div className="floating-card floating-card--top"><span className="floating-icon">✦</span><div><strong>{t("welcome.strengths")}</strong><small>{t("welcome.potential")}</small></div></div>
              <div className="floating-card floating-card--bottom"><span className="match-ring">92<small>%</small></span><div><strong>{t("welcome.greatMatch")}</strong><small>{t("welcome.realTasks")}</small></div></div>
            </div>
          </div>
        </section>

        <section className="purpose-section section" id="purpose" data-voice-section="features">
          <div className="landing-container purpose-grid">
            <div><span className="section-kicker">{t("welcome.why")}</span><h2>{t("welcome.purposeTitle")}</h2></div>
            <div className="purpose-copy"><p>{t("welcome.purposeOne")}</p><p>{t("welcome.purposeTwo")}</p></div>
          </div>
          <div className="landing-container principles-grid">{principles.map((item, i) => <article className="principle-card" key={item.title}><span>0{i + 1}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        </section>

        <section className="process-section section" id="how-it-works" data-voice-section="accessibility">
          <div className="landing-container"><div className="section-heading section-heading--center"><span className="section-kicker">{t("welcome.howKicker")}</span><h2>{t("welcome.howTitle")}</h2><p>{t("welcome.howText")}</p></div>
            <div className="steps-grid">{steps.map((step) => <article className="step-card" key={step.number}><span className="step-number">{step.number}</span><div className="step-line" /><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
          </div>
        </section>

        <section className="paths-section section" id="paths">
          <div className="landing-container"><div className="section-heading section-heading--center"><span className="section-kicker">{t("welcome.chooseKicker")}</span><h2>{t("welcome.chooseTitle")}</h2></div>
            <div className="paths-grid">
              <article className="path-card path-card--candidate"><span className="path-label">{t("welcome.candidateLabel")}</span><h3>{t("welcome.candidateTitle")}</h3><p>{t("welcome.candidateText")}</p><ul>{candidateBenefits.map((item) => <li key={item}>{item}</li>)}</ul><Link className="button button--light" to="/signup?role=candidate">{t("welcome.candidateAction")} <ArrowIcon /></Link></article>
              <article className="path-card path-card--employer"><span className="path-label">{t("welcome.employerLabel")}</span><h3>{t("welcome.employerTitle")}</h3><p>{t("welcome.employerText")}</p><ul>{employerBenefits.map((item) => <li key={item}>{item}</li>)}</ul><Link className="button button--primary" to="/employers">{t("welcome.employerAction")} <ArrowIcon /></Link></article>
            </div>
          </div>
        </section>

        <section className="closing-cta"><div className="landing-container closing-cta__inner"><div><span className="section-kicker section-kicker--light">{t("welcome.closingKicker")}</span><h2>{t("welcome.closingTitle")}</h2><p>{t("welcome.closingText")}</p></div><div className="closing-cta__actions"><Link className="button button--light" to="/signup">{t("welcome.createAccount")} <ArrowIcon /></Link><Link className="button button--outline-light" to="/signin">{t("welcome.signIn")}</Link></div></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
