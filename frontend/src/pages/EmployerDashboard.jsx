import { Children, cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  createEmployerJob,
  getEmployerJobs,
  updateEmployerJob,
  deleteEmployerJob,
  getEmployerApplications,
  updateApplicationStatus,
  deleteEmployerApplication,
  updateEmployerProfile,
  getEmployerProfile,
  getJobDefinitions,
  getEmployerJobDefinition,
} from "../services/employerApi";
import {
  getToken,
  logout,
} from "../services/authService";
import { API_BASE_URL, BACKEND_BASE_URL } from "../config";
import useDialogFocus from "../hooks/useDialogFocus";
import AccessibleNotice from "../components/accessibility/AccessibleNotice";
import { disabilityOptions } from "../features/candidate/profile/profileOptions";

const globalStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  .nav-btn:hover { background: rgba(255,255,255,0.07) !important; color: #ffffff !important; }
  .row-hover:hover { background: #f8fafc !important; }
  .input-field:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
`;

const emptyForm = {
  jobDefinitionId: "", location: "", jobType: "Full-time",
  workMode: "On-site", description: "",
  applicationDeadline: "",
  assistanceAvailable: false,
};
const emptyProfile = { companyName: "", industry: "", location: "", website: "", description: "", accessibilityStatement: "" };

function findLoadedItem(items, spokenValue, labels) {
  if (!items?.length) return null;
  const value = String(spokenValue || "").trim().toLowerCase();
  const ordinal = { first: 0, "1": 0, "1st": 0, second: 1, "2": 1, "2nd": 1, third: 2, "3": 2, "3rd": 2 }[value];
  if (ordinal !== undefined) return items[ordinal] || null;
  return items.find((item) => labels(item).some((label) => {
    const normalized = String(label || "").toLowerCase();
    return normalized && (normalized === value || normalized.includes(value) || value.includes(normalized));
  })) || null;
}

function PostJobIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
}
function MyJobsIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
}
function ApplicationsIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}
function ProfileIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function LogoutIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}

function Field({ label, children, hint }) {
  const generatedId = useId();
  const childList = Children.toArray(children);
  const controlIndex = childList.findIndex(
    (child) => isValidElement(child)
      && typeof child.type === "string"
      && ["input", "select", "textarea"].includes(child.type),
  );
  const control = controlIndex >= 0 ? childList[controlIndex] : null;
  const inputId = control?.props.id || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [control?.props["aria-describedby"], hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "16px" }}>
      <label htmlFor={inputId} style={{ fontSize: "12px", fontWeight: "500", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</label>
      {hint && <p id={hintId} style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>{hint}</p>}
      {childList.map((child, index) => (
        index === controlIndex
          ? cloneElement(child, { id: inputId, "aria-describedby": describedBy })
          : child
      ))}
    </div>
  );
}

function EmployerDashboard() {
  const location = useLocation();
  const { t } = useTranslation("dashboards");
  const [activeTab, setActiveTab] = useState("POST_JOB");
  const [formData, setFormData] = useState(emptyForm);
  const [jobDefinitions, setJobDefinitions] = useState([]);
  const [catalogueTasks, setCatalogueTasks] = useState([]);
  const [highlightedTaskIds, setHighlightedTaskIds] = useState([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [editingJobId, setEditingJobId] = useState(null);
  const [myJobs, setMyJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [employerProfile, setEmployerProfile] = useState(emptyProfile);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const logoInputRef = useRef(null);
  const logoButtonRef = useRef(null);
  const messageRef = useRef(null);
  const errorRef = useRef(null);
  const voiceActionHandlerRef = useRef(null);
  const candidateDialogRef = useDialogFocus(Boolean(selectedProfile), () => setSelectedProfile(null));

  useEffect(() => {
    const requestedTab = location.state?.voiceTab;
    if (!["POST_JOB", "MY_JOBS", "APPLICATIONS", "PROFILE"].includes(requestedTab)) return;
    setActiveTab(requestedTab);
  }, [location.state?.voiceNavigationTurn, location.state?.voiceTab]);

  function switchTab(tab) { setMessage(""); setError(""); setActiveTab(tab); }

  const fetchMyJobs = useCallback(async () => {
    try { setLoadingJobs(true); setError(""); const data = await getEmployerJobs(); setMyJobs(data.jobs || []); }
    catch { setError(t("employer.errors.jobsLoad")); } finally { setLoadingJobs(false); }
  }, [t]);

  const fetchApplications = useCallback(async () => {
    try { setLoadingApplications(true); setError(""); const data = await getEmployerApplications(); setApplications(data.applications || []); }
    catch { setError(t("employer.errors.applicationsLoad")); } finally { setLoadingApplications(false); }
  }, [t]);

  const fetchEmployerProfile = useCallback(async () => {
    try {
      setLoadingProfile(true); setError("");
      const data = await getEmployerProfile();
      if (data.profile) {
        setEmployerProfile({ companyName: data.profile.companyName || "", industry: data.profile.industry || "", location: data.profile.location || "", website: data.profile.website || "", description: data.profile.description || "", accessibilityStatement: data.profile.accessibilityStatement || "" });
        setLogoPreview(data.profile.logoUrl || "");
        setFormData((previous) => ({ ...previous, location: previous.location || data.profile.location || "" }));
      }
    } catch { setError(t("employer.errors.profileLoad")); } finally { setLoadingProfile(false); }
  }, [t]);

  function resetForm() { setFormData({ ...emptyForm, location: employerProfile.location || "" }); setHighlightedTaskIds([]); setCatalogueTasks([]); setTaskSearch(""); setEditingJobId(null); }
  function handleChange(e) { const { name, value, type, checked } = e.target; setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value })); }
  function handleProfileChange(e) { const { name, value } = e.target; setEmployerProfile((prev) => ({ ...prev, [name]: value })); }
  function handleLogoChange(e) { const file = e.target.files?.[0]; if (!file) return; setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }

  async function handleSaveProfile() {
    try {
      setLoading(true); setError(""); setMessage("");
      const fd = new FormData();
      Object.entries(employerProfile).forEach(([k, v]) => fd.append(k, v));
      if (logoFile) fd.append("logo", logoFile);
      const data = await updateEmployerProfile(fd);
      if (data.profile) {
        setEmployerProfile({ companyName: data.profile.companyName || "", industry: data.profile.industry || "", location: data.profile.location || "", website: data.profile.website || "", description: data.profile.description || "", accessibilityStatement: data.profile.accessibilityStatement || "" });
        setLogoPreview(data.profile.logoUrl || ""); setLogoFile(null);
      }
      setMessage(t("employer.success.profileSaved"));
    } catch { setError(t("employer.errors.profileSave")); } finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setMessage(""); setError("");
    try {
      const payload = { ...formData, highlightedTaskIds }; setLoading(true);
      if (editingJobId) { await updateEmployerJob(editingJobId, payload); setMessage(t("employer.success.jobUpdated")); }
      else { await createEmployerJob(payload); setMessage(t("employer.success.jobPosted")); }
      resetForm(); setActiveTab("MY_JOBS"); await fetchMyJobs();
    } catch { setError(t("employer.errors.jobSave")); } finally { setLoading(false); }
  }

  function handleEditJob(job) {
    setMessage(""); setError(""); setEditingJobId(job.id);
    setFormData({ jobDefinitionId: String(job.jobDefinitionId || ""), location: job.location || "", jobType: job.jobType || "Full-time", workMode: job.workMode || "On-site", description: job.description || "", applicationDeadline: job.applicationDeadline || "", assistanceAvailable: Boolean(job.assistanceAvailable) });
    setHighlightedTaskIds((job.highlightedTasks || []).map((task) => task.id));
    if (job.jobDefinitionId) getEmployerJobDefinition(job.jobDefinitionId).then((data) => setCatalogueTasks(data.job?.tasks || [])).catch(() => setError(t("employer.errors.tasksLoad")));
    setActiveTab("POST_JOB");
  }

  async function handleJobDefinitionChange(event) {
    const value = event.target.value;
    setFormData((previous) => ({ ...previous, jobDefinitionId: value }));
    setHighlightedTaskIds([]); setTaskSearch(""); setCatalogueTasks([]);
    if (!value) return;
    try { const data = await getEmployerJobDefinition(value); setCatalogueTasks(data.job?.tasks || []); }
    catch { setError(t("employer.errors.tasksLoad")); }
  }

  function toggleHighlightedTask(taskId) {
    setHighlightedTaskIds((current) => current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]);
  }

  async function handleDeleteJob(jobId, confirmed = false) {
    if (!confirmed && !window.confirm(t("employer.confirm.deleteJob"))) return;
    try { setError(""); setMessage(""); await deleteEmployerJob(jobId); setMessage(t("employer.success.jobDeleted")); await fetchMyJobs(); }
    catch { setError(t("employer.errors.jobDelete")); }
  }

  async function handleStatusChange(appId, newStatus) {
    try {
      setError(""); setMessage("");
      const data = await updateApplicationStatus(appId, newStatus);
      setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a));
      if (data.statusChanged === false) {
        setMessage(t("employer.outcomes.unchanged", { status: t(`employer.statuses.${newStatus}`) }));
        return;
      }
      setMessage(t(`employer.outcomes.${data.notificationSent ? "emailSent" : "emailUnavailable"}`, { status: t(`employer.statuses.${newStatus}`) }));
    }
    catch { setError(t("employer.errors.statusUpdate")); }
  }

  useEffect(() => {
    if (activeTab === "MY_JOBS") fetchMyJobs();
    if (activeTab === "APPLICATIONS") fetchApplications();
    if (activeTab === "PROFILE") fetchEmployerProfile();
  }, [activeTab, fetchApplications, fetchEmployerProfile, fetchMyJobs]);

  useEffect(() => {
    getJobDefinitions()
      .then((data) => setJobDefinitions(data.jobs || []))
      .catch(() => setError(t("employer.errors.definitionsLoad")));
    fetchEmployerProfile();
  }, [fetchEmployerProfile, t]);

  async function handleDeleteApplication(appId, confirmed = false) {
    if (!confirmed && !window.confirm(t("employer.confirm.removeApplication"))) return;
    try { setError(""); setMessage(""); await deleteEmployerApplication(appId); setApplications((prev) => prev.filter((a) => a.id !== appId)); setMessage(t("employer.success.applicationRemoved")); setTimeout(() => setMessage(""), 3000); }
    catch { setError(t("employer.errors.applicationDelete")); }
  }

  function handleViewProfile(app) {
    setSelectedProfile({ name: app.candidateName, email: app.candidateEmail, selectedDisabilities: app.candidateSelectedDisabilities || [], educationLevel: app.candidateEducationLevel || t("employer.common.notProvided") });
  }

  async function fetchFileBlob(appId, type) {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/employer/applications/${appId}/download/${type}`, { method: "GET", headers: { "X-Auth-Token": token } });
    if (!res.ok) throw new Error("file_load_failed");
    return res.blob();
  }

  async function handleView(appId, type) {
    try { setError(""); const blob = await fetchFileBlob(appId, type); window.open(window.URL.createObjectURL(blob), "_blank"); }
    catch { setError(t("employer.errors.fileLoad")); }
  }

  async function handleDownload(appId, type, name) {
    try {
      setError(""); const blob = await fetchFileBlob(appId, type);
      const url = window.URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = name || `${type}-document`; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
    } catch { setError(t("employer.errors.fileDownload")); }
  }

  function getLogoSrc() {
    if (!logoPreview) return "";
    if (logoPreview.startsWith("blob:")) return logoPreview;
    if (logoPreview.startsWith("/uploads")) return `${BACKEND_BASE_URL}${logoPreview}`;
    return logoPreview;
  }

  function getStatusStyle(status) {
    if (!status) return { background: "#fff7ed", color: "#c2410c" };
    const s = status.toLowerCase();
    if (s === "accepted") return { background: "#f0fdf4", color: "#16a34a" };
    if (s === "rejected") return { background: "#fef2f2", color: "#dc2626" };
    if (s === "in_review") return { background: "#eff6ff", color: "#2563eb" };
    return { background: "#fff7ed", color: "#c2410c" };
  }

  function disabilityLabel(name) {
    const option = disabilityOptions.find((item) => item.name === name);
    return option ? t(`profile:disabilities.${option.key}`) : name;
  }

  function handleLogout() {
    logout();
    window.location.href = "/signin";
  }

  voiceActionHandlerRef.current = (event) => {
      const action = event.detail.action;
      if (!action) return;
      const respond = (feedback) => {
        event.detail.handled = true;
        event.detail.feedback = feedback;
      };
      const jobFields = {
        job_location: "location",
        application_deadline: "applicationDeadline",
        job_description: "description",
      };
      const profileFields = {
        company_name: "companyName",
        industry: "industry",
        company_location: "location",
        website: "website",
        company_description: "description",
        accessibility_statement: "accessibilityStatement",
      };
      const findJob = () => findLoadedItem(myJobs, action.value, (job) => [job.title, job.jobDefinitionName, job.location]);
      const findApplication = () => findLoadedItem(applications, action.value, (app) => [app.candidateName, app.candidateEmail, app.jobTitle]);

      if (action.type === "set_field" || action.type === "clear_field") {
        const value = action.type === "clear_field" ? "" : action.value;
        if (jobFields[action.target]) {
          switchTab("POST_JOB");
          setFormData((current) => ({ ...current, [jobFields[action.target]]: value }));
        } else if (action.target === "task_search") {
          switchTab("POST_JOB"); setTaskSearch(value);
        } else if (profileFields[action.target]) {
          switchTab("PROFILE");
          setEmployerProfile((current) => ({ ...current, [profileFields[action.target]]: value }));
        } else return;
        respond(t("employer.voice.fieldSet", { field: action.label, value }));
      } else if (action.type === "select_option") {
        if (["job_type", "work_mode"].includes(action.target)) {
          const key = action.target === "job_type" ? "jobType" : "workMode";
          switchTab("POST_JOB");
          setFormData((current) => ({ ...current, [key]: action.value }));
        } else if (action.target === "assistance_available") {
          const key = "assistanceAvailable";
          switchTab("POST_JOB");
          setFormData((current) => ({ ...current, [key]: action.value === "yes" }));
        } else return;
        respond(t("employer.voice.fieldSet", { field: action.label, value: action.value }));
      } else if (action.type === "toggle_option" && action.target === "job_task") {
        const task = findLoadedItem(catalogueTasks, action.value, (item) => [item.taskName, item.name]);
        if (!task) { respond(t("employer.voice.taskNotFound", { value: action.value })); return; }
        toggleHighlightedTask(task.id);
        respond(t("employer.voice.taskChanged", { task: task.taskName }));
      } else if (action.type === "open_item") {
        if (action.target === "job_definition") {
          const definition = findLoadedItem(jobDefinitions, action.value, (item) => [item.name]);
          if (!definition) { respond(t("employer.voice.positionNotFound", { value: action.value })); return; }
          switchTab("POST_JOB");
          handleJobDefinitionChange({ target: { value: String(definition.id) } });
          respond(t("employer.voice.selected", { value: definition.name }));
        } else if (action.target === "edit_job") {
          const job = findJob();
          if (!job) { respond(t("employer.voice.jobNotFound", { value: action.value })); return; }
          handleEditJob(job); respond(t("employer.voice.openingEdit", { value: job.title || t("employer.voice.theJob") }));
        } else if (action.target === "delete_job") {
          const job = findJob();
          if (!job) { respond(t("employer.voice.jobNotFound", { value: action.value })); return; }
          handleDeleteJob(job.id, true); respond(t("employer.voice.deleting", { value: job.title || t("employer.voice.theSelectedJob") }));
        } else if (["view_candidate_profile", "accept_application", "reject_application", "review_application", "delete_application", "view_application_document", "download_application_document", "view_recommendation", "download_recommendation"].includes(action.target)) {
          const app = findApplication();
          if (!app) { respond(t("employer.voice.applicationNotFound", { value: action.value })); return; }
          if (action.target === "view_candidate_profile") handleViewProfile(app);
          if (action.target === "accept_application") handleStatusChange(app.id, "accepted");
          if (action.target === "reject_application") handleStatusChange(app.id, "rejected");
          if (action.target === "review_application") handleStatusChange(app.id, "in_review");
          if (action.target === "delete_application") handleDeleteApplication(app.id, true);
          if (action.target === "view_application_document") handleView(app.id, "application");
          if (action.target === "download_application_document") handleDownload(app.id, "application", app.applicationOriginalName);
          if (action.target === "view_recommendation") handleView(app.id, "recommendation");
          if (action.target === "download_recommendation") handleDownload(app.id, "recommendation", app.recommendationOriginalName);
          respond(t("employer.voice.activatedFor", { action: action.label, value: app.candidateName || app.jobTitle }));
        } else return;
      } else if (action.type === "focus_field" && action.target === "company_logo") {
        switchTab("PROFILE");
        window.requestAnimationFrame(() => logoButtonRef.current?.focus());
        respond(t("employer.voice.logoFocused"));
      } else if (action.type === "press") {
        if (action.target === "select_all_tasks") setHighlightedTaskIds(catalogueTasks.map((task) => task.id));
        else if (action.target === "clear_tasks") setHighlightedTaskIds([]);
        else if (action.target === "reset_job_form") resetForm();
        else if (action.target === "submit_job") handleSubmit({ preventDefault() {} });
        else if (action.target === "save_company_profile") handleSaveProfile();
        else if (action.target === "close_candidate_profile") setSelectedProfile(null);
        else if (action.target === "logout") handleLogout();
        else return;
        respond(t("employer.voice.activated", { action: action.label }));
      }
  };

  useEffect(() => {
    function handleVoiceAction(event) {
      voiceActionHandlerRef.current?.(event);
    }
    window.addEventListener("join:voice-action", handleVoiceAction);
    return () => window.removeEventListener("join:voice-action", handleVoiceAction);
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const navItems = [
    { tab: "POST_JOB", label: editingJobId ? t("employer.tabs.editJob") : t("employer.tabs.postJob"), icon: <PostJobIcon /> },
    { tab: "MY_JOBS", label: t("employer.tabs.myJobs"), icon: <MyJobsIcon /> },
    { tab: "APPLICATIONS", label: t("employer.tabs.applications"), icon: <ApplicationsIcon /> },
    { tab: "PROFILE", label: t("employer.tabs.profile"), icon: <ProfileIcon /> },
  ];

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "9px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", fontFamily: "Inter, sans-serif", color: "#0f172a", background: "#f8fafc", transition: "border-color 0.15s, box-shadow 0.15s" };
  const textareaStyle = { ...inputStyle, minHeight: "100px", resize: "vertical", padding: "10px 12px" };

  return (
    <div className="dashboard-screen dashboard-screen--employer" style={{ minHeight: "100vh", display: "flex", fontFamily: '"Inter", -apple-system, sans-serif', background: "#f8fafc", color: "#0f172a" }} data-voice-section="employer-dashboard" data-voice-view={activeTab}>
      <style>{globalStyles}</style>

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar" style={{ width: "220px", minWidth: "220px", background: "linear-gradient(180deg, #0f172a 0%, #0a1628 100%)", padding: "28px 16px", display: "flex", flexDirection: "column", boxSizing: "border-box", boxShadow: "4px 0 20px rgba(0,0,0,0.15)" }}>
        <div style={{ marginBottom: "36px", paddingInlineStart: "8px" }}>
          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>{t("employer.platform")}</p>
          <h2 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "600", color: "#ffffff", letterSpacing: "-0.3px" }}>{t("employer.console")}</h2>
        </div>
        <nav aria-label={t("employer.tabsLabel")} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItems.map(({ tab, label, icon }) => {
            const isActive = activeTab === tab;
            return (
              <button type="button" key={tab} className="nav-btn" aria-current={isActive ? "page" : undefined}
                onClick={() => { if (tab === "POST_JOB") resetForm(); switchTab(tab); }}
                style={{ display: "flex", alignItems: "center", gap: "10px", background: isActive ? "rgba(59,130,246,0.15)" : "transparent", color: isActive ? "#60a5fa" : "#94a3b8", border: "none", textAlign: "start", padding: "10px 12px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: isActive ? "600" : "400", transition: "all 0.15s", fontFamily: "Inter, sans-serif", borderInlineStart: isActive ? "2px solid #3b82f6" : "2px solid transparent" }}>
                {icon}{label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button type="button" onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px", fontWeight: "400", padding: "8px 12px", borderRadius: "8px", fontFamily: "Inter, sans-serif", width: "100%" }}>
            <LogoutIcon />{t("common.signOut")}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="dashboard-main" style={{ flex: 1, padding: "32px 36px", boxSizing: "border-box", overflowX: "hidden" }} aria-busy={loading || loadingJobs || loadingApplications || loadingProfile}>

        {/* HEADER */}
        <div className="dashboard-page-header" style={{ marginBottom: "24px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: "400", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px" }}>{t("employer.role")}</p>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.4px" }}>
            {activeTab === "POST_JOB" ? (editingJobId ? t("employer.tabs.editJob") : t("employer.tabs.postJob")) : activeTab === "MY_JOBS" ? t("employer.tabs.myJobs") : activeTab === "APPLICATIONS" ? t("employer.tabs.applications") : t("employer.tabs.profile")}
          </h1>
        </div>

        {message && (
          <AccessibleNotice noticeRef={messageRef} tone="success">
            ✓ {message}
          </AccessibleNotice>
        )}
        {error && (
          <AccessibleNotice noticeRef={errorRef} tone="error">
            ⚠ {error}
          </AccessibleNotice>
        )}

        {/* POST JOB */}
        {activeTab === "POST_JOB" && (
          <form onSubmit={handleSubmit}>
            <div className="dashboard-content-card" style={{ background: "#ffffff", borderRadius: "20px", padding: "28px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)", marginBottom: "16px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>{t("employer.jobForm.title")}</h2>
              <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#64748b" }}>{t("employer.jobForm.requiredHelp")}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "12px 14px", marginBottom: "18px", borderRadius: "12px", background: employerProfile.companyName ? "#f0fdf4" : "#fff7ed", border: `1px solid ${employerProfile.companyName ? "#bbf7d0" : "#fed7aa"}` }}><div><span style={{ display: "block", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.6px", color: "#64748b" }}>{t("employer.jobForm.postingAs")}</span><strong dir="auto" style={{ color: "#0f172a" }}>{employerProfile.companyName || t("employer.jobForm.profileRequired")}</strong></div>{!employerProfile.companyName && <button type="button" onClick={() => switchTab("PROFILE")} style={{ border: "none", borderRadius: "8px", padding: "8px 11px", background: "#c2410c", color: "#fff", cursor: "pointer" }}>{t("employer.jobForm.completeProfile")}</button>}</div>
              <div className="dashboard-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 20px" }}>
                <Field label={t("employer.jobForm.position")} hint={t("employer.jobForm.positionHint")}>
                  <select className="input-field" style={inputStyle} name="jobDefinitionId" value={formData.jobDefinitionId} onChange={handleJobDefinitionChange} required><option value="">{t("employer.jobForm.positionPlaceholder")}</option>{jobDefinitions.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}</select>
                </Field>
                <Field label={t("employer.jobForm.location")}>
                  <input dir="auto" className="input-field" style={inputStyle} name="location" value={formData.location} onChange={handleChange} required />
                </Field>
                <Field label={t("employer.jobForm.deadline")}>
                  <input
                    className="input-field"
                    style={{ ...inputStyle, cursor: "pointer", colorScheme: "light" }}
                    type="date"
                    name="applicationDeadline"
                    value={formData.applicationDeadline}
                    onChange={handleChange}
                    onClick={(e) => e.target.showPicker?.()}
                    min={today}
                    required
                  />
                </Field>
                <Field label={t("employer.jobForm.jobType")}>
                  <select className="input-field" style={inputStyle} name="jobType" value={formData.jobType} onChange={handleChange}>
                    <option value="Full-time">{t("employer.jobTypes.fullTime")}</option><option value="Part-time">{t("employer.jobTypes.partTime")}</option><option value="Internship">{t("employer.jobTypes.internship")}</option><option value="Seasonal">{t("employer.jobTypes.seasonal")}</option>
                  </select>
                </Field>
                <Field label={t("employer.jobForm.workMode")}>
                  <select className="input-field" style={inputStyle} name="workMode" value={formData.workMode} onChange={handleChange}>
                    <option value="On-site">{t("employer.workModes.onSite")}</option><option value="Hybrid">{t("employer.workModes.hybrid")}</option><option value="Remote">{t("employer.workModes.remote")}</option>
                  </select>
                </Field>
              </div>
              <Field label={t("employer.jobForm.description")}>
                <textarea dir="auto" className="input-field" style={textareaStyle} name="description" value={formData.description} onChange={handleChange} required />
              </Field>
              <Field label={t("employer.jobForm.tasks")} hint={t("employer.jobForm.tasksHint")}>
                <input dir="auto" className="input-field" style={inputStyle} value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} placeholder={formData.jobDefinitionId ? t("employer.jobForm.searchTasks") : t("employer.jobForm.selectPositionFirst")} disabled={!formData.jobDefinitionId} />
                {formData.jobDefinitionId && catalogueTasks.length > 0 && <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}><button type="button" onClick={() => setHighlightedTaskIds(catalogueTasks.map((task) => task.id))} style={{ border: "1px solid #bfdbfe", borderRadius: "8px", padding: "6px 10px", background: "#eff6ff", color: "#1d4ed8", cursor: "pointer", fontSize: "11px", fontWeight: "600" }}>{t("employer.jobForm.selectAllTasks")}</button><button type="button" onClick={() => setHighlightedTaskIds([])} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px 10px", background: "#fff", color: "#64748b", cursor: "pointer", fontSize: "11px", fontWeight: "600" }}>{t("employer.jobForm.clearTasks")}</button></div>}
                {highlightedTaskIds.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "9px" }}>{highlightedTaskIds.map((id) => { const task = catalogueTasks.find((item) => item.id === id); return task ? <button type="button" key={id} onClick={() => toggleHighlightedTask(id)} style={{ border: "none", borderRadius: "999px", padding: "6px 10px", color: "#1d4ed8", background: "#eff6ff", cursor: "pointer" }}>{task.taskName} ×</button> : null; })}</div>}
                {formData.jobDefinitionId && <div aria-label={t("employer.jobForm.availableTasks")} role="group" style={{ marginTop: "8px", maxHeight: "210px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "6px", background: "#fff" }}>{catalogueTasks.filter((task) => task.taskName.toLowerCase().includes(taskSearch.toLowerCase())).map((task) => { const selected = highlightedTaskIds.includes(task.id); return <button type="button" aria-pressed={selected} key={task.id} onClick={() => toggleHighlightedTask(task.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "9px", textAlign: "start", border: "none", borderRadius: "8px", padding: "9px 10px", marginBottom: "2px", background: selected ? "#eff6ff" : "transparent", color: selected ? "#1d4ed8" : "#334155", cursor: "pointer" }}><span aria-hidden="true">{selected ? "✓" : "○"}</span>{task.taskName}</button>; })}</div>}
                <span role="status" style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>{t("employer.jobForm.taskCount", { selected: highlightedTaskIds.length, total: catalogueTasks.length })}</span>
              </Field>
              <div className="dashboard-inline-actions" style={{ display: "flex", gap: "20px", marginTop: "4px" }}>
                {[{ name: "assistanceAvailable", label: t("employer.jobForm.assistance") }].map(({ name, label }) => (
                  <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#475569", cursor: "pointer" }}>
                    <input type="checkbox" name={name} checked={formData[name]} onChange={handleChange} style={{ accentColor: "#2563eb" }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="dashboard-inline-actions" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              {editingJobId && (
                <button type="button" onClick={resetForm} style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", padding: "10px 18px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontFamily: "Inter, sans-serif" }}>
                  {t("employer.jobForm.cancelEdit")}
                </button>
              )}
              <button type="submit" disabled={loading} style={{ border: "none", background: "#2563eb", color: "#fff", padding: "10px 24px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}>
                {loading ? t("employer.common.saving") : editingJobId ? t("employer.jobForm.update") : t("employer.jobForm.publish")}
              </button>
            </div>
          </form>
        )}

        {/* MY JOBS */}
        {activeTab === "MY_JOBS" && (
          <div className="dashboard-content-card" style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}>
            <div className="dashboard-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>{t("employer.myJobs.title")}</h2>
              <span style={{ fontSize: "12px", color: "#64748b" }}>{t("employer.myJobs.count", { count: myJobs.length })}</span>
            </div>
            {loadingJobs && <p style={{ color: "#64748b", textAlign: "center", fontSize: "13px" }}>{t("employer.common.loading")}</p>}
            {!loadingJobs && myJobs.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", border: "1.5px dashed #e2e8f0", borderRadius: "14px" }}>
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>{t("employer.myJobs.empty")}</p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {myJobs.map((job) => (
                <div key={job.id} className="dashboard-item-row" style={{ border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px 20px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>{job.title}</h3>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {[job.companyName, job.location, job.jobType, job.workMode].filter(Boolean).map((tag) => (
                        <span key={tag} style={{ background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "400" }}>{tag}</span>
                      ))}
                      {job.applicationDeadline && (
                        <span style={{ background: "#fffbeb", color: "#a16207", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "400" }}>{t("employer.myJobs.deadline", { date: job.applicationDeadline })}</span>
                      )}
                      {job.assistanceAvailable && (
                        <span style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "600" }}>✓ {t("employer.myJobs.accommodation")}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button type="button" aria-label={t("employer.myJobs.editLabel", { title: job.title })} onClick={() => handleEditJob(job)} style={{ border: "none", background: "#eff6ff", color: "#2563eb", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>{t("employer.common.edit")}</button>
                    <button type="button" aria-label={t("employer.myJobs.deleteLabel", { title: job.title })} onClick={() => handleDeleteJob(job.id)} style={{ border: "none", background: "#fef2f2", color: "#b91c1c", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>{t("employer.common.delete")}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* APPLICATIONS */}
        {activeTab === "APPLICATIONS" && (
          <div className="dashboard-content-card" style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}>
            <div className="dashboard-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>{t("employer.applications.title")}</h2>
              <span style={{ fontSize: "12px", color: "#64748b" }}>{t("employer.applications.count", { count: applications.length })}</span>
            </div>
            {loadingApplications && <p style={{ color: "#64748b", textAlign: "center", fontSize: "13px" }}>{t("employer.common.loading")}</p>}
            {!loadingApplications && applications.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", border: "1.5px dashed #e2e8f0", borderRadius: "14px" }}>
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>{t("employer.applications.empty")}</p>
              </div>
            )}
            {applications.length > 0 && (
              <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label={t("employer.applications.tableLabel")}>
                <table className="dashboard-table dashboard-table--employer-applications" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["candidate", "job", "profile", "status", "application", "recommendation", "action"].map((h) => (
                        <th key={h} style={{ padding: "11px 12px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8edf5", textAlign: "center" }}>{t(`employer.applications.columns.${h}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="row-hover" style={{ transition: "background 0.15s" }}>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", textAlign: "center", fontWeight: "500", color: "#0f172a" }}>{app.candidateName}</td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", textAlign: "center", color: "#64748b" }}>{app.jobTitle}</td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", textAlign: "center" }}>
                          <button type="button" aria-label={t("employer.applications.viewProfileFor", { name: app.candidateName || t("candidate.role") })} onClick={() => handleViewProfile(app)} style={{ border: "none", background: "#f1f5f9", color: "#475569", padding: "5px 10px", borderRadius: "7px", cursor: "pointer", fontSize: "11px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>{t("employer.common.view")}</button>
                        </td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          <select aria-label={t("employer.applications.statusFor", { name: app.candidateName || app.jobTitle })} value={app.status} onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            style={{ padding: "5px 8px", borderRadius: "7px", border: "1px solid #e2e8f0", fontSize: "11px", background: "#f8fafc", color: "#0f172a", cursor: "pointer", outline: "none", fontFamily: "Inter, sans-serif", ...getStatusStyle(app.status) }}>
                            <option value="pending">{t("employer.statuses.pending")}</option>
                            <option value="in_review">{t("employer.statuses.in_review")}</option>
                            <option value="accepted">{t("employer.statuses.accepted")}</option>
                            <option value="rejected">{t("employer.statuses.rejected")}</option>
                          </select>
                        </td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          {app.hasApplicationDocument ? (
                            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                              <button type="button" aria-label={t("employer.applications.viewDocumentFor", { type: t("employer.applications.columns.application"), name: app.candidateName || t("candidate.role") })} onClick={() => handleView(app.id, "application")} style={{ border: "none", background: "#eff6ff", color: "#2563eb", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>{t("employer.common.view")}</button>
                              <button type="button" aria-label={t("employer.applications.downloadDocumentFor", { type: t("employer.applications.columns.application"), name: app.candidateName || t("candidate.role") })} onClick={() => handleDownload(app.id, "application", app.applicationOriginalName)} style={{ border: "none", background: "#f0fdf4", color: "#166534", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>{t("employer.common.download")}</button>
                            </div>
                          ) : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          {app.hasRecommendationLetter ? (
                            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                              <button type="button" aria-label={t("employer.applications.viewDocumentFor", { type: t("employer.applications.columns.recommendation"), name: app.candidateName || t("candidate.role") })} onClick={() => handleView(app.id, "recommendation")} style={{ border: "none", background: "#eff6ff", color: "#2563eb", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>{t("employer.common.view")}</button>
                              <button type="button" aria-label={t("employer.applications.downloadDocumentFor", { type: t("employer.applications.columns.recommendation"), name: app.candidateName || t("candidate.role") })} onClick={() => handleDownload(app.id, "recommendation", app.recommendationOriginalName)} style={{ border: "none", background: "#f0fdf4", color: "#166534", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>{t("employer.common.download")}</button>
                            </div>
                          ) : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          <button type="button" aria-label={t("employer.applications.deleteFor", { name: app.candidateName || t("candidate.role") })} onClick={() => handleDeleteApplication(app.id)} style={{ border: "none", background: "#fef2f2", color: "#b91c1c", padding: "5px 10px", borderRadius: "7px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>{t("employer.common.delete")}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}
        {activeTab === "PROFILE" && (
          <div className="dashboard-profile-layout" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "20px", alignItems: "start" }}>
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: "500", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", alignSelf: "flex-start" }}>{t("employer.profile.logo")}</p>
              <div style={{ width: "160px", height: "160px", borderRadius: "16px", background: "#f8fafc", border: "1.5px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {getLogoSrc() ? (
                  <img src={getLogoSrc()} alt={t("employer.profile.logoAlt", { company: employerProfile.companyName || t("employer.profile.company") })} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <p style={{ color: "#64748b", fontSize: "12px", textAlign: "center", margin: 0 }}>{t("employer.profile.noLogo")}</p>
                )}
              </div>
              <button
                ref={logoButtonRef}
                data-voice-control="company_logo"
                type="button"
                onClick={() => logoInputRef.current?.click()}
                aria-describedby="company-logo-help"
                style={{ border: "none", background: "#2563eb", color: "#fff", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}
              >
                {t("employer.profile.uploadLogo")}
              </button>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: "none" }} onChange={handleLogoChange} tabIndex={-1} aria-hidden="true" />
              <p id="company-logo-help" style={{ margin: 0, fontSize: "11px", color: "#64748b", textAlign: "center" }}>{t("employer.profile.logoHelp")}</p>
              {logoFile && <p role="status" style={{ margin: 0, fontSize: "11px", color: "#166534", textAlign: "center", overflowWrap: "anywhere" }}>{t("employer.profile.selected", { name: logoFile.name })}</p>}
            </div>

            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}>
              {loadingProfile && <p style={{ color: "#64748b", fontSize: "13px" }}>{t("employer.common.loading")}</p>}
              <div className="dashboard-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 20px" }}>
                {[{ name: "companyName", label: t("employer.profile.companyName") }, { name: "industry", label: t("employer.profile.industry") }, { name: "location", label: t("employer.profile.location") }, { name: "website", label: t("employer.profile.website") }].map(({ name, label }) => (
                  <Field key={name} label={label}>
                    <input dir={name === "website" ? "ltr" : "auto"} className="input-field" style={inputStyle} name={name} value={employerProfile[name]} onChange={handleProfileChange} />
                  </Field>
                ))}
              </div>
              <Field label={t("employer.profile.description")}>
                <textarea dir="auto" className="input-field" style={textareaStyle} name="description" value={employerProfile.description} onChange={handleProfileChange} />
              </Field>
              <Field label={t("employer.profile.accessibility")} hint={t("employer.profile.accessibilityHint")}>
                <textarea dir="auto" className="input-field" style={textareaStyle} name="accessibilityStatement" value={employerProfile.accessibilityStatement} onChange={handleProfileChange} />
              </Field>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSaveProfile} disabled={loading} style={{ border: "none", background: "#2563eb", color: "#fff", padding: "10px 24px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}>
                  {loading ? t("employer.common.saving") : t("employer.profile.save")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CANDIDATE PROFILE MODAL */}
      {selectedProfile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: "20px", backdropFilter: "blur(3px)" }}>
          <div ref={candidateDialogRef} role="dialog" aria-modal="true" aria-labelledby="candidate-profile-dialog-title" tabIndex={-1} style={{ width: "100%", maxWidth: "500px", background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 20px 60px rgba(15,23,42,0.2)", position: "relative" }}>
            <button type="button" aria-label={t("employer.candidateProfile.close")} onClick={() => setSelectedProfile(null)} style={{ position: "absolute", top: "14px", insetInlineEnd: "16px", width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#f1f5f9", color: "#64748b", fontSize: "18px", cursor: "pointer" }}>×</button>
            <h2 id="candidate-profile-dialog-title" style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "600", color: "#0f172a" }}>{t("employer.candidateProfile.title")}</h2>
            <p style={{ margin: "0 0 18px", fontSize: "13px", color: "#64748b" }}>{t("employer.candidateProfile.intro")}</p>
            <div style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
              <p dir="auto" style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{selectedProfile.name || t("employer.common.notSpecified")}</p>
              <p dir="ltr" style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{selectedProfile.email || t("employer.common.notSpecified")}</p>
            </div>
            {[
              { title: t("employer.candidateProfile.disabilities"), items: selectedProfile.selectedDisabilities, chipStyle: { background: "#eef2ff", color: "#4338ca" }, empty: t("employer.candidateProfile.noDisabilities") },
            ].map(({ title, items, chipStyle, empty }) => (
              <div key={title} style={{ marginBottom: "14px" }}>
                <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{title}</p>
                {items.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {items.map((item) => <span key={item} style={{ ...chipStyle, padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "400" }}>{disabilityLabel(item)}</span>)}
                  </div>
                ) : <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{empty}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployerDashboard;
