import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "../styles/voiceHelp.css";

export default function VoiceNavigationHelpPage() {
  const { t } = useTranslation("voiceHelp");
  const steps = t("steps", { returnObjects: true });
  const commandGroups = t("groups", { returnObjects: true });

  return (
    <main className="voice-help" data-voice-section="voice-help">
      <div className="voice-help__shell">
        <Link className="voice-help__back" to="/">{t("back")}</Link>
        <header className="voice-help__hero">
          <span>{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </header>

        <section className="voice-help__steps" aria-label={t("stepsLabel")}>
          {steps.map((step, index) => (
            <article key={step.title}>
              <b>{index + 1}</b>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </article>
          ))}
        </section>

        <section className="voice-help__commands" aria-label={t("commandsLabel")}>
          {commandGroups.map((group) => (
            <article key={group.title}>
              <h2>{group.title}</h2>
              <dl>
                {group.commands.map(([phrase, result]) => (
                  <div key={phrase}>
                    <dt dir="auto">“{phrase}”</dt>
                    <dd>{result}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </section>

        <aside className="voice-help__note" aria-labelledby="voice-grounding-heading">
          <h2 id="voice-grounding-heading">{t("groundingTitle")}</h2>
          <p>{t("groundingText")}</p>
        </aside>
        <aside className="voice-help__note" aria-labelledby="voice-version-heading">
          <h2 id="voice-version-heading">{t("versionTitle")}</h2>
          <p>{t("versionText")}</p>
        </aside>
        <aside className="voice-help__note voice-help__note--conversation" aria-labelledby="voice-follow-up-heading">
          <h2 id="voice-follow-up-heading">{t("followupTitle")}</h2>
          <p>{t("followupText")}</p>
        </aside>
        <aside className="voice-help__note" aria-labelledby="voice-form-heading">
          <h2 id="voice-form-heading">{t("formsTitle")}</h2>
          <p>{t("formsText")}</p>
        </aside>
      </div>
    </main>
  );
}
