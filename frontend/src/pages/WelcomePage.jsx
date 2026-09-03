import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ArrowIcon from "../components/common/ArrowIcon";
import SiteHeader from "../components/layout/SiteHeader";
import SiteFooter from "../components/layout/SiteFooter";
import { getPublicOverview } from "../services/publicOverviewApi";
import { localizeJobDefinition } from "../i18n/jobDefinitions";
import "../styles/landing.css";

const JOB_TYPE_KEYS = {
  "full-time": "fullTime",
  "part-time": "partTime",
  internship: "internship",
  seasonal: "seasonal",
};

const WORK_MODE_KEYS = {
  "on-site": "onSite",
  hybrid: "hybrid",
  remote: "remote",
};

export default function WelcomePage() {
  const { t, i18n } = useTranslation("public");
  const [overview, setOverview] = useState({ status: "loading", data: null });
  const steps = t("welcome.steps", { returnObjects: true });
  const principles = t("welcome.principles", { returnObjects: true });
  const trust = t("welcome.trust", { returnObjects: true });
  const candidateBenefits = t("welcome.candidateBenefits", { returnObjects: true });
  const employerBenefits = t("welcome.employerBenefits", { returnObjects: true });
  const matchingSteps = t("welcome.matchingSteps", { returnObjects: true });
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.resolvedLanguage || "en"),
    [i18n.resolvedLanguage],
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.resolvedLanguage || "en", { dateStyle: "medium" }),
    [i18n.resolvedLanguage],
  );

  useEffect(() => {
    let active = true;

    getPublicOverview()
      .then((data) => {
        if (active) setOverview({ status: "ready", data });
      })
      .catch(() => {
        if (active) setOverview({ status: "error", data: null });
      });

    return () => { active = false; };
  }, []);

  const localizeOption = (value, keys, translationGroup) => {
    const key = keys[String(value || "").toLowerCase()];
    return key ? t(`welcome.opportunities.${translationGroup}.${key}`) : value;
  };

  const statistics = overview.data ? [
    {
      key: "registeredCandidates",
      value: overview.data.stats.registeredCandidates,
      label: t("welcome.opportunities.stats.candidates.label"),
      description: t("welcome.opportunities.stats.candidates.description"),
    },
    {
      key: "publishedJobPosts",
      value: overview.data.stats.publishedJobPosts,
      label: t("welcome.opportunities.stats.posts.label"),
      description: t("welcome.opportunities.stats.posts.description"),
    },
    {
      key: "activeJobDescriptions",
      value: overview.data.stats.activeJobDescriptions,
      label: t("welcome.opportunities.stats.descriptions.label"),
      description: t("welcome.opportunities.stats.descriptions.description"),
    },
  ] : [];

  return (
    <div className="landing-page">
      <SiteHeader />
      <main>
        <section className="hero-section" id="hero" data-voice-section="hero">
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow"><i /> {t("welcome.heroEyebrow")}</span>
              <h1>{t("welcome.heroStart")} <strong>{t("welcome.heroEmphasis")}</strong></h1>
              <p>{t("welcome.heroText")}</p>
              <div className="hero-actions">
                <Link className="button button--primary" to="/signup?role=candidate">{t("welcome.findOpportunity")} <ArrowIcon /></Link>
                <Link className="button button--secondary" to="/employers">{t("welcome.forEmployersAction")}</Link>
              </div>
              <div className="hero-trust">{trust.map((item) => <span key={item}><b>✓</b> {item}</span>)}</div>
            </div>
            <aside className="matching-preview" aria-labelledby="matching-preview-title">
              <div className="matching-preview__header">
                <span className="matching-preview__label">{t("welcome.matchingLabel")}</span>
                <h2 id="matching-preview-title">{t("welcome.matchingTitle")}</h2>
                <p>{t("welcome.matchingText")}</p>
              </div>
              <ol className="matching-preview__steps">
                {matchingSteps.map((step, index) => (
                  <li key={step.title}>
                    <span className="matching-preview__number" aria-hidden="true">{index + 1}</span>
                    <div><h3>{step.title}</h3><p>{step.text}</p></div>
                  </li>
                ))}
              </ol>
              <p className="matching-preview__note">{t("welcome.matchingNote")}</p>
            </aside>
          </div>
        </section>

        <section className="mission-vision-section" id="mission-vision" aria-labelledby="mission-vision-title">
          <div className="landing-container">
            <h2 id="mission-vision-title" className="visually-hidden">{t("welcome.missionVisionTitle")}</h2>
            <div className="mission-vision-grid">
              <article className="mission-vision-card">
                <span className="mission-vision-card__label">{t("welcome.visionTitle")}</span>
                <p>{t("welcome.visionText")}</p>
              </article>
              <article className="mission-vision-card">
                <span className="mission-vision-card__label">{t("welcome.missionTitle")}</span>
                <p>{t("welcome.missionText")}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="opportunity-section section" id="opportunities" aria-labelledby="opportunity-title">
          <div className="landing-container">
            <div className="opportunity-heading">
              <div>
                <span className="section-kicker">{t("welcome.opportunities.kicker")}</span>
                <h2 id="opportunity-title">{t("welcome.opportunities.title")}</h2>
                <p>{t("welcome.opportunities.intro")}</p>
              </div>
              <Link
                className="button button--secondary"
                to="/signin"
                aria-label={t("welcome.opportunities.viewAllAccessible")}
              >
                {t("welcome.opportunities.viewAll")} <ArrowIcon />
              </Link>
            </div>

            {overview.status === "loading" && (
              <p className="opportunity-status" role="status" aria-live="polite">
                {t("welcome.opportunities.loading")}
              </p>
            )}

            {overview.status === "error" && (
              <p className="opportunity-status opportunity-status--error" role="status">
                {t("welcome.opportunities.error")}
              </p>
            )}

            {overview.status === "ready" && (
              <>
                <dl className="platform-statistics" aria-label={t("welcome.opportunities.statsLabel")}>
                  {statistics.map((statistic) => (
                    <div className="platform-statistic" key={statistic.key}>
                      <dt>{statistic.label}</dt>
                      <dd>
                        <strong>{numberFormatter.format(statistic.value)}</strong>
                        <span>{statistic.description}</span>
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="latest-jobs-heading">
                  <div>
                    <span>{t("welcome.opportunities.latestKicker")}</span>
                    <h3>{t("welcome.opportunities.latestTitle")}</h3>
                  </div>
                  <p>{t("welcome.opportunities.latestDescription")}</p>
                </div>

                {overview.data.latestJobs.length > 0 ? (
                  <div className="latest-jobs-grid">
                    {overview.data.latestJobs.map((job) => {
                      const localizedTitle = localizeJobDefinition(t, job);
                      return <article className="latest-job-card" key={job.id}>
                        <div className="latest-job-card__main">
                          <h4>{localizedTitle}</h4>
                          <p>{job.companyName || t("welcome.opportunities.employerFallback")}</p>
                        </div>
                        <ul className="latest-job-card__meta" aria-label={t("welcome.opportunities.jobDetails", { title: localizedTitle })}>
                          {job.location && <li>{job.location}</li>}
                          {job.jobType && <li>{localizeOption(job.jobType, JOB_TYPE_KEYS, "jobTypes")}</li>}
                          {job.workMode && <li>{localizeOption(job.workMode, WORK_MODE_KEYS, "workModes")}</li>}
                        </ul>
                        {job.createdAt && (
                          <p className="latest-job-card__date">
                            {t("welcome.opportunities.posted", { date: dateFormatter.format(new Date(job.createdAt)) })}
                          </p>
                        )}
                      </article>;
                    })}
                  </div>
                ) : (
                  <p className="opportunity-status">{t("welcome.opportunities.empty")}</p>
                )}
              </>
            )}
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
