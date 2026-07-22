import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Brand from "../../../components/common/Brand";
import { getCandidateProfile, updateCandidateProfile } from "../../../services/candidateProfileApi";
import { isCandidateProfileComplete } from "./profileCompletion";
import { disabilityOptions } from "./profileOptions";
import "./candidateProfile.css";

export default function CandidateProfileSetup() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [educationLevel, setEducationLevel] = useState("");
  const [basicInfo, setBasicInfo] = useState({ firstName: "", lastName: "", phone: "", location: "", about: "" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [navigate]);

  const filteredOptions = useMemo(() => disabilityOptions.filter(({ name }) => name.toLowerCase().includes(search.toLowerCase())), [search]);

  function toggleOption(name) {
    setError("");
    setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  async function completeSetup() {
    if (!selected.length || !educationLevel || !basicInfo.firstName.trim() || !basicInfo.lastName.trim() || !basicInfo.location.trim()) {
      setError("Add your name, location, education level, and at least one disability.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await updateCandidateProfile({ selectedDisabilities: selected, educationLevel, ...basicInfo });
      navigate("/candidate", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="profile-setup">
      <header className="profile-setup__header"><Brand /><span>Candidate profile setup</span></header>
      <section className="profile-setup__shell">
        <div className="profile-setup__intro">
          <span className="profile-setup__step">Step 1 of 1</span>
          <h1>Let’s build your ability-led profile.</h1>
          <p>Select the options that apply to you. This helps JoIn make opportunities and tasks easier to evaluate for your needs.</p>
          <div className="profile-setup__privacy"><strong>Your profile, your choice</strong><span>You can review and update these selections later from My Profile.</span></div>
        </div>
        <div className="profile-setup__card">
          <div className="profile-setup__card-header"><div><span className="profile-setup__eyebrow">Profile information</span><h2>Select your disabilities</h2><p>Choose all that apply.</p></div><span className="profile-setup__count">{selected.length} selected</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}><label style={{ display: "grid", gap: "6px" }}><strong>First name</strong><input value={basicInfo.firstName} onChange={(e) => setBasicInfo((p) => ({ ...p, firstName: e.target.value }))} style={{ padding: "12px", border: "1px solid #dbe3ef", borderRadius: "10px" }} /></label><label style={{ display: "grid", gap: "6px" }}><strong>Last name</strong><input value={basicInfo.lastName} onChange={(e) => setBasicInfo((p) => ({ ...p, lastName: e.target.value }))} style={{ padding: "12px", border: "1px solid #dbe3ef", borderRadius: "10px" }} /></label><label style={{ display: "grid", gap: "6px" }}><strong>Location</strong><input value={basicInfo.location} onChange={(e) => setBasicInfo((p) => ({ ...p, location: e.target.value }))} placeholder="City, region" style={{ padding: "12px", border: "1px solid #dbe3ef", borderRadius: "10px" }} /></label><label style={{ display: "grid", gap: "6px" }}><strong>Phone <small>(optional)</small></strong><input value={basicInfo.phone} onChange={(e) => setBasicInfo((p) => ({ ...p, phone: e.target.value }))} style={{ padding: "12px", border: "1px solid #dbe3ef", borderRadius: "10px" }} /></label></div>
          <label style={{ display: "grid", gap: "6px", marginBottom: "14px" }}><strong>About you <small>(optional)</small></strong><textarea value={basicInfo.about} onChange={(e) => setBasicInfo((p) => ({ ...p, about: e.target.value }))} rows="3" placeholder="A short introduction, interests, or work goals" style={{ padding: "12px", border: "1px solid #dbe3ef", borderRadius: "10px", resize: "vertical" }} /></label>
          <label style={{ display: "grid", gap: "6px", marginBottom: "18px" }}><strong>Highest education level</strong><select value={educationLevel} onChange={(event) => setEducationLevel(event.target.value)} style={{ padding: "12px", border: "1px solid #dbe3ef", borderRadius: "10px" }}><option value="">Select education level</option><option value="none">No formal education</option><option value="primary">Primary school</option><option value="middle_school">Middle school</option><option value="high_school">High school</option><option value="vocational">Vocational or technical education</option><option value="university">University</option></select></label>
          <label className="profile-setup__search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search options" aria-label="Search disability options" /></label>
          {loading ? <div className="profile-setup__state">Loading your profile…</div> : (
            <div className="profile-options">{filteredOptions.map((option) => {
              const checked = selected.includes(option.name);
              return <button type="button" className={`profile-option ${checked ? "profile-option--selected" : ""}`} aria-pressed={checked} onClick={() => toggleOption(option.name)} key={option.name}><span className="profile-option__check">{checked ? "✓" : ""}</span><img src={option.image} alt="" /><strong>{option.name}</strong></button>;
            })}</div>
          )}
          {error && <p className="profile-setup__error" role="alert">{error}</p>}
          <div className="profile-setup__footer"><span>You can change this later.</span><button type="button" onClick={completeSetup} disabled={loading || saving}>{saving ? "Saving profile…" : "Complete setup"}<span aria-hidden="true">→</span></button></div>
        </div>
      </section>
    </main>
  );
}
