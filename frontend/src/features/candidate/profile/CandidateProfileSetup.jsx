import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Brand from "../../../components/common/Brand";
import LanguageSwitcher from "../../../components/localization/LanguageSwitcher";
import { getCandidateProfile, updateCandidateProfile } from "../../../services/candidateProfileApi";
import AiProfileBuilder from "./AiProfileBuilder";
import { isCandidateProfileComplete } from "./profileCompletion";
import { disabilityOptions } from "./profileOptions";
import "./candidateProfile.css";

const EDUCATION_LEVELS = ["none", "primary", "middle_school", "high_school", "vocational", "university"];
const PRACTICAL_ABILITY_KEYS = ["readingAbility", "writingAbility", "numeracyAbility"];
const PRACTICAL_ABILITY_LEVELS = ["independent", "with_support", "not_yet"];

export default function CandidateProfileSetup() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("profile");
  const [selected, setSelected] = useState([]);
  const [educationLevel, setEducationLevel] = useState("");
  const [practicalAbilities, setPracticalAbilities] = useState({ readingAbility: "", writingAbility: "", numeracyAbility: "" });
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
  const practicalAbilityRefs = useRef({});
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
        setPracticalAbilities({ readingAbility: profile.readingAbility || "", writingAbility: profile.writingAbility || "", numeracyAbility: profile.numeracyAbility || "" });
        setBasicInfo({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          phone: profile.phone || "",
          location: profile.location || "",
          about: profile.about || "",
        });
        setConfirmedTaskSkills(profile.confirmedTaskSkills || []);
      })
      .catch(() => active && setError(t("setup.errors.load")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [navigate, t]);

  const filteredOptions = useMemo(() => {
    const locale = i18n.resolvedLanguage || "en";
    const query = search.toLocaleLowerCase(locale);
    return disabilityOptions.filter(({ key }) => t(`disabilities.${key}`).toLocaleLowerCase(locale).includes(query));
  }, [i18n.resolvedLanguage, search, t]);

  function toggleOption(name) {
    setError("");
    setAttemptedSave(false);
    setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  function applyConfirmedProfile(profile) {
    if (!profile) return;
    setSelected(profile.selectedDisabilities || []);
    setEducationLevel(profile.educationLevel || "");
    setPracticalAbilities((current) => ({
      readingAbility: profile.readingAbility ?? current.readingAbility,
      writingAbility: profile.writingAbility ?? current.writingAbility,
      numeracyAbility: profile.numeracyAbility ?? current.numeracyAbility,
    }));
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
    const missingPracticalAbility = PRACTICAL_ABILITY_KEYS.find((key) => !practicalAbilities[key]);
    if (!selected.length || !educationLevel || missingPracticalAbility || !basicInfo.firstName.trim() || !basicInfo.lastName.trim() || !basicInfo.location.trim()) {
      setAttemptedSave(true);
      setError(t("setup.errors.required"));
      const missingControl = !basicInfo.firstName.trim() ? firstNameRef
        : !basicInfo.lastName.trim() ? lastNameRef
        : !basicInfo.location.trim() ? locationRef
        : !educationLevel ? educationRef
        : missingPracticalAbility ? { current: practicalAbilityRefs.current[missingPracticalAbility] }
        : searchRef;
      window.requestAnimationFrame(() => missingControl.current?.focus());
      return;
    }
    try {
      setSaving(true);
      setError("");
      await updateCandidateProfile({ selectedDisabilities: selected, educationLevel, ...practicalAbilities, ...basicInfo });
      navigate("/candidate", { replace: true });
    } catch {
      setError(t("setup.errors.save"));
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
      respond(t("setup.voice.fieldSet", { field: action.label, value }));
      highlight(action.target);
    } else if (action.type === "select_option" && action.target === "education_level") {
      setEducationLevel(action.value);
      respond(t("setup.voice.educationSelected", { value: t(`education.${action.value}`) }));
      highlight(action.target);
    } else if (action.type === "toggle_option" && action.target === "disabilities") {
      toggleOption(action.value);
      const option = disabilityOptions.find(({ name }) => name === action.value);
      respond(t("setup.voice.disabilityChanged", { value: option ? t(`disabilities.${option.key}`) : action.value }));
      highlight("disabilities");
    } else if (action.type === "press" && action.target === "complete_setup") {
      completeSetup();
      respond(t("setup.voice.completing"));
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
      <header className="profile-setup__header">
        <Brand />
        <div className="profile-setup__header-tools">
          <span>{t("setup.header")}</span>
          <LanguageSwitcher compact />
        </div>
      </header>
      <section className="profile-setup__shell" data-voice-section="candidate-setup">
        <div className="profile-setup__intro">
          <span className="profile-setup__step">{t("setup.step")}</span>
          <h1>{t("setup.title")}</h1>
          <p>{t("setup.intro")}</p>
          <div className="profile-setup__privacy">
            <strong>{t("setup.privacyTitle")}</strong>
            <span>{t("setup.privacyText")}</span>
          </div>
        </div>
        <div className="profile-setup__card">
          <AiProfileBuilder
            currentProfile={{ ...basicInfo, educationLevel, ...practicalAbilities, selectedDisabilities: selected, confirmedTaskSkills }}
            onProfileConfirmed={applyConfirmedProfile}
          />
          <div className="profile-setup__card-header">
            <div>
              <span className="profile-setup__eyebrow">{t("setup.information")}</span>
              <h2>{t("setup.disabilityTitle")}</h2>
              <p>{t("setup.disabilityHelp")}</p>
            </div>
            <span className="profile-setup__count">{t("setup.selectedCount", { count: selected.length })}</span>
          </div>
          <div className="profile-setup__fields">
            <label><strong>{t("setup.firstName")}</strong><input ref={firstNameRef} dir="auto" autoComplete="given-name" data-voice-control="first_name" value={basicInfo.firstName} required aria-invalid={attemptedSave && !basicInfo.firstName.trim()} aria-describedby={attemptedSave && !basicInfo.firstName.trim() ? "profile-setup-error" : undefined} onChange={(event) => { setBasicInfo((current) => ({ ...current, firstName: event.target.value })); setAttemptedSave(false); }} /></label>
            <label><strong>{t("setup.lastName")}</strong><input ref={lastNameRef} dir="auto" autoComplete="family-name" data-voice-control="last_name" value={basicInfo.lastName} required aria-invalid={attemptedSave && !basicInfo.lastName.trim()} aria-describedby={attemptedSave && !basicInfo.lastName.trim() ? "profile-setup-error" : undefined} onChange={(event) => { setBasicInfo((current) => ({ ...current, lastName: event.target.value })); setAttemptedSave(false); }} /></label>
            <label><strong>{t("setup.location")}</strong><input ref={locationRef} dir="auto" autoComplete="address-level2" data-voice-control="location" value={basicInfo.location} required aria-invalid={attemptedSave && !basicInfo.location.trim()} aria-describedby={attemptedSave && !basicInfo.location.trim() ? "profile-setup-error" : undefined} onChange={(event) => { setBasicInfo((current) => ({ ...current, location: event.target.value })); setAttemptedSave(false); }} placeholder={t("setup.locationPlaceholder")} /></label>
            <label><strong>{t("setup.phone")} <small>{t("setup.optional")}</small></strong><input type="tel" dir="ltr" autoComplete="tel" data-voice-control="phone" value={basicInfo.phone} onChange={(event) => setBasicInfo((current) => ({ ...current, phone: event.target.value }))} /></label>
          </div>
          <label style={{ display: "grid", gap: "6px", marginBottom: "14px" }}>
            <strong>{t("setup.about")} <small>{t("setup.optional")}</small></strong>
            <textarea dir="auto" data-voice-control="about" value={basicInfo.about} onChange={(event) => setBasicInfo((current) => ({ ...current, about: event.target.value }))} rows="3" placeholder={t("setup.aboutPlaceholder")} style={{ padding: "12px", border: "1px solid #dbe3ef", borderRadius: "10px", resize: "vertical" }} />
          </label>
          <label className="profile-setup__education">
            <strong>{t("setup.education")}</strong>
            <select ref={educationRef} data-voice-control="education_level" value={educationLevel} required aria-invalid={attemptedSave && !educationLevel} aria-describedby={attemptedSave && !educationLevel ? "profile-setup-error" : undefined} onChange={(event) => { setEducationLevel(event.target.value); setAttemptedSave(false); }}>
              <option value="">{t("setup.educationPlaceholder")}</option>
              {EDUCATION_LEVELS.map((level) => <option key={level} value={level}>{t(`education.${level}`)}</option>)}
            </select>
          </label>
          <fieldset className="profile-setup__practical">
            <legend>{t("setup.practicalTitle")}</legend>
            <p>{t("setup.practicalHelp")}</p>
            <div className="profile-setup__practical-grid">
              {PRACTICAL_ABILITY_KEYS.map((key) => (
                <label key={key}>
                  <strong>{t(`setup.abilities.${key}`)}</strong>
                  <select
                    ref={(element) => { practicalAbilityRefs.current[key] = element; }}
                    aria-label={t(`setup.abilities.${key}`)}
                    value={practicalAbilities[key]}
                    required
                    aria-invalid={attemptedSave && !practicalAbilities[key]}
                    aria-describedby={attemptedSave && !practicalAbilities[key] ? "profile-setup-error" : undefined}
                    onChange={(event) => {
                      setPracticalAbilities((current) => ({ ...current, [key]: event.target.value }));
                      setAttemptedSave(false);
                    }}
                  >
                    <option value="">{t("setup.abilityPlaceholder")}</option>
                    {PRACTICAL_ABILITY_LEVELS.map((level) => <option key={level} value={level}>{t(`setup.abilityLevels.${level}`)}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="profile-setup__search">
            <span aria-hidden="true">⌕</span>
            <input ref={searchRef} data-voice-control="disability_search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("setup.searchPlaceholder")} aria-label={t("setup.searchLabel")} aria-describedby={attemptedSave && !selected.length ? "profile-setup-error" : undefined} />
          </label>
          {loading ? <div className="profile-setup__state">{t("setup.loading")}</div> : (
            <div className="profile-options" data-voice-control="disabilities">{filteredOptions.map((option) => {
              const checked = selected.includes(option.name);
              return <button type="button" className={`profile-option ${checked ? "profile-option--selected" : ""}`} aria-pressed={checked} onClick={() => toggleOption(option.name)} key={option.name}><span className="profile-option__check">{checked ? "✓" : ""}</span><img src={option.image} alt="" /><strong>{t(`disabilities.${option.key}`)}</strong></button>;
            })}</div>
          )}
          {error && <p ref={errorRef} id="profile-setup-error" tabIndex="-1" className="profile-setup__error" role="alert">{error}</p>}
          <div className="profile-setup__footer">
            <span>{t("setup.changeLater")}</span>
            <button data-voice-control="complete_setup" type="button" onClick={completeSetup} disabled={loading || saving}>{saving ? t("setup.saving") : t("setup.complete")}<span className="directional-arrow" aria-hidden="true">→</span></button>
          </div>
        </div>
      </section>
    </main>
  );
}
