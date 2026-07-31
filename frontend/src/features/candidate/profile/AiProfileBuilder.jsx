import { useEffect, useRef, useState } from "react";
import {
  confirmAiProfileSuggestions,
  requestAiProfileSuggestions,
  transcribeProfileAudio,
} from "../../../services/candidateProfileApi";
import "./aiProfileBuilder.css";

const FIELD_LABELS = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone",
  location: "Location",
  about: "About you",
};

function confidenceLabel(value) {
  if (value >= 0.8) return "High confidence";
  if (value >= 0.55) return "Medium confidence";
  return "Low confidence";
}

export default function AiProfileBuilder({ currentProfile = {}, onProfileConfirmed }) {
  const [language, setLanguage] = useState("en");
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
  const resultsHeadingRef = useRef(null);

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
      setError("Audio recording is not supported by this browser. You can type your description instead.");
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
          setError("No audio was captured. Please try again or type your description.");
          return;
        }
        try {
          setBusy("transcribing");
          const data = await transcribeProfileAudio(blob, language);
          setNarrative((current) => current.trim()
            ? `${current.trim()}\n${data.transcript}`
            : data.transcript);
          setStatus("Transcript added. Review and edit it before asking for suggestions.");
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy("");
        }
      };
      recorder.start();
      setBusy("recording");
      setStatus("Recording started. Press Stop recording when you finish.");
    } catch (err) {
      stopStream();
      setError(err.name === "NotAllowedError"
        ? "Microphone permission was denied. Allow access or type your description."
        : "The microphone could not be started. You can type your description instead.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setBusy("transcribing");
      setStatus("Recording stopped. Creating an editable transcript.");
    }
  }

  async function analyseNarrative() {
    if (!consent) {
      setError("Confirm consent before sending your description to the AI profile assistant.");
      return;
    }
    if (narrative.trim().length < 10) {
      setError("Enter at least 10 characters about yourself.");
      return;
    }
    try {
      setBusy("analysing");
      setError("");
      setStatus("Analysing your description. Nothing is saved at this stage.");
      const data = await requestAiProfileSuggestions({
        narrative: narrative.trim(),
        language,
        consent: true,
      });
      const next = data.suggestions || {};
      setSuggestions(next);
      setAccepted({});
      setFieldValues(Object.fromEntries(
        (next.profileFields || []).map((item, index) => [`field-${index}`, item.value]),
      ));
      setStatus(data.message || "Suggestions are ready for review.");
      requestAnimationFrame(() => resultsHeadingRef.current?.focus());
    } catch (err) {
      setError(err.message);
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
      setError("Select at least one suggestion to add to your profile.");
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
      setStatus(data.message || "Confirmed suggestions were saved.");
      setSuggestions(null);
      setAccepted({});
      onProfileConfirmed?.(data.profile);
    } catch (err) {
      setError(err.message);
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
          <span className="ai-profile-builder__eyebrow">Optional AI assistance</span>
          <h2 id="ai-profile-title">Describe yourself in your own words</h2>
          <p>Speak or type in English, French, or Arabic. You edit the transcript and approve every suggestion before it is saved.</p>
        </div>
        <span className="ai-profile-builder__badge">Human reviewed</span>
      </div>

      <div className="ai-profile-builder__controls">
        <label>
          <span>Spoken and written language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={Boolean(busy)}>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
          </select>
        </label>
        <div className="ai-profile-builder__recording" aria-label="Audio recording controls">
          {busy === "recording" ? (
            <button type="button" className="ai-profile-builder__stop" onClick={stopRecording}>
              Stop recording
            </button>
          ) : (
            <button type="button" onClick={startRecording} disabled={Boolean(busy)}>
              Use microphone
            </button>
          )}
          <span>Audio is transcribed, then discarded by this application.</span>
        </div>
      </div>

      <label className="ai-profile-builder__narrative">
        <span>Your editable description or transcript</span>
        <textarea
          rows="7"
          maxLength="4000"
          dir={language === "ar" ? "rtl" : "ltr"}
          value={narrative}
          onChange={(event) => setNarrative(event.target.value)}
          placeholder="For example: where you live, your education, the tasks you can do, your experience, and your work goals."
        />
        <small>{narrative.length} / 4000 characters</small>
      </label>

      <label className="ai-profile-builder__consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>I agree to send this text to the AI assistant to create reviewable profile suggestions. It will not change my profile automatically.</span>
      </label>

      <button
        type="button"
        className="ai-profile-builder__analyse"
        onClick={analyseNarrative}
        disabled={Boolean(busy)}
      >
        {busy === "analysing" ? "Creating suggestions…" : "Create profile suggestions"}
      </button>

      <div className="ai-profile-builder__messages" aria-live="polite" aria-atomic="true">
        {status && <p className="ai-profile-builder__status">{status}</p>}
        {error && <p className="ai-profile-builder__error" role="alert">{error}</p>}
      </div>

      {suggestions && (
        <div className="ai-profile-builder__review">
          <h3 ref={resultsHeadingRef} tabIndex="-1">Review {suggestionCount} suggestion{suggestionCount === 1 ? "" : "s"}</h3>
          <p>Nothing below is selected. Check only information that is accurate and that you want to add.</p>

          {(suggestions.profileFields || []).map((item, index) => {
            const key = `field-${index}`;
            return (
              <div className="ai-profile-builder__suggestion" key={key}>
                <label className="ai-profile-builder__choice">
                  <input type="checkbox" checked={Boolean(accepted[key])} onChange={() => toggleAccepted(key)} />
                  <strong>Add {FIELD_LABELS[item.field] || item.field}</strong>
                </label>
                <label className="ai-profile-builder__edit">
                  <span>Edit suggested value</span>
                  {item.field === "about" ? (
                    <textarea rows="3" value={fieldValues[key] || ""} onChange={(event) => setFieldValues((current) => ({ ...current, [key]: event.target.value }))} />
                  ) : (
                    <input value={fieldValues[key] || ""} onChange={(event) => setFieldValues((current) => ({ ...current, [key]: event.target.value }))} />
                  )}
                </label>
                <small>{confidenceLabel(item.confidence)} · Evidence: {item.evidence}</small>
              </div>
            );
          })}

          {suggestions.educationLevel && (
            <div className="ai-profile-builder__suggestion">
              <label className="ai-profile-builder__choice">
                <input type="checkbox" checked={Boolean(accepted.education)} onChange={() => toggleAccepted("education")} />
                <strong>Add education: {suggestions.educationLevel.value.replaceAll("_", " ")}</strong>
              </label>
              <small>{confidenceLabel(suggestions.educationLevel.confidence)} · Evidence: {suggestions.educationLevel.evidence}</small>
            </div>
          )}

          {(suggestions.disabilities || []).map((item, index) => {
            const key = `disability-${index}`;
            return (
              <div className="ai-profile-builder__suggestion" key={key}>
                <label className="ai-profile-builder__choice">
                  <input type="checkbox" checked={Boolean(accepted[key])} onChange={() => toggleAccepted(key)} />
                  <strong>Add disability selection: {item.name}</strong>
                </label>
                <small>{confidenceLabel(item.confidence)} · Explicit statement: {item.evidence}</small>
              </div>
            );
          })}

          {(suggestions.taskSkills || []).map((item, index) => {
            const key = `skill-${index}`;
            return (
              <div className="ai-profile-builder__suggestion" key={key}>
                <label className="ai-profile-builder__choice">
                  <input type="checkbox" checked={Boolean(accepted[key])} onChange={() => toggleAccepted(key)} />
                  <strong>Add task skill: {item.task_name || item.taskName}</strong>
                </label>
                <span className="ai-profile-builder__job">{item.job_name || item.jobName}</span>
                <small>{confidenceLabel(item.confidence)} · Evidence: {item.evidence}</small>
              </div>
            );
          })}

          {(suggestions.unmappedStatements || []).length > 0 && (
            <div className="ai-profile-builder__unmapped">
              <h4>Useful details that were not mapped automatically</h4>
              <ul>{suggestions.unmappedStatements.map((item) => <li key={item}>{item}</li>)}</ul>
              <p>You can add these details manually to “About you.”</p>
            </div>
          )}

          {suggestionCount === 0 && <p>No safe catalogue-backed suggestions were found. Your text was not saved.</p>}
          {suggestionCount > 0 && (
            <button type="button" className="ai-profile-builder__confirm" onClick={confirmSelected} disabled={Boolean(busy)}>
              {busy === "saving" ? "Saving confirmed items…" : "Add selected suggestions to my profile"}
            </button>
          )}
        </div>
      )}

      {(currentProfile.confirmedTaskSkills || []).length > 0 && (
        <div className="ai-profile-builder__confirmed">
          <h3>Your confirmed task skills</h3>
          <ul>
            {currentProfile.confirmedTaskSkills.map((skill) => (
              <li key={skill.taskId}>
                <strong>{skill.taskName}</strong>
                <span>{skill.jobName}</span>
              </li>
            ))}
          </ul>
          <p>These details enrich your profile but do not change the current compatibility formula.</p>
        </div>
      )}
    </section>
  );
}
