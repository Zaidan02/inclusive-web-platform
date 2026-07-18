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
    if (!selected.length) {
      setError("Select at least one option to complete your profile.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await updateCandidateProfile(selected);
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
