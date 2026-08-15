import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  confirmAiProfileSuggestions,
  requestAiProfileSuggestions,
  transcribeProfileAudio,
} from "../../../services/candidateProfileApi";
import { PRIVACY_VERSION } from "../../../privacy";
import { normalizeLocale, SUPPORTED_LOCALES } from "../../../i18n/locales";
import "./aiProfileBuilder.css";

export default function AiProfileBuilder({ currentProfile = {}, onProfileConfirmed }) {
  const { t, i18n } = useTranslation("profile");
  const language = normalizeLocale(i18n.resolvedLanguage) || "en";
  const [narrative, setNarrative] = useState("");
  const [consent, setConsent] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [accepted, setAccepted] = useState({});
  const [fieldValues, setFieldValues] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const narrativeRef = useRef(null);
  const consentRef = useRef(null);
  const errorRef = useRef(null);
  const resultsHeadingRef = useRef(null);

  function confidenceLabel(value) {
    if (value >= 0.8) return t("confidence.high");
    if (value >= 0.55) return t("confidence.medium");
    return t("confidence.low");
  }

  function showError(message, controlRef) {
    setError(message);
    setStatus("");
    requestAnimationFrame(() => (controlRef?.current || errorRef.current)?.focus());
  }

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    setError("");
    setStatus("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      showError(t("errors.unsupported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stopStream();
        if (!blob.size) {
          setBusy("");
          setError(t("errors.emptyAudio"));
          return;
        }
        try {
          setBusy("transcribing");
          const data = await transcribeProfileAudio(blob, language);
          setNarrative((current) => current.trim()
            ? `${current.trim()}\n${data.transcript}`
            : data.transcript);
          setStatus(t("status.transcriptAdded"));
        } catch {
          setError(t("errors.transcription"));
        } finally {
          setBusy("");
        }
      };
      recorder.start();
      setBusy("recording");
      setStatus(t("status.recordingStarted"));
    } catch (err) {
      stopStream();
      setError(err.name === "NotAllowedError"
        ? t("errors.permission")
        : t("errors.microphone"));
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setBusy("transcribing");
      setStatus(t("status.recordingStopped"));
    }
  }

  async function analyseNarrative() {
    if (!consent) {
      showError(t("errors.consent"), consentRef);
      return;
    }
    if (narrative.trim().length < 10) {
      showError(t("errors.narrative"), narrativeRef);
      return;
    }
    try {
      setBusy("analysing");
      setError("");
      setStatus(t("status.analysing"));
      const data = await requestAiProfileSuggestions({
        narrative: narrative.trim(),
        language,
        consent: true,
        consentVersion: PRIVACY_VERSION,
      });
      const next = data.suggestions || {};
      setSuggestions(next);
      setAccepted({});
      setFieldValues(Object.fromEntries(
        (next.profileFields || []).map((item, index) => [`field-${index}`, item.value]),
      ));
      setStatus(t("status.suggestionsReady"));
      requestAnimationFrame(() => resultsHeadingRef.current?.focus());
    } catch {
      setError(t("errors.analysis"));
      setStatus("");
    } finally {
      setBusy("");
    }
  }

  function toggleAccepted(key) {
    setAccepted((current) => ({ ...current, [key]: !current[key] }));
  }

  async function confirmSelected() {
    const profileFields = {};
    (suggestions?.profileFields || []).forEach((item, index) => {
      if (accepted[`field-${index}`]) profileFields[item.field] = fieldValues[`field-${index}`];
    });
    const educationLevel = accepted.education ? suggestions?.educationLevel?.value : null;
    const disabilities = (suggestions?.disabilities || [])
      .filter((_, index) => accepted[`disability-${index}`])
      .map((item) => item.name);
    const taskSkills = (suggestions?.taskSkills || [])
      .filter((_, index) => accepted[`skill-${index}`])
      .map((item) => ({
        taskId: item.task_id ?? item.taskId,
        note: item.note || item.evidence || "",
      }));
    if (!Object.keys(profileFields).length && !educationLevel && !disabilities.length && !taskSkills.length) {
      showError(t("errors.selection"), resultsHeadingRef);
      return;
    }

    try {
      setBusy("saving");
      setError("");
      const data = await confirmAiProfileSuggestions({
        profileFields,
        educationLevel,
        disabilities,
        taskSkills,
        language,
      });
      setStatus(t("status.saved"));
      setSuggestions(null);
      setAccepted({});
      onProfileConfirmed?.(data.profile);
    } catch {
      setError(t("errors.save"));
    } finally {
      setBusy("");
    }
  }

  const suggestionCount = (suggestions?.profileFields?.length || 0)
    + (suggestions?.educationLevel ? 1 : 0)
    + (suggestions?.disabilities?.length || 0)
    + (suggestions?.taskSkills?.length || 0);

  return (
    <section className="ai-profile-builder" aria-labelledby="ai-profile-title">
      <div className="ai-profile-builder__heading">
        <div>
          <span className="ai-profile-builder__eyebrow">{t("eyebrow")}</span>
          <h2 id="ai-profile-title">{t("title")}</h2>
          <p>{t("intro")}</p>
        </div>
        <span className="ai-profile-builder__badge">{t("humanReviewed")}</span>
      </div>

      <div className="ai-profile-builder__controls">
        <div className="ai-profile-builder__language" aria-live="polite">
          <span>{t("activeLanguage", { language: SUPPORTED_LOCALES[language].nativeName })}</span>
        </div>
        <div className="ai-profile-builder__recording" aria-label={t("recordingControls")}>
          {busy === "recording" ? (
            <button type="button" className="ai-profile-builder__stop" onClick={stopRecording}>
              {t("stopRecording")}
            </button>
          ) : (
            <button type="button" onClick={startRecording} disabled={Boolean(busy)}>
              {t("useMicrophone")}
            </button>
          )}
          <span>{t("audioDisclosure")}</span>
        </div>
      </div>

      <label className="ai-profile-builder__narrative">
        <span>{t("narrativeLabel")}</span>
        <textarea
          ref={narrativeRef}
          rows="7"
          maxLength="4000"
          aria-describedby="ai-profile-narrative-help ai-profile-narrative-count"
          aria-invalid={Boolean(error && narrative.trim().length < 10)}
          dir={language === "ar" ? "rtl" : "ltr"}
          value={narrative}
          onChange={(event) => setNarrative(event.target.value)}
          placeholder={t("narrativePlaceholder")}
        />
        <small id="ai-profile-narrative-count">{t("characterCount", { count: narrative.length })}</small>
      </label>
      <p id="ai-profile-narrative-help" className="ai-profile-builder__sr-only">{t("narrativeHelp")}</p>

      <label className="ai-profile-builder__consent">
        <input
          ref={consentRef}
          type="checkbox"
          checked={consent}
          aria-invalid={Boolean(error && !consent)}
          aria-describedby="ai-profile-consent-help"
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span id="ai-profile-consent-help"><Trans
          t={t}
          i18nKey="consent"
          components={{ privacyLink: <a href="/privacy" target="_blank" rel="noreferrer" /> }}
        /></span>
      </label>

      <button
        type="button"
        className="ai-profile-builder__analyse"
        onClick={analyseNarrative}
        disabled={Boolean(busy)}
      >
        {busy === "analysing" ? t("creating") : t("create")}
      </button>

      <div className="ai-profile-builder__messages" aria-live="polite" aria-atomic="true">
        {status && <p className="ai-profile-builder__status" role="status">{status}</p>}
        {error && <p ref={errorRef} tabIndex="-1" className="ai-profile-builder__error" role="alert">{error}</p>}
      </div>

      {suggestions && (
        <div className="ai-profile-builder__review">
          <h3 ref={resultsHeadingRef} tabIndex="-1">{t("review", { count: suggestionCount })}</h3>
          <p>{t("reviewHelp")}</p>

          {(suggestions.profileFields || []).map((item, index) => {
            const key = `field-${index}`;
            return (
              <div className="ai-profile-builder__suggestion" key={key}>
                <label className="ai-profile-builder__choice">
                  <input type="checkbox" checked={Boolean(accepted[key])} onChange={() => toggleAccepted(key)} />
                  <strong>{t("addField", { field: t(`fields.${item.field}`, { defaultValue: item.field }) })}</strong>
                </label>
                <label className="ai-profile-builder__edit">
                  <span>{t("editValue")}</span>
                  {item.field === "about" ? (
                    <textarea rows="3" dir="auto" value={fieldValues[key] || ""} onChange={(event) => setFieldValues((current) => ({ ...current, [key]: event.target.value }))} />
                  ) : (
                    <input dir="auto" value={fieldValues[key] || ""} onChange={(event) => setFieldValues((current) => ({ ...current, [key]: event.target.value }))} />
                  )}
                </label>
                <small dir="auto">{t("confidenceEvidence", { confidence: confidenceLabel(item.confidence), evidence: item.evidence })}</small>
              </div>
            );
          })}

          {suggestions.educationLevel && (
            <div className="ai-profile-builder__suggestion">
              <label className="ai-profile-builder__choice">
                <input type="checkbox" checked={Boolean(accepted.education)} onChange={() => toggleAccepted("education")} />
                <strong>{t("addEducation", { education: t(`education.${suggestions.educationLevel.value}`) })}</strong>
              </label>
              <small dir="auto">{t("confidenceEvidence", { confidence: confidenceLabel(suggestions.educationLevel.confidence), evidence: suggestions.educationLevel.evidence })}</small>
            </div>
          )}

          {(suggestions.disabilities || []).map((item, index) => {
            const key = `disability-${index}`;
            return (
              <div className="ai-profile-builder__suggestion" key={key}>
                <label className="ai-profile-builder__choice">
                  <input type="checkbox" checked={Boolean(accepted[key])} onChange={() => toggleAccepted(key)} />
                  <strong dir="auto">{t("addDisability", { name: item.name })}</strong>
                </label>
                <small dir="auto">{t("explicitEvidence", { confidence: confidenceLabel(item.confidence), evidence: item.evidence })}</small>
              </div>
            );
          })}

          {(suggestions.taskSkills || []).map((item, index) => {
            const key = `skill-${index}`;
            return (
              <div className="ai-profile-builder__suggestion" key={key}>
                <label className="ai-profile-builder__choice">
                  <input type="checkbox" checked={Boolean(accepted[key])} onChange={() => toggleAccepted(key)} />
                  <strong dir="auto">{t("addTaskSkill", { name: item.task_name || item.taskName })}</strong>
                </label>
                <span className="ai-profile-builder__job" dir="auto">{item.job_name || item.jobName}</span>
                <small dir="auto">{t("confidenceEvidence", { confidence: confidenceLabel(item.confidence), evidence: item.evidence })}</small>
              </div>
            );
          })}

          {(suggestions.unmappedStatements || []).length > 0 && (
            <div className="ai-profile-builder__unmapped">
              <h4>{t("unmappedTitle")}</h4>
              <ul>{suggestions.unmappedStatements.map((item) => <li key={item} dir="auto">{item}</li>)}</ul>
              <p>{t("unmappedHelp")}</p>
            </div>
          )}

          {suggestionCount === 0 && <p>{t("noSuggestions")}</p>}
          {suggestionCount > 0 && (
            <button type="button" className="ai-profile-builder__confirm" onClick={confirmSelected} disabled={Boolean(busy)}>
              {busy === "saving" ? t("saving") : t("confirm")}
            </button>
          )}
        </div>
      )}

      {(currentProfile.confirmedTaskSkills || []).length > 0 && (
        <div className="ai-profile-builder__confirmed">
          <h3>{t("confirmedSkills")}</h3>
          <ul>
            {currentProfile.confirmedTaskSkills.map((skill) => (
              <li key={skill.taskId}>
                <strong dir="auto">{skill.taskName}</strong>
                <span dir="auto">{skill.jobName}</span>
              </li>
            ))}
          </ul>
          <p>{t("scoringBoundary")}</p>
        </div>
      )}
    </section>
  );
}
