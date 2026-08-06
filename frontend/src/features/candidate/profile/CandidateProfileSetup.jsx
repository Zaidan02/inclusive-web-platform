import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Brand from "../../../components/common/Brand";
import { getCandidateProfile, updateCandidateProfile } from "../../../services/candidateProfileApi";
import AiProfileBuilder from "./AiProfileBuilder";
import { isCandidateProfileComplete } from "./profileCompletion";
import { disabilityOptions } from "./profileOptions";
import "./candidateProfile.css";

export default function CandidateProfileSetup() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [educationLevel, setEducationLevel] = useState("");
  const [basicInfo, setBasicInfo] = useState({ firstName: "", lastName: "", phone: "", location: "", about: "" });
  const [confirmedTaskSkills, setConfirmedTaskSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attemptedSave, setAttemptedSave] = useState(false);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const locationRef = useRef(null);
  const educationRef = useRef(null);
  const searchRef = useRef(null);
  const errorRef = useRef(null);
  const voiceActionHandlerRef = useRef(null);

  useEffect(() => {
    let active = true;
    getCandidateProfile()
      .then((data) => {
        if (!active) return;
        const profile = data.profile || data;
        if (isCandidateProfileComplete(profile)) {
          navigate("/candidate", { replace: true });
          return;
        }
        setSelected(profile.selectedDisabilities || []);
        setEducationLevel(profile.educationLevel || "");
        setBasicInfo({ firstName: profile.firstName || "", lastName: profile.lastName || "", phone: profile.phone || "", location: profile.location || "", about: profile.about || "" });
        setConfirmedTaskSkills(profile.confirmedTaskSkills || []);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [navigate]);

  const filteredOptions = useMemo(() => disabilityOptions.filter(({ name }) => name.toLowerCase().includes(search.toLowerCase())), [search]);

  function toggleOption(name) {
    setError("");
    setAttemptedSave(false);
    setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  function applyConfirmedProfile(profile) {
    if (!profile) return;
    setSelected(profile.selectedDisabilities || []);
    setEducationLevel(profile.educationLevel || "");
    setBasicInfo({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      phone: profile.phone || "",
      location: profile.location || "",
      about: profile.about || "",
    });
    setConfirmedTaskSkills(profile.confirmedTaskSkills || []);
    setError("");
  }

  async function completeSetup() {
    if (!selected.length || !educationLevel || !basicInfo.firstName.trim() || !basicInfo.lastName.trim() || !basicInfo.location.trim()) {
      setAttemptedSave(true);
      setError("Add your name, location, education level, and at least one disability.");
      const missingControl = !basicInfo.firstName.trim() ? firstNameRef
        : !basicInfo.lastName.trim() ? lastNameRef
        : !basicInfo.location.trim() ? locationRef
        : !educationLevel ? educationRef
        : searchRef;
      window.requestAnimationFrame(() => {
        missingControl.current?.focus();
      });
      return;
    }
    try {
      setSaving(true);
      setError("");
      await updateCandidateProfile({ selectedDisabilities: selected, educationLevel, ...basicInfo });
      navigate("/candidate", { replace: true });
    } catch (err) {
      setError(err.message);
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSaving(false);
    }
  }

  voiceActionHandlerRef.current = (event) => {
      const { action } = event.detail;
      if (!action) return;
      const fieldMap = { first_name: "firstName", last_name: "lastName", location: "location", phone: "phone", about: "about" };
      const respond = (feedback) => {
        event.detail.handled = true;
        event.detail.feedback = feedback;
      };
      const highlight = (target) => requestAnimationFrame(() => {
        const control = document.querySelector(`[data-voice-control="${target}"]`);
        control?.focus?.();
        control?.classList.add("voice-action-highlight");
        window.setTimeout(() => control?.classList.remove("voice-action-highlight"), 1800);
      });

      if (action.type === "set_field" || action.type === "clear_field") {
        const value = action.type === "clear_field" ? "" : action.value;
        if (fieldMap[action.target]) setBasicInfo((current) => ({ ...current, [fieldMap[action.target]]: value }));
        else if (action.target === "disability_search") setSearch(value);
        else return;
        respond(`I set ${action.label} to ${value}. Please check it.`);
        highlight(action.target);
      } else if (action.type === "select_option" && action.target === "education_level") {
        setEducationLevel(action.value);
        respond(`I selected ${action.value.replaceAll("_", " ")} for education level. Please check it.`);
        highlight(action.target);
      } else if (action.type === "toggle_option" && action.target === "disabilities") {
        toggleOption(action.value);
        respond(`I changed the ${action.value} selection. Please check it.`);
        highlight("disabilities");
      } else if (action.type === "press" && action.target === "complete_setup") {
        completeSetup();
        respond("Completing the candidate profile setup.");
      }
  };

  useEffect(() => {
    function handleVoiceAction(event) {
      voiceActionHandlerRef.current?.(event);
    }
    window.addEventListener("join:voice-action", handleVoiceAction);
    return () => window.removeEventListener("join:voice-action", handleVoiceAction);
  }, []);

  return (
    <main className="profile-setup">
      <header className="profile-setup__header"><Brand /><span>Candidate profile setup</span></header>
      <section className="profile-setup__shell" data-voice-section="candidate-setup">
        <div className="profile-setup__intro">
          <span className="profile-setup__step">Step 1 of 1</span>
          <h1>Let’s build your ability-led profile.</h1>
          <p>Select the options that apply to you. This helps JoIn make opportunities and tasks easier to evaluate for your needs.</p>
          <div className="profile-setup__privacy"><strong>Your profile, your choice</strong><span>You can review and update these selections later from My Profile.</span></div>
        </div>
        <div className="profile-setup__card">
          <AiProfileBuilder
            currentProfile={{ ...basicInfo, educationLevel, selectedDisabilities: selected, confirmedTaskSkills }}
            onProfileConfirmed={applyConfirmedProfile}
          />
          <div className="profile-setup__card-header"><div><span className="profile-setup__eyebrow">Profile information</span><h2>Select your disabilities</h2><p>Choose all that apply.</p></div><span className="profile-setup__count">{selected.length} selected</span></div>
          <div className="profile-setup__fields"><label><strong>First name</strong><input ref={firstNameRef} data-voice-control="first_name" value={basicInfo.firstName} required aria-invalid={attemptedSave && !basicInfo.firstName.trim()} aria-describedby={attemptedSave && !basicInfo.firstName.trim() ? "profile-setup-error" : undefined} onChange={(e) => { setBasicInfo((p) => ({ ...p, firstName: e.target.value })); setAttemptedSave(false); }} /></label><label><strong>Last name</strong><input ref={lastNameRef} data-voice-control="last_name" value={basicInfo.lastName} required aria-invalid={attemptedSave && !basicInfo.lastName.trim()} aria-describedby={attemptedSave && !basicInfo.lastName.trim() ? "profile-setup-error" : undefined} onChange={(e) => { setBasicInfo((p) => ({ ...p, lastName: e.target.value })); setAttemptedSave(false); }} /></label><label><strong>Location</strong><input ref={locationRef} data-voice-control="location" value={basicInfo.location} required aria-invalid={attemptedSave && !basicInfo.location.trim()} aria-describedby={attemptedSave && !basicInfo.location.trim() ? "profile-setup-error" : undefined} onChange={(e) => { setBasicInfo((p) => ({ ...p, location: e.target.value })); setAttemptedSave(false); }} placeholder="City, region" /></label><label><strong>Phone <small>(optional)</small></strong><input type="tel" data-voice-control="phone" value={basicInfo.phone} onChange={(e) => setBasicInfo((p) => ({ ...p, phone: e.target.value }))} /></label></div>
          <label style={{ display: "grid", gap: "6px", marginBottom: "14px" }}><strong>About you <small>(optional)</small></strong><textarea data-voice-control="about" value={basicInfo.about} onChange={(e) => setBasicInfo((p) => ({ ...p, about: e.target.value }))} rows="3" placeholder="A short introduction, interests, or work goals" style={{ padding: "12px", border: "1px solid #dbe3ef", borderRadius: "10px", resize: "vertical" }} /></label>
          <label className="profile-setup__education"><strong>Highest education level</strong><select ref={educationRef} data-voice-control="education_level" value={educationLevel} required aria-invalid={attemptedSave && !educationLevel} aria-describedby={attemptedSave && !educationLevel ? "profile-setup-error" : undefined} onChange={(event) => { setEducationLevel(event.target.value); setAttemptedSave(false); }}><option value="">Select education level</option><option value="none">No formal education</option><option value="primary">Primary school</option><option value="middle_school">Middle school</option><option value="high_school">High school</option><option value="vocational">Vocational or technical education</option><option value="university">University</option></select></label>
          <label className="profile-setup__search"><span aria-hidden="true">⌕</span><input ref={searchRef} data-voice-control="disability_search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search options" aria-label="Search disability options" aria-describedby={attemptedSave && !selected.length ? "profile-setup-error" : undefined} /></label>
          {loading ? <div className="profile-setup__state">Loading your profile…</div> : (
            <div className="profile-options" data-voice-control="disabilities">{filteredOptions.map((option) => {
              const checked = selected.includes(option.name);
              return <button type="button" className={`profile-option ${checked ? "profile-option--selected" : ""}`} aria-pressed={checked} onClick={() => toggleOption(option.name)} key={option.name}><span className="profile-option__check">{checked ? "✓" : ""}</span><img src={option.image} alt="" /><strong>{option.name}</strong></button>;
            })}</div>
          )}
          {error && <p ref={errorRef} id="profile-setup-error" tabIndex="-1" className="profile-setup__error" role="alert">{error}</p>}
          <div className="profile-setup__footer"><span>You can change this later.</span><button data-voice-control="complete_setup" type="button" onClick={completeSetup} disabled={loading || saving}>{saving ? "Saving profile…" : "Complete setup"}<span aria-hidden="true">→</span></button></div>
        </div>
      </section>
    </main>
  );
}
