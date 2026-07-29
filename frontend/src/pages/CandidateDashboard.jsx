import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getToken, logout } from "../services/authService";
import { applyToJob, getCandidateApplications, getCandidateMatches } from "../services/candidateApi";
import { getCandidateProfile, updateCandidateProfile } from "../services/candidateProfileApi";
import { isCandidateProfileComplete } from "../features/candidate/profile/profileCompletion";
import { disabilityOptions } from "../features/candidate/profile/profileOptions";
import { API_BASE_URL, BACKEND_BASE_URL } from "../config";
import useDialogFocus from "../hooks/useDialogFocus";

const globalStyles = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulse-ring {
    0%, 100% { box-shadow: 0 4px 14px rgba(37,99,235,0.28); }
    50% { box-shadow: 0 4px 22px rgba(37,99,235,0.5); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .disability-card:hover {
    border-color: #93c5fd !important;
    background: #f0f7ff !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 18px rgba(37,99,235,0.1) !important;
  }
  .ai-btn-idle {
    animation: pulse-ring 2.5s ease-in-out infinite;
  }
  .ai-btn-idle:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(37,99,235,0.4) !important;
  }
  .shimmer-btn {
    background: linear-gradient(90deg, #1d4ed8 0%, #3b82f6 40%, #60a5fa 50%, #3b82f6 60%, #1d4ed8 100%) !important;
    background-size: 200% auto !important;
    animation: shimmer 1.8s linear infinite !important;
  }
  .result-card-in {
    animation: fadeIn 0.35s ease forwards;
  }
  .header-pattern {
    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
    background-size: 22px 22px;
  }
`;

function highlightVoiceControl(controlId) {
  requestAnimationFrame(() => {
    const control = document.querySelector(`[data-voice-control="${controlId}"]`);
    control?.focus?.();
    control?.classList.add("voice-action-highlight");
    window.setTimeout(() => control?.classList.remove("voice-action-highlight"), 1800);
  });
}

function findSpokenItem(items, spokenValue, labelOf) {
  if (!items?.length) return null;
  const normalized = String(spokenValue || "").trim().toLowerCase();
  const ordinals = { first: 0, "1": 0, "1st": 0, second: 1, "2": 1, "2nd": 1, third: 2, "3": 2, "3rd": 2 };
  if (normalized in ordinals) return items[ordinals[normalized]] || null;
  return items.find((item) => {
    const label = String(labelOf(item) || "").toLowerCase();
    return label === normalized || label.includes(normalized) || normalized.includes(label);
  }) || null;
}

function BriefcaseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 7V6.2C9 5.54 9.54 5 10.2 5H13.8C14.46 5 15 5.54 15 6.2V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5.6 8H18.4C19.28 8 20 8.72 20 9.6V17.4C20 18.28 19.28 19 18.4 19H5.6C4.72 19 4 18.28 4 17.4V9.6C4 8.72 4.72 8 5.6 8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 12.2H20" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BuildingIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 21V5.8C5 4.81 5.81 4 6.8 4H13.2C14.19 4 15 4.81 15 5.8V21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15 10H17.2C18.19 10 19 10.81 19 11.8V21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 8H9.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 11H9.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 14H9.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.5 21H20.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 21C12 21 18 15.5 18 10.5C18 7.19 15.31 4.5 12 4.5C8.69 4.5 6 7.19 6 10.5C6 15.5 12 21 12 21Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="10.5" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function JobTypeIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 7V6.2C9 5.54 9.54 5 10.2 5H13.8C14.46 5 15 5.54 15 6.2V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5.5 8H18.5C19.33 8 20 8.67 20 9.5V17.5C20 18.33 19.33 19 18.5 19H5.5C4.67 19 4 18.33 4 17.5V9.5C4 8.67 4.67 8 5.5 8Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 12H20" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CalendarIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 5V8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17 5V8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5.8 7H18.2C19.19 7 20 7.81 20 8.8V18.2C20 19.19 19.19 20 18.2 20H5.8C4.81 20 4 19.19 4 18.2V8.8C4 7.81 4.81 7 5.8 7Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 11H20" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CompanySmallIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 20V5.8C6 4.81 6.81 4 7.8 4H14.2C15.19 4 16 4.81 16 5.8V20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 10H18.2C19.19 10 20 10.81 20 11.8V20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 8H10.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 11H10.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 14H10.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4 20H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
      <circle cx="11" cy="11" r="7" stroke="#94a3b8" strokeWidth="2" />
      <path d="M16.5 16.5L21 21" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite", display: "inline-block", verticalAlign: "middle", marginRight: "8px" }}>
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <path d="M12 3C16.97 3 21 7.03 21 12" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EmptyStateIllustration() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: "12px" }}>
      <circle cx="32" cy="32" r="30" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.5" />
      <circle cx="32" cy="26" r="10" fill="none" stroke="#93c5fd" strokeWidth="2" />
      <path d="M39 33L46 40" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 44C22 44 24 38 32 38C40 38 42 44 42 44" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="44" cy="20" r="5" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
      <path d="M44 17V23M41 20H47" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CircleProgress({ percent, size = 80, color = "#2563eb" }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#e8edf5" strokeWidth="6" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 40 40)" style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      <text x="40" y="36" textAnchor="middle" fontSize="14" fontWeight="600" fill={color} fontFamily="Inter, sans-serif">{percent}%</text>
      <text x="40" y="50" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="400" fontFamily="Inter, sans-serif">match</text>
    </svg>
  );
}

function getCompatibilityBand(result) {
  if (!result.eligible || result.score == null) {
    return { label: "Not eligible", color: "#b91c1c", background: "#fef2f2", border: "#fecaca" };
  }
  if (result.score >= 80) return { label: "Strong compatibility", color: "#047857", background: "#ecfdf5", border: "#a7f3d0" };
  if (result.score >= 60) return { label: "Moderate compatibility", color: "#0369a1", background: "#f0f9ff", border: "#bae6fd" };
  if (result.score >= 40) return { label: "Limited compatibility", color: "#a16207", background: "#fefce8", border: "#fde68a" };
  return { label: "Low compatibility", color: "#b91c1c", background: "#fef2f2", border: "#fecaca" };
}

function JobResultCard({ result, index, onOpenJob }) {
  const [expanded, setExpanded] = useState(false);
  const palettes = [
    { color: "#2563eb", light: "#eff6ff", border: "#bfdbfe" },
    { color: "#0284c7", light: "#f0f9ff", border: "#bae6fd" },
    { color: "#7c3aed", light: "#f5f3ff", border: "#ddd6fe" },
  ];
  const p = palettes[index] || palettes[0];
  const compatibilityBand = getCompatibilityBand(result);

  useEffect(() => {
    function handleVoiceAction(event) {
      const action = event.detail.action;
      if (action?.type !== "open_item" || action.target !== "scoring_explanation") return;
      const value = String(action.value || "").trim().toLowerCase();
      const ordinalIndex = { first: 0, "1": 0, "1st": 0, second: 1, "2": 1, "2nd": 1, third: 2, "3": 2, "3rd": 2 }[value];
      const title = String(result.job_title || "").toLowerCase();
      if (ordinalIndex !== index && title !== value && !title.includes(value) && !value.includes(title)) return;
      setExpanded(true);
      event.detail.handled = true;
      event.detail.feedback = `Showing the scoring explanation for ${result.job_title}.`;
    }
    window.addEventListener("join:voice-action", handleVoiceAction);
    return () => window.removeEventListener("join:voice-action", handleVoiceAction);
  }, [index, result.job_title]);

  return (
    <div className="result-card-in" style={{ border: `1px solid ${index === 0 ? p.border : "#e8edf5"}`, borderRadius: "16px", padding: "16px", marginBottom: "10px", background: index === 0 ? p.light : "#fafbfc", animationDelay: `${index * 0.1}s` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <CircleProgress percent={result.score ?? 0} size={76} color={result.eligible ? p.color : "#dc2626"} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
            <span style={{ fontSize: "10px", fontWeight: "500", color: "#94a3b8" }}>#{index + 1}</span>
            {index === 0 && result.eligible && <span style={{ background: p.color, color: "#fff", fontSize: "9px", fontWeight: "600", padding: "2px 7px", borderRadius: "999px", letterSpacing: "0.4px" }}>HIGHEST-RANKED OFFER</span>}
            <span style={{ background: compatibilityBand.background, color: compatibilityBand.color, border: `1px solid ${compatibilityBand.border}`, fontSize: "9px", fontWeight: "600", padding: "2px 7px", borderRadius: "999px", letterSpacing: "0.2px" }}>{compatibilityBand.label}</span>
          </div>
          <p style={{ margin: "0 0 2px", fontSize: "16px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.2px" }}>{result.job_title}</p>
          <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#64748b" }}>{result.companyName}{result.assistanceAvailable ? " · Accommodation offered" : ""}</p>
          <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ width: `${result.score ?? 0}%`, height: "100%", background: result.eligible ? `linear-gradient(90deg, ${p.color}, ${p.color}aa)` : "#dc2626", borderRadius: "999px", transition: "width 1.2s ease" }} />
          </div>
        </div>
      </div>
      <button data-voice-control="scoring_explanation" onClick={() => setExpanded(!expanded)} style={{ marginTop: "12px", width: "100%", background: "transparent", border: `1px solid ${p.border}`, borderRadius: "8px", padding: "7px", color: p.color, fontWeight: "500", fontSize: "12px", cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "background 0.15s" }}>
        {expanded ? "▲ Hide explanation" : "▼ Show scoring explanation"}
      </button>
      {expanded && (
        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "5px", animation: "fadeIn 0.2s ease" }}>
          <p style={{ width: "100%", margin: "0 0 6px", fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>{result.summary}</p>
          {(result.task_results || []).slice(0, 8).map((task) => <span key={task.task_id} style={{ background: `${p.color}10`, color: task.effective_feasibility === "avoid" ? "#b91c1c" : p.color, padding: "4px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", border: `1px solid ${p.color}20` }}>{task.task_name}: {task.effective_feasibility.replaceAll("_", " ")}</span>)}
        </div>
      )}
      {onOpenJob && (
        <button type="button" onClick={() => onOpenJob(result)} style={{ marginTop: "10px", width: "100%", background: p.color, border: "none", borderRadius: "8px", padding: "9px", color: "#fff", fontWeight: "600", fontSize: "12px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          {result.eligible ? "View job & apply" : "View job details"} &rarr;
        </button>
      )}
    </div>
  );
}

function TaskCard({ task, index, feasibility, borderColor, abilities, getFeasibilityBadgeStyle }) {
  const [showAll, setShowAll] = useState(false);
  const visibleAbilities = showAll ? abilities : abilities.slice(0, 3);
  const hiddenCount = abilities.length - 3;

  return (
    <div style={{ ...taskCardStyle, borderLeft: `3px solid ${borderColor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#0f172a", textAlign: "left" }}>
            {index + 1}. {task.taskName}
          </p>
          {task.description && (
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8", lineHeight: "1.5", fontWeight: "400", textAlign: "left" }}>
              {task.description}
            </p>
          )}
        </div>
        <span style={{ ...getFeasibilityBadgeStyle(feasibility.status), flexShrink: 0, fontSize: "11px" }}>
          {feasibility.status === "not_calculated"
            ? "Select disabilities to see"
            : feasibility.status === "not_feasible"
            ? feasibility.label
            : `${feasibility.label} · ${feasibility.score}%`}
        </span>
      </div>

      {abilities.length > 0 && (
        <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
          {visibleAbilities.map((ab) => (
            <span key={ab} style={{ background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "400" }}>
              {ab}
            </span>
          ))}
          {hiddenCount > 0 && !showAll && (
            <button onClick={() => setShowAll(true)} style={{ background: "none", border: "1px solid #e2e8f0", color: "#94a3b8", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              +{hiddenCount} more
            </button>
          )}
          {showAll && hiddenCount > 0 && (
            <button onClick={() => setShowAll(false)} style={{ background: "none", border: "1px solid #e2e8f0", color: "#94a3b8", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const taskCardStyle = {
  background: "#fafbfc",
  border: "1px solid #e8edf5",
  borderRadius: "12px",
  padding: "12px 14px",
  transition: "border-left-color 0.3s ease",
};

function getCompanyInitial(n) { return n ? n.charAt(0).toUpperCase() : "J"; }
function getCompanyLogoUrl(item) {
  const url = item?.companyLogoUrl || item?.employerProfile?.logoUrl || item?.logoUrl || "";
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads")) return `${BACKEND_BASE_URL}${url}`;
  return url;
}

function CompanyLogo({ item, size = "small" }) {
  const url = getCompanyLogoUrl(item);
  const isLarge = size === "large";
  const ws = isLarge ? styles.companyLogoLarge : styles.companyLogo;
  const is = isLarge ? styles.companyLogoLargeImage : styles.companyLogoImage;
  if (url) return <div style={ws}><img src={url} alt={`${item?.companyName || "Company"} logo`} style={is} /></div>;
  return <div style={ws}>{getCompanyInitial(item?.companyName)}</div>;
}

function AccommodationBadge({ compact = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", width: "fit-content", marginTop: compact ? "5px" : 0, padding: compact ? "3px 7px" : "5px 10px", borderRadius: "999px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", fontSize: compact ? "10px" : "12px", fontWeight: "600" }}>
      <span aria-hidden="true">✓</span> Accommodation offered
    </span>
  );
}

function AiJobMatchCard({ aiLoading, aiError, aiResults, selectedDisabilities, onMatch, onOpenJob }) {
  return (
    <div style={{ ...styles.aiCard, marginBottom: "18px" }}>
      <div style={styles.aiCardHeader}>
        <div style={styles.aiIconWrapper}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L14.4 9.6H22L15.8 14.4L18.2 22L12 17.2L5.8 22L8.2 14.4L2 9.6H9.6L12 2Z" fill="white" />
          </svg>
        </div>
        <div>
          <h2 style={styles.aiTitle}>Compatibility Match</h2>
          <p style={styles.aiSubtitle}>Powered by transparent mathematical rules</p>
        </div>
      </div>
      <p style={{ ...styles.aiDescription, textAlign: "center", width: "100%" }}>
        Use your saved profile to get personalized compatibility scores before exploring opportunities.
      </p>
      <button data-voice-control="run_job_match" onClick={onMatch} disabled={aiLoading} className={aiLoading ? "shimmer-btn" : "ai-btn-idle"} style={{ ...styles.aiButton, opacity: aiLoading ? 0.9 : 1, cursor: aiLoading ? "not-allowed" : "pointer" }}>
        {aiLoading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><SpinnerIcon /> Analyzing your profile...</span> : "Get My Job Match"}
      </button>
      {aiError && <div style={styles.aiErrorBox}>⚠️ {aiError}</div>}
      {aiResults && (
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Your results</span>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "400" }}>{selectedDisabilities.length} condition{selectedDisabilities.length !== 1 ? "s" : ""} analyzed</span>
          </div>
          {aiResults.results.map((result, index) => <JobResultCard key={result.job_id} result={result} index={index} onOpenJob={onOpenJob} />)}
        </div>
      )}
      {!aiResults && !aiLoading && <div style={styles.aiEmptyState}><EmptyStateIllustration /><p style={styles.aiEmptyText}>Your compatibility scores will appear here after analysis</p></div>}
    </div>
  );
}

function CandidateDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("JOBS");
  const [candidateName, setCandidateName] = useState("Candidate");
  const [selectedDisabilities, setSelectedDisabilities] = useState([]);
  const [educationLevel, setEducationLevel] = useState("");
  const [basicInfo, setBasicInfo] = useState({ firstName: "", lastName: "", phone: "", location: "", about: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyModalTab, setCompanyModalTab] = useState("PROFILE");
  const [applicationDocument, setApplicationDocument] = useState(null);
  const [recommendationLetter, setRecommendationLetter] = useState(null);
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [candidateApplications, setCandidateApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("all");
  const applicationDocumentRef = useRef(null);
  const recommendationLetterRef = useRef(null);
  const companyDialogRef = useDialogFocus(Boolean(selectedCompany), () => setSelectedCompany(null));

  useEffect(() => { fetchCandidateProfile(); }, []);
  useEffect(() => {
    const requestedTab = location.state?.voiceTab;
    if (!["JOBS", "APPLICATIONS", "PROFILE"].includes(requestedTab)) return;
    setActiveTab(requestedTab);
    if (requestedTab === "JOBS") setSelectedJob(null);
  }, [location.state?.voiceNavigationTurn, location.state?.voiceTab]);
  useEffect(() => {
    if (activeTab === "JOBS") fetchJobs();
    if (activeTab === "APPLICATIONS") fetchCandidateApplications();
  }, [activeTab]);

  const filteredDisabilities = disabilityOptions.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredApplications = applicationStatusFilter === "all" ? candidateApplications : candidateApplications.filter((a) => a.status === applicationStatusFilter);

  function getCompanyKey(item) { return item?.employerProfile?.companyName || item?.companyName || item?.company || ""; }
  function getCompanyJobs(ci) { const k = getCompanyKey(ci).toLowerCase(); return jobs.filter((j) => getCompanyKey(j).toLowerCase() === k); }
  function openCompanyProfile(item) { setSelectedCompany(item); setCompanyModalTab("PROFILE"); }
  function openJobFromCompany(job) { setSelectedJob(job); setSelectedCompany(null); setApplicationDocument(null); setRecommendationLetter(null); setSuccessMessage(""); setErrorMessage(""); setActiveTab("JOBS"); }
  function openMatchedJob(result) {
    const job = jobs.find((item) => String(item.id) === String(result.job_id));
    if (!job) {
      setAiError("This job is no longer available. Refresh the job list and try again.");
      return;
    }
    openJobFromCompany(job);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function fetchCandidateProfile() {
    try {
      setLoadingProfile(true);
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const data = await getCandidateProfile();
      const profile = data.profile || data;
      if (!isCandidateProfileComplete(profile)) {
        navigate("/candidate/setup", { replace: true });
        return;
      }
      setCandidateName([profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username || profile.email?.split("@")[0] || "Candidate");
      setSelectedDisabilities(profile.selectedDisabilities || []);
      setEducationLevel(profile.educationLevel || "");
      setBasicInfo({ firstName: profile.firstName || "", lastName: profile.lastName || "", phone: profile.phone || "", location: profile.location || "", about: profile.about || "" });
    } catch (err) { setErrorMessage(err.message); } finally { setLoadingProfile(false); }
  }

  async function fetchJobs() {
    try {
      setLoadingJobs(true);
      const res = await fetch(`${API_BASE_URL}/jobs`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load jobs.");
      setJobs(data.jobs || []);
    } catch (err) { setJobsError(err.message); } finally { setLoadingJobs(false); }
  }

  async function fetchCandidateApplications() {
    try {
      setLoadingApplications(true);
      const data = await getCandidateApplications();
      setCandidateApplications(data.applications || []);
    } catch (err) { setApplicationsError(err.message); } finally { setLoadingApplications(false); }
  }

  function getStatusLabel(s) { if (!s) return "Pending"; return s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()); }
  function getStatusBadgeStyle(s) {
    if (s === "accepted") return { ...styles.applicationStatusBadge, background: "#ecfdf3", color: "#047857" };
    if (s === "rejected") return { ...styles.applicationStatusBadge, background: "#fef2f2", color: "#b91c1c" };
    if (s === "in_review") return { ...styles.applicationStatusBadge, background: "#eef2ff", color: "#312e81" };
    return { ...styles.applicationStatusBadge, background: "#fff7ed", color: "#c2410c" };
  }

  function handleDisabilityChange(name) {
    setSuccessMessage(""); setErrorMessage("");
    setSelectedDisabilities((prev) => prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]);
  }

  async function handleGetAiMatch() {
    if (!selectedDisabilities.length) { setAiError("Please select at least one disability first."); return; }
    try {
      setAiResults(null); setAiLoading(true); setAiError("");
      const data = await getCandidateMatches();
      setAiResults({ results: data.results || [] });
    } catch (err) { setAiError(err.message); } finally { setAiLoading(false); }
  }

  async function handleSaveProfile() {
    if (!selectedDisabilities.length || !educationLevel || !basicInfo.firstName.trim() || !basicInfo.lastName.trim() || !basicInfo.location.trim()) {
      setErrorMessage("Add your name, location, education level, and at least one disability.");
      return;
    }
    try {
      setSavingProfile(true); setSuccessMessage(""); setErrorMessage("");
      const data = await updateCandidateProfile({ selectedDisabilities, educationLevel, ...basicInfo });
      setSelectedDisabilities(data.profile?.selectedDisabilities || []);
      setSuccessMessage("Profile saved.");
    } catch (err) { setErrorMessage(err.message); } finally { setSavingProfile(false); }
  }

  async function handleSubmitApplication() {
    if (!selectedJob) return;
    try {
      setSubmittingApplication(true); setErrorMessage(""); setSuccessMessage("");
      await applyToJob(selectedJob.id, applicationDocument, recommendationLetter);
      setSuccessMessage("Application submitted successfully.");
      setApplicationDocument(null); setRecommendationLetter(null);
      setActiveTab("APPLICATIONS"); setSelectedJob(null);
    } catch (err) { setErrorMessage(err.message); } finally { setSubmittingApplication(false); }
  }

  function handleLogout() { logout(); navigate("/signin"); }

  useEffect(() => {
    function handleVoiceAction(event) {
      const { action } = event.detail;
      if (!action) return;
      const basicFieldMap = { first_name: "firstName", last_name: "lastName", location: "location", phone: "phone", about: "about" };
      const respond = (feedback) => {
        event.detail.handled = true;
        event.detail.feedback = feedback;
      };

      if (action.type === "set_field" || action.type === "clear_field") {
        const value = action.type === "clear_field" ? "" : action.value;
        if (basicFieldMap[action.target]) {
          setActiveTab("PROFILE");
          setBasicInfo((current) => ({ ...current, [basicFieldMap[action.target]]: value }));
        } else if (action.target === "disability_search") {
          setActiveTab("PROFILE");
          setSearchTerm(value);
        } else return;
        respond(`I set ${action.label} to ${value}. Please check it.`);
        highlightVoiceControl(action.target);
      } else if (action.type === "select_option") {
        if (action.target === "education_level") {
          setActiveTab("PROFILE");
          setEducationLevel(action.value);
        } else if (action.target === "application_status") {
          setActiveTab("APPLICATIONS");
          setApplicationStatusFilter(action.value);
        } else if (action.target === "company_view" && selectedCompany) {
          setCompanyModalTab(action.value);
        } else return;
        respond(`I selected ${action.value.replaceAll("_", " ")} for ${action.label}. Please check it.`);
        highlightVoiceControl(action.target);
      } else if (action.type === "toggle_option" && action.target === "disabilities") {
        setActiveTab("PROFILE");
        handleDisabilityChange(action.value);
        respond(`I changed the ${action.value} selection. Please check it.`);
        highlightVoiceControl("disabilities");
      } else if (action.type === "open_item") {
        if (action.target === "job") {
          const ordinal = /^(first|second|third|[123](st|nd|rd)?)$/i.test(String(action.value || "").trim());
          if (ordinal && aiResults?.results?.length) {
            const result = findSpokenItem(aiResults.results, action.value, (item) => item.job_title);
            if (result) {
              openMatchedJob(result);
              respond(`Opening the matched job ${result.job_title}.`);
              return;
            }
          }
          const job = findSpokenItem(jobs, action.value, (item) => item.title);
          if (!job) { respond(`I could not find a loaded job matching ${action.value}.`); return; }
          openJobFromCompany(job);
          respond(`Opening ${job.title}.`);
        } else if (action.target === "matched_job") {
          const result = findSpokenItem(aiResults?.results, action.value, (item) => item.job_title);
          if (!result) { respond(`I could not find a matching result for ${action.value}.`); return; }
          openMatchedJob(result);
          respond(`Opening the matched job ${result.job_title}.`);
        } else if (action.target === "company") {
          const company = findSpokenItem(jobs, action.value, (item) => item.companyName);
          if (!company) { respond(`I could not find a loaded company matching ${action.value}.`); return; }
          openCompanyProfile(company);
          respond(`Opening ${company.companyName}.`);
        } else return;
      } else if (action.type === "focus_field") {
        const input = action.target === "application_document" ? applicationDocumentRef.current : action.target === "recommendation_letter" ? recommendationLetterRef.current : null;
        if (!input) return;
        input.focus();
        highlightVoiceControl(action.target);
        respond(`I focused the ${action.label} picker. Choose the local file using the visible file control.`);
      } else if (action.type === "press") {
        if (action.target === "run_job_match") {
          setActiveTab("JOBS"); setSelectedJob(null); handleGetAiMatch();
        } else if (action.target === "save_profile") {
          setActiveTab("PROFILE"); handleSaveProfile();
        } else if (action.target === "clear_disabilities") {
          setActiveTab("PROFILE"); setSelectedDisabilities([]);
        } else if (action.target === "back_to_jobs") {
          setSelectedJob(null); setActiveTab("JOBS");
        } else if (action.target === "open_selected_company" && selectedJob) {
          openCompanyProfile(selectedJob);
        } else if (action.target === "close_company" && selectedCompany) {
          setSelectedCompany(null);
        } else if (action.target === "submit_application" && selectedJob) {
          handleSubmitApplication();
        } else if (action.target === "logout") {
          handleLogout();
        } else return;
        respond(`Activated ${action.label}.`);
        highlightVoiceControl(action.target);
      }
    }
    window.addEventListener("join:voice-action", handleVoiceAction);
    return () => window.removeEventListener("join:voice-action", handleVoiceAction);
  }, [aiResults, basicInfo, educationLevel, jobs, selectedCompany, selectedDisabilities, selectedJob]);
  function getUserInitials(name) {
    if (!name) return "C";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() || "C";
  }

  const selectedCompanyProfile = selectedCompany?.employerProfile || {};
  const companyJobs = selectedCompany ? getCompanyJobs(selectedCompany) : [];

  return (
    <div className="dashboard-screen dashboard-screen--candidate" style={styles.page} data-voice-section="candidate-dashboard" data-voice-view={activeTab}>
      <style>{globalStyles}</style>

      {/* HEADER */}
      <header style={styles.header} className="header-pattern">
        <div>
          <p style={styles.headerGreeting}>Hello, {candidateName} 👋</p>
          <h1 style={styles.headerTitle}>Find your best job match ✦</h1>
        </div>
        <div style={styles.userBox}>
          <button
            type="button"
            style={styles.userAvatar}
            onClick={() => setActiveTab("PROFILE")}
            aria-label="Open my profile"
            title="My Profile"
          >
            {getUserInitials(candidateName)}
          </button>
          <div>
            <p style={styles.userName}>{candidateName}</p>
            <p style={styles.userRole}>Candidate</p>
          </div>
          <button data-voice-control="logout" onClick={handleLogout} style={styles.logoutBtn}>Log out</button>
        </div>
      </header>

      {/* TABS */}
      <nav style={styles.tabs} aria-label="Candidate dashboard sections">
        {["JOBS", "APPLICATIONS", "PROFILE"].map((tab) => (
          <button type="button" key={tab} aria-current={activeTab === tab ? "page" : undefined} onClick={() => { setActiveTab(tab); if (tab === "JOBS") setSelectedJob(null); }}
            style={{ ...styles.tabButton, ...(activeTab === tab ? styles.activeTab : {}) }}>
            {tab === "JOBS" ? "Jobs" : tab === "APPLICATIONS" ? "My Applications" : "My Profile"}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {activeTab === "PROFILE" && (
          <div>
            {/* STEP INDICATOR */}
            <div style={styles.stepRow}>
              {["Complete your profile", "Calculate matches", "Apply to jobs"].map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ ...styles.stepDot, background: i === 0 ? "#2563eb" : i === 1 && aiResults ? "#2563eb" : "#cbd5e1", transition: "background 0.4s" }} />
                  <span style={{ ...styles.stepLabel, color: i === 0 ? "#2563eb" : i === 1 && aiResults ? "#2563eb" : "#94a3b8", transition: "color 0.4s" }}>{step}</span>
                  {i < 2 && <div style={styles.stepLine} />}
                </div>
              ))}
            </div>

            <section style={styles.profileGrid}>
              {/* LEFT CARD */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <h2 style={styles.sectionTitle}>Select Your Disabilities</h2>
                    <p style={styles.text}>Choose all that apply to get accurate recommendations.</p>
                  </div>
                  {selectedDisabilities.length > 0 && (
                    <span style={styles.selectedPill}>{selectedDisabilities.length} selected ✓</span>
                  )}
                </div>

                {loadingProfile && <p style={styles.infoText}>Loading...</p>}
                {errorMessage && <p style={styles.errorText}>{errorMessage}</p>}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <label style={styles.profileFieldLabel}>First name<input autoComplete="given-name" data-voice-control="first_name" value={basicInfo.firstName} onChange={(e) => setBasicInfo((p) => ({ ...p, firstName: e.target.value }))} style={{ ...styles.searchInput, paddingLeft: "12px" }} /></label>
                  <label style={styles.profileFieldLabel}>Last name<input autoComplete="family-name" data-voice-control="last_name" value={basicInfo.lastName} onChange={(e) => setBasicInfo((p) => ({ ...p, lastName: e.target.value }))} style={{ ...styles.searchInput, paddingLeft: "12px" }} /></label>
                  <label style={styles.profileFieldLabel}>Location<input autoComplete="address-level2" data-voice-control="location" value={basicInfo.location} onChange={(e) => setBasicInfo((p) => ({ ...p, location: e.target.value }))} style={{ ...styles.searchInput, paddingLeft: "12px" }} /></label>
                  <label style={styles.profileFieldLabel}>Phone <span>(optional)</span><input type="tel" autoComplete="tel" data-voice-control="phone" value={basicInfo.phone} onChange={(e) => setBasicInfo((p) => ({ ...p, phone: e.target.value }))} style={{ ...styles.searchInput, paddingLeft: "12px" }} /></label>
                </div>
                <label style={{ ...styles.profileFieldLabel, marginBottom: "12px" }}>About you <span>(optional)</span><textarea data-voice-control="about" value={basicInfo.about} onChange={(e) => setBasicInfo((p) => ({ ...p, about: e.target.value }))} rows="3" style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px", resize: "vertical", fontFamily: "inherit" }} /></label>
                <label style={{ display: "grid", gap: "6px", marginBottom: "14px", fontSize: "12px", color: "#475569" }}>Highest education level<select data-voice-control="education_level" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} style={{ ...styles.searchInput, paddingLeft: "12px" }}><option value="">Select education level</option><option value="none">No formal education</option><option value="primary">Primary school</option><option value="middle_school">Middle school</option><option value="high_school">High school</option><option value="vocational">Vocational or technical education</option><option value="university">University</option></select></label>

                <div style={styles.searchWrapper}>
                  <SearchIcon />
                  <input aria-label="Search disabilities" data-voice-control="disability_search" type="search" placeholder="Search disability..." value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
                </div>

                {selectedDisabilities.length > 0 && (
                  <div style={styles.selectedChipsRow}>
                    {selectedDisabilities.map((d) => (
                      <span key={d} style={styles.selectedChip}>
                        {d}
                        <button type="button" aria-label={`Remove ${d}`} onClick={() => handleDisabilityChange(d)} style={styles.chipRemove}>×</button>
                      </span>
                    ))}
                    <button type="button" data-voice-control="clear_disabilities" onClick={() => setSelectedDisabilities([])} style={styles.resetBtn}>Clear all</button>
                  </div>
                )}

                <div data-voice-control="disabilities" style={styles.disabilityGrid}>
                  {filteredDisabilities.map((disability) => {
                    const isSelected = selectedDisabilities.includes(disability.name);
                    return (
                      <button type="button" key={disability.name} className="disability-card" aria-pressed={isSelected}
                        onClick={() => handleDisabilityChange(disability.name)}
                        style={{ ...styles.disabilityCard, ...(isSelected ? styles.selectedDisabilityCard : {}) }}>
                        {isSelected && <div style={styles.selectedCheck}>✓</div>}
                        <div style={styles.imageWrapper}>
                          <img src={disability.image} alt={disability.name} style={styles.disabilityImage} />
                        </div>
                        <span style={{ ...styles.disabilityName, color: isSelected ? "#2563eb" : "#374151" }}>
                          {disability.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div style={styles.saveRow}>
                  <button data-voice-control="save_profile" onClick={handleSaveProfile} style={styles.saveButton} disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                  {successMessage && <span style={styles.successText}>✓ {successMessage}</span>}
                </div>
              </div>

              {/* RIGHT CARD — DETERMINISTIC MATCHING */}
              <div style={{ ...styles.aiCard, display: "none" }} aria-hidden="true">
                <div style={styles.aiCardHeader}>
                  <div style={styles.aiIconWrapper}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L14.4 9.6H22L15.8 14.4L18.2 22L12 17.2L5.8 22L8.2 14.4L2 9.6H9.6L12 2Z" fill="white" />
                    </svg>
                  </div>
                  <div>
                    <h2 style={styles.aiTitle}>Compatibility Match</h2>
                    <p style={styles.aiSubtitle}>Powered by transparent mathematical rules</p>
                  </div>
                </div>

                <p style={{ ...styles.aiDescription, textAlign: "center", width: "100%" }}>
                  Select your disabilities on the left, then click below to get your personalized compatibility scores.
                </p>

                <button
                  onClick={handleGetAiMatch}
                  disabled={aiLoading}
                  className={aiLoading ? "shimmer-btn" : "ai-btn-idle"}
                  style={{ ...styles.aiButton, opacity: aiLoading ? 0.9 : 1, cursor: aiLoading ? "not-allowed" : "pointer" }}
                >
                  {aiLoading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <SpinnerIcon /> Analyzing your profile...
                    </span>
                  ) : (
                    "Get My Job Match"
                  )}
                </button>

                {aiError && <div style={styles.aiErrorBox}>⚠️ {aiError}</div>}

                {aiResults && (
                  <div style={{ marginTop: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Your results</span>
                      <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "400" }}>
                        {selectedDisabilities.length} condition{selectedDisabilities.length !== 1 ? "s" : ""} analyzed
                      </span>
                    </div>
                    {aiResults.results.map((result, index) => (
                      <JobResultCard key={result.job_id} result={result} index={index} onOpenJob={openMatchedJob} />
                    ))}
                  </div>
                )}

                {!aiResults && !aiLoading && (
                  <div style={styles.aiEmptyState}>
                    <EmptyStateIllustration />
                    <p style={styles.aiEmptyText}>Your compatibility scores will appear here after analysis</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "JOBS" && (
          <section style={styles.card}>
            {!selectedJob && (
              <AiJobMatchCard
                aiLoading={aiLoading}
                aiError={aiError}
                aiResults={aiResults}
                selectedDisabilities={selectedDisabilities}
                onMatch={handleGetAiMatch}
                onOpenJob={openMatchedJob}
              />
            )}
            {!selectedJob ? (
              <>
                <h2 style={styles.sectionTitle}>Available Jobs</h2>
                <p style={styles.text}>Browse posted jobs and click a card to view full details.</p>
                {loadingJobs && <p style={styles.infoText}>Loading jobs...</p>}
                {jobsError && <p style={styles.errorText}>{jobsError}</p>}
                {!loadingJobs && jobs.length === 0 && <div style={styles.emptyBox}>No jobs have been posted yet.</div>}
                <div style={styles.jobsGrid}>
                  {jobs.map((job) => (
                    <article key={job.id} style={styles.jobCard}>
                      <CompanyLogo item={job} />
                      <div style={styles.jobCardContent}>
                        <button
                          type="button"
                          aria-label={`View details for ${job.title}`}
                          style={styles.jobTitleButton}
                          onClick={() => { setSelectedJob(job); setApplicationDocument(null); setRecommendationLetter(null); setSuccessMessage(""); setErrorMessage(""); }}
                        >
                          {job.title}
                        </button>
                        <button type="button" style={styles.companyNameButton} onClick={() => openCompanyProfile(job)}>
                          {job.companyName}
                        </button>
                        {job.assistanceAvailable && <AccommodationBadge compact />}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button data-voice-control="back_to_jobs" style={styles.backButton} onClick={() => setSelectedJob(null)}>← Back</button>

                {/* Job Header */}
                <div style={styles.jobDetailsHeader}>
                  <CompanyLogo item={selectedJob} size="large" />
                  <div style={{ flex: 1 }}>
                    <h2 style={styles.jobDetailsTitle}>{selectedJob.title}</h2>
                    <button data-voice-control="open_selected_company" type="button" style={styles.companyNameLink} onClick={() => openCompanyProfile(selectedJob)}>{selectedJob.companyName}</button>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                      {[selectedJob.location, selectedJob.jobType, selectedJob.workMode].filter(Boolean).map((meta) => (
                        <span key={meta} style={{ background: "#f1f5f9", color: "#475569", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "400" }}>
                          {meta}
                        </span>
                      ))}
                      {selectedJob.assistanceAvailable && <AccommodationBadge />}
                    </div>
                  </div>
                  {selectedJob.applicationDeadline && (
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "12px 16px", textAlign: "center", flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "500" }}>Deadline</p>
                      <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: "600", color: "#1d4ed8" }}>{selectedJob.applicationDeadline}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedJob.description && (
                  <>
                    <h3 style={styles.detailsSectionTitle}>Job Description</h3>
                    <p style={styles.detailsText}>{selectedJob.description}</p>
                  </>
                )}

                {selectedJob.assistanceAvailable && (
                  <div style={{ marginTop: "18px", padding: "14px 16px", borderRadius: "12px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46" }}>
                    <strong style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>Workplace accommodation is available</strong>
                    <span style={{ fontSize: "13px", lineHeight: "1.5" }}>The employer has indicated that task assistance or accommodation can be provided for this position.</span>
                  </div>
                )}

                <h3 style={styles.detailsSectionTitle}>What you’ll do</h3>
                <div style={{ display: "grid", gap: "8px", marginBottom: "24px" }}>
                  {(selectedJob.highlightedTasks || []).map((task) => <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 13px", borderRadius: "11px", background: "#f8fafc", border: "1px solid #e8edf5", color: "#334155", fontSize: "13px" }}><span aria-hidden="true" style={{ color: "#2563eb", fontWeight: 700 }}>✓</span>{task.name}</div>)}
                </div>
                <div style={styles.applicationBox}>
                  <h3 style={styles.detailsSectionTitle}>Application Documents</h3>
                  {successMessage && <p style={styles.successText}>{successMessage}</p>}
                  {errorMessage && <p style={styles.errorText}>{errorMessage}</p>}
                  <label style={styles.uploadLabel}>Upload Application Document {selectedJob.cvRequired ? "*" : ""}
                    <input ref={applicationDocumentRef} data-voice-control="application_document" type="file" accept=".pdf,.doc,.docx" style={styles.fileInput} onChange={(e) => setApplicationDocument(e.target.files?.[0] || null)} />
                  </label>
                  <label style={styles.uploadLabel}>Upload Recommendation Letter {selectedJob.coverLetterRequired ? "*" : ""}
                    <input ref={recommendationLetterRef} data-voice-control="recommendation_letter" type="file" accept=".pdf,.doc,.docx" style={styles.fileInput} onChange={(e) => setRecommendationLetter(e.target.files?.[0] || null)} />
                  </label>
                  <button data-voice-control="submit_application" type="button" style={styles.applyButton} onClick={handleSubmitApplication} disabled={submittingApplication}>
                    {submittingApplication ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "APPLICATIONS" && (
          <section style={styles.applicationsShell}>
            <div style={styles.applicationsHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={styles.applicationsIcon}><BriefcaseIcon size={20} /></div>
                <div>
                  <h2 style={styles.applicationsTitle}>My Applications</h2>
                  <p style={styles.applicationsSubtitle}>Track and manage your job applications</p>
                </div>
              </div>
              <select aria-label="Filter applications by status" data-voice-control="application_status" value={applicationStatusFilter} onChange={(e) => setApplicationStatusFilter(e.target.value)} style={styles.statusFilterSelect}>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_review">In Review</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            {loadingApplications && <p style={styles.infoText}>Loading...</p>}
            {applicationsError && <p style={styles.errorText}>{applicationsError}</p>}
            {!loadingApplications && candidateApplications.length === 0 && <div style={styles.emptyBox}>You have not submitted any applications yet.</div>}
            {!loadingApplications && candidateApplications.length > 0 && filteredApplications.length === 0 && <div style={styles.emptyBox}>No applications match this status.</div>}
            <div style={styles.applicationCards}>
              {filteredApplications.map((application) => (
                <div key={application.id} style={styles.applicationCard}>
                  {getCompanyLogoUrl(application) ? (
                    <div style={styles.applicationCompanyIcon}><img src={getCompanyLogoUrl(application)} alt="" style={styles.applicationCompanyLogoImage} /></div>
                  ) : (
                    <div style={styles.applicationCompanyIcon}><BuildingIcon size={26} /></div>
                  )}
                  <div style={styles.applicationInfo}>
                    <h3 style={styles.applicationJobTitle}>{application.jobTitle}</h3>
                    <button type="button" style={styles.applicationCompanyButton} onClick={() => { const j = jobs.find((job) => job.companyName === application.companyName || job.title === application.jobTitle) || application; openCompanyProfile(j); }}>
                      <CompanySmallIcon size={13} />{application.companyName}
                    </button>
                    <div style={styles.applicationMetaRow}>
                      <span style={styles.metaItem}><LocationIcon size={13} />{application.location || "Not specified"}</span>
                      <span style={styles.metaItem}><JobTypeIcon size={13} />{application.jobType || "Job application"}</span>
                      <span style={styles.metaItem}><CalendarIcon size={13} />Applied {application.createdAt ? new Date(application.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                    </div>
                  </div>
                  <span style={getStatusBadgeStyle(application.status)}>{getStatusLabel(application.status)}</span>
                  <span style={{ color: "#cbd5e1", fontSize: "20px" }}>›</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {selectedCompany && (
        <div style={styles.companyOverlay}>
          <div
            ref={companyDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-dialog-title"
            tabIndex={-1}
            style={styles.companyModal}
          >
            <button aria-label="Close company profile" data-voice-control="close_company" type="button" style={styles.companyCloseButton} onClick={() => setSelectedCompany(null)}>×</button>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingRight: "40px" }}>
              <CompanyLogo item={selectedCompany} size="large" />
              <div>
                <h2 id="company-dialog-title" style={{ margin: 0, color: "#0f172a", fontSize: "20px", fontWeight: "700" }}>{selectedCompany.employerProfile?.companyName || selectedCompany.companyName || "Company Profile"}</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>{selectedCompany.employerProfile?.industry || "Hospitality"}{selectedCompany.employerProfile?.location ? ` · ${selectedCompany.employerProfile.location}` : selectedCompany.location ? ` · ${selectedCompany.location}` : ""}</p>
              </div>
            </div>
            <div data-voice-control="company_view" style={styles.companyTabs}>
              {["PROFILE", "JOBS"].map((t) => (
                <button key={t} type="button" aria-pressed={companyModalTab === t} style={{ ...styles.companyTabButton, ...(companyModalTab === t ? styles.companyTabActive : {}) }} onClick={() => setCompanyModalTab(t)}>
                  {t === "PROFILE" ? "Profile" : "Job Openings"}
                </button>
              ))}
            </div>
            {companyModalTab === "PROFILE" && (
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={styles.companyInfoBox}><h3 style={styles.companyInfoTitle}>About</h3><p style={styles.companyInfoText}>{selectedCompanyProfile.description || "No description added yet."}</p></div>
                <div style={styles.companyInfoBox}><h3 style={styles.companyInfoTitle}>Accessibility Statement</h3><p style={styles.companyInfoText}>{selectedCompanyProfile.accessibilityStatement || "No accessibility statement added yet."}</p></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  {[
                    { label: "Location", value: selectedCompanyProfile.location || selectedCompany.location || "Not specified" },
                    { label: "Open Jobs", value: companyJobs.length },
                  ].map((item) => (
                    <div key={item.label} style={styles.companyMiniBox}>
                      <strong style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</strong>
                      <span style={{ fontSize: "14px", color: "#0f172a", fontWeight: "500" }}>{item.value}</span>
                    </div>
                  ))}
                  <div style={styles.companyMiniBox}>
                    <strong style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Website</strong>
                    {selectedCompanyProfile.website ? (
                      <a href={selectedCompanyProfile.website.startsWith("http") ? selectedCompanyProfile.website : `https://${selectedCompanyProfile.website}`} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: "500", fontSize: "13px" }}>{selectedCompanyProfile.website}</a>
                    ) : <span style={{ fontSize: "13px", color: "#94a3b8" }}>Not specified</span>}
                  </div>
                </div>
              </div>
            )}
            {companyModalTab === "JOBS" && (
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {companyJobs.length === 0 && <div style={styles.emptyBox}>No open jobs currently available.</div>}
                {companyJobs.map((job) => (
                  <div key={job.id} style={{ border: "1px solid #e8edf5", borderRadius: "12px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", background: "#fafbfc" }}>
                    <div>
                      <h3 style={{ margin: "0 0 3px", color: "#0f172a", fontSize: "14px", fontWeight: "600" }}>{job.title}</h3>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>{job.location} · {job.jobType} · {job.workMode}</p>
                      {job.assistanceAvailable && <AccommodationBadge compact />}
                    </div>
                    <button type="button" style={{ border: "none", background: "#2563eb", color: "#fff", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "12px", fontFamily: "Inter, sans-serif" }} onClick={() => openJobFromCompany(job)}>View & Apply</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif', WebkitFontSmoothing: "antialiased" },
  header: { background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)", padding: "22px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 20px rgba(29,78,216,0.2)" },
  headerGreeting: { margin: "0 0 4px", color: "#93c5fd", fontSize: "12px", fontWeight: "400" },
  headerTitle: { margin: 0, fontSize: "20px", fontWeight: "500", color: "#ffffff", letterSpacing: "0.1px" },
  userBox: { display: "flex", alignItems: "center", gap: "10px" },
  userAvatar: { width: "38px", height: "38px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "600" },
  userName: { margin: 0, color: "#ffffff", fontSize: "13px", fontWeight: "500" },
  userRole: { margin: "2px 0 0", color: "#93c5fd", fontSize: "11px" },
  logoutBtn: { marginLeft: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#e0effe", cursor: "pointer", fontSize: "12px", fontWeight: "400", padding: "6px 12px", borderRadius: "7px", fontFamily: "Inter, sans-serif" },
  tabs: { background: "#ffffff", padding: "0 48px", display: "flex", gap: "4px", borderBottom: "1px solid #e8edf5" },
  tabButton: { background: "transparent", border: "none", padding: "15px 14px", cursor: "pointer", fontSize: "13px", fontWeight: "400", color: "#64748b", borderBottom: "2px solid transparent", transition: "all 0.15s", borderRadius: 0, fontFamily: "Inter, sans-serif" },
  activeTab: { color: "#2563eb", borderBottom: "2px solid #2563eb", fontWeight: "600" },
  main: { padding: "22px 26px" },
  stepRow: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "18px" },
  stepDot: { width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0 },
  stepLabel: { fontSize: "11px", fontWeight: "500", whiteSpace: "nowrap" },
  stepLine: { width: "44px", height: "1px", background: "#e2e8f0", margin: "0 8px" },
  profileGrid: { display: "grid", gridTemplateColumns: "1fr", gap: "18px" },
  card: { background: "#ffffff", borderRadius: "18px", padding: "24px", boxShadow: "0 1px 10px rgba(15,23,42,0.05)", border: "1px solid #e8edf5" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" },
  sectionTitle: { margin: "0 0 4px", fontSize: "17px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.2px", textAlign: "center" },
  text: { color: "#64748b", fontSize: "13px", lineHeight: "1.5", margin: 0, textAlign: "center" },
  selectedPill: { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "999px", padding: "4px 11px", fontSize: "12px", fontWeight: "500", whiteSpace: "nowrap" },
  profileFieldLabel: { display: "grid", gap: "5px", color: "#475569", fontSize: "12px", fontWeight: "500" },
  searchWrapper: { position: "relative", marginBottom: "12px" },
  searchInput: { width: "100%", padding: "10px 12px 10px 34px", borderRadius: "9px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#f8fafc", color: "#0f172a", fontFamily: "Inter, sans-serif" },
  selectedChipsRow: { display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px", alignItems: "center" },
  selectedChip: { display: "inline-flex", alignItems: "center", gap: "5px", background: "#eff6ff", color: "#2563eb", padding: "4px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", border: "1px solid #bfdbfe" },
  chipRemove: { background: "none", border: "none", color: "#93c5fd", cursor: "pointer", fontSize: "13px", padding: "0", lineHeight: "1", fontFamily: "Inter, sans-serif" },
  resetBtn: { background: "none", border: "1px solid #e2e8f0", color: "#94a3b8", cursor: "pointer", fontSize: "11px", fontWeight: "400", padding: "4px 9px", borderRadius: "999px", fontFamily: "Inter, sans-serif" },
  disabilityGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" },
  disabilityCard: { position: "relative", border: "1px solid #e8edf5", background: "#fafbfc", borderRadius: "13px", padding: "10px", cursor: "pointer", minHeight: "175px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s ease", outline: "none" },
  selectedDisabilityCard: { border: "1.5px solid #2563eb", background: "#eff6ff", boxShadow: "0 4px 14px rgba(37,99,235,0.1)", transform: "translateY(-1px)" },
  selectedCheck: { position: "absolute", top: "8px", right: "8px", width: "17px", height: "17px", borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700" },
  imageWrapper: { width: "100%", height: "125px", background: "#ffffff", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  disabilityImage: { width: "100%", height: "100%", objectFit: "contain" },
  disabilityName: { marginTop: "6px", fontSize: "11px", fontWeight: "500", textAlign: "center" },
  saveRow: { display: "flex", alignItems: "center", gap: "12px", marginTop: "18px", flexWrap: "wrap" },
  saveButton: { border: "none", background: "#2563eb", color: "#ffffff", padding: "9px 18px", borderRadius: "9px", cursor: "pointer", fontWeight: "500", fontSize: "13px", fontFamily: "Inter, sans-serif", boxShadow: "0 2px 8px rgba(37,99,235,0.22)" },
  successText: { color: "#16a34a", fontWeight: "500", fontSize: "13px" },
  errorText: { color: "#dc2626", fontWeight: "500", fontSize: "13px", marginTop: "6px" },
  infoText: { color: "#94a3b8", fontSize: "13px" },
  aiCard: { background: "#ffffff", borderRadius: "18px", padding: "22px", boxShadow: "0 1px 10px rgba(15,23,42,0.05)", border: "1px solid #e8edf5" },
  aiCardHeader: { display: "flex", alignItems: "center", gap: "11px", marginBottom: "12px", justifyContent: "center" },
  aiIconWrapper: { width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  aiTitle: { margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" },
  aiSubtitle: { margin: "1px 0 0", fontSize: "11px", color: "#94a3b8", fontWeight: "400" },
  aiDescription: { color: "#64748b", fontSize: "13px", lineHeight: "1.55", marginBottom: "14px", textAlign: "center" },
  aiButton: { width: "100%", border: "none", background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#ffffff", padding: "11px", borderRadius: "10px", fontWeight: "500", fontSize: "13px", fontFamily: "Inter, sans-serif", letterSpacing: "0.1px", transition: "all 0.15s" },
  aiErrorBox: { marginTop: "10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 12px", color: "#dc2626", fontSize: "12px", fontWeight: "400" },
  aiEmptyState: { textAlign: "center", padding: "28px 16px" },
  aiEmptyText: { color: "#94a3b8", fontSize: "12px", fontWeight: "400", lineHeight: "1.5", margin: 0 },
  jobsGrid: { marginTop: "18px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" },
  jobCard: { border: "1px solid #e8edf5", background: "#ffffff", borderRadius: "14px", padding: "14px", cursor: "pointer", textAlign: "left", display: "flex", gap: "11px", alignItems: "center", transition: "all 0.15s" },
  companyLogo: { width: "44px", height: "44px", borderRadius: "11px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "18px", flexShrink: 0, overflow: "hidden" },
  companyLogoImage: { width: "100%", height: "100%", objectFit: "cover" },
  jobCardContent: { minWidth: 0 },
  jobTitle: { margin: "0 0 3px", fontSize: "14px", color: "#0f172a", fontWeight: "600" },
  jobTitleButton: { display: "block", margin: "0 0 3px", padding: 0, border: "none", background: "transparent", color: "#0f172a", fontSize: "14px", fontWeight: "600", textAlign: "left", cursor: "pointer", fontFamily: "Inter, sans-serif" },
  companyNameButton: { display: "block", margin: 0, padding: 0, border: "none", background: "transparent", color: "#64748b", fontSize: "12px", fontWeight: "400", textDecoration: "underline", textUnderlineOffset: "2px", cursor: "pointer", fontFamily: "Inter, sans-serif", textAlign: "left" },
  companyNameLink: { border: "none", background: "transparent", padding: 0, margin: 0, color: "#2563eb", fontSize: "14px", fontWeight: "500", textDecoration: "underline", textUnderlineOffset: "2px", cursor: "pointer", fontFamily: "Inter, sans-serif" },
  companyWebsiteLink: { color: "#2563eb", fontWeight: "400", textDecoration: "underline", wordBreak: "break-word" },
  emptyBox: { marginTop: "14px", border: "1.5px dashed #e2e8f0", borderRadius: "12px", padding: "24px", textAlign: "center", color: "#94a3b8", fontWeight: "400", fontSize: "13px" },
  backButton: { border: "none", background: "#f1f5f9", color: "#475569", padding: "7px 13px", borderRadius: "8px", cursor: "pointer", fontWeight: "400", marginBottom: "18px", fontSize: "13px", fontFamily: "Inter, sans-serif" },
  jobDetailsHeader: { display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" },
  companyLogoLarge: { width: "68px", height: "68px", borderRadius: "14px", background: "#ffffff", border: "1px solid #e8edf5", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "24px", flexShrink: 0, overflow: "hidden", padding: "4px", boxSizing: "border-box" },
  companyLogoLargeImage: { width: "100%", height: "100%", objectFit: "contain" },
  jobDetailsTitle: { margin: "0 0 3px", color: "#0f172a", fontSize: "22px", fontWeight: "700" },
  jobMeta: { margin: "5px 0 0", color: "#64748b", fontWeight: "400", fontSize: "13px" },
  detailsGrid: { display: "grid", gridTemplateColumns: "repeat(1, minmax(0, 1fr))", gap: "10px", marginBottom: "20px", maxWidth: "260px" },
  detailBox: { background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "5px", color: "#374151", fontSize: "13px" },
  detailsSectionTitle: { margin: "18px 0 7px", color: "#0f172a", fontSize: "15px", fontWeight: "600", textAlign: "left" },
  detailsText: { color: "#64748b", lineHeight: "1.65", margin: 0, fontSize: "13px", textAlign: "left" },
  taskList: { display: "flex", flexDirection: "column", gap: "8px" },
  taskItem: { background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "12px", padding: "12px" },
  taskHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" },
  feasibilityBadge: { padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", whiteSpace: "nowrap" },
  abilityChips: { display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" },
  abilityChip: { background: "#eef2ff", color: "#4338ca", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "400" },
  applicationBox: { marginTop: "20px", background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "14px", padding: "18px" },
  uploadLabel: { display: "flex", flexDirection: "column", gap: "7px", color: "#0f172a", fontWeight: "500", marginBottom: "12px", fontSize: "13px" },
  fileInput: { padding: "9px 11px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#ffffff", cursor: "pointer", fontSize: "13px" },
  applyButton: { marginTop: "4px", border: "none", background: "#2563eb", color: "#ffffff", padding: "10px 16px", borderRadius: "9px", cursor: "pointer", fontWeight: "500", fontSize: "13px", fontFamily: "Inter, sans-serif" },
  applicationsShell: { background: "#ffffff", borderRadius: "18px", padding: "24px", boxShadow: "0 1px 10px rgba(15,23,42,0.05)", border: "1px solid #e8edf5" },
  applicationsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  applicationsIcon: { width: "40px", height: "40px", borderRadius: "11px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  applicationsTitle: { margin: 0, fontSize: "18px", fontWeight: "600", color: "#0f172a" },
  applicationsSubtitle: { margin: "3px 0 0", color: "#64748b", fontSize: "12px", fontWeight: "400" },
  statusFilterSelect: { border: "1px solid #e2e8f0", background: "#ffffff", color: "#475569", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "400", cursor: "pointer", outline: "none", fontFamily: "Inter, sans-serif" },
  applicationCards: { display: "flex", flexDirection: "column", gap: "10px" },
  applicationCard: { border: "1px solid #e8edf5", borderRadius: "14px", padding: "18px 20px", background: "#ffffff", display: "flex", alignItems: "center", gap: "16px" },
  applicationCompanyIcon: { width: "48px", height: "48px", borderRadius: "12px", background: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  applicationCompanyLogoImage: { width: "100%", height: "100%", objectFit: "cover" },
  applicationInfo: { flex: 1, textAlign: "left", minWidth: 0 },
  applicationJobTitle: { margin: "0 0 5px", fontSize: "15px", fontWeight: "600", color: "#0f172a" },
  applicationCompanyButton: { border: "none", background: "transparent", margin: "0 0 8px", padding: 0, color: "#64748b", fontSize: "12px", fontWeight: "400", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px", fontFamily: "Inter, sans-serif" },
  applicationMetaRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px", color: "#94a3b8", fontSize: "12px", fontWeight: "400" },
  metaItem: { display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" },
  applicationStatusBadge: { padding: "5px 11px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", textTransform: "capitalize", whiteSpace: "nowrap" },
  companyOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 999, backdropFilter: "blur(3px)" },
  companyModal: { width: "820px", maxWidth: "95vw", maxHeight: "88vh", overflowY: "auto", background: "#ffffff", borderRadius: "18px", padding: "26px", boxShadow: "0 16px 50px rgba(15,23,42,0.18)", position: "relative" },
  companyCloseButton: { position: "absolute", top: "14px", right: "16px", width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#f1f5f9", color: "#64748b", fontSize: "18px", fontWeight: "500", cursor: "pointer", fontFamily: "Inter, sans-serif" },
  companyTabs: { display: "flex", gap: "14px", borderBottom: "1px solid #e8edf5", marginTop: "18px" },
  companyTabButton: { border: "none", background: "transparent", padding: "11px 0", color: "#64748b", fontWeight: "400", fontSize: "13px", cursor: "pointer", borderBottom: "2px solid transparent", fontFamily: "Inter, sans-serif" },
  companyTabActive: { color: "#2563eb", borderBottom: "2px solid #2563eb", fontWeight: "600" },
  companyInfoBox: { background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "12px", padding: "14px" },
  companyInfoTitle: { margin: "0 0 5px", color: "#0f172a", fontSize: "13px", fontWeight: "600" },
  companyInfoText: { margin: 0, color: "#64748b", lineHeight: "1.65", fontWeight: "400", fontSize: "13px" },
  companyMiniBox: { background: "#ffffff", border: "1px solid #e8edf5", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "4px" },
};

export default CandidateDashboard;
