import { useEffect, useState } from "react";
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
  getToken,
  logout,
} from "../services/authService";
import { API_BASE_URL, BACKEND_BASE_URL } from "../config";

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
  title: "", companyName: "", location: "", jobType: "Full-time",
  workMode: "On-site", description: "", requirements: "",
  applicationDeadline: "", cvRequired: true, coverLetterRequired: false,
};
const emptyTask = { taskName: "", description: "", requiredAbilitiesText: "" };
const emptyProfile = { companyName: "", industry: "", location: "", website: "", description: "", accessibilityStatement: "" };

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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "16px" }}>
      <label style={{ fontSize: "12px", fontWeight: "500", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</label>
      {hint && <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>{hint}</p>}
      {children}
    </div>
  );
}

function EmployerDashboard() {
  const [activeTab, setActiveTab] = useState("POST_JOB");
  const [formData, setFormData] = useState(emptyForm);
  const [tasks, setTasks] = useState([emptyTask]);
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

  useEffect(() => {
    if (activeTab === "MY_JOBS") fetchMyJobs();
    if (activeTab === "APPLICATIONS") fetchApplications();
    if (activeTab === "PROFILE") fetchEmployerProfile();
  }, [activeTab]);

  function switchTab(tab) { setMessage(""); setError(""); setActiveTab(tab); }

  async function fetchMyJobs() {
    try { setLoadingJobs(true); setError(""); const data = await getEmployerJobs(); setMyJobs(data.jobs || []); }
    catch (err) { setError(err.message); } finally { setLoadingJobs(false); }
  }

  async function fetchApplications() {
    try { setLoadingApplications(true); setError(""); const data = await getEmployerApplications(); setApplications(data.applications || []); }
    catch (err) { setError(err.message); } finally { setLoadingApplications(false); }
  }

  async function fetchEmployerProfile() {
    try {
      setLoadingProfile(true); setError("");
      const data = await getEmployerProfile();
      if (data.profile) {
        setEmployerProfile({ companyName: data.profile.companyName || "", industry: data.profile.industry || "", location: data.profile.location || "", website: data.profile.website || "", description: data.profile.description || "", accessibilityStatement: data.profile.accessibilityStatement || "" });
        setLogoPreview(data.profile.logoUrl || "");
      }
    } catch (err) { setError(err.message); } finally { setLoadingProfile(false); }
  }

  function resetForm() { setFormData(emptyForm); setTasks([emptyTask]); setEditingJobId(null); }
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
      setMessage("Profile saved successfully.");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  function handleTaskChange(i, field, value) { setTasks((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t)); }
  function addTask() { setTasks((prev) => [...prev, emptyTask]); }
  function removeTask(i) { setTasks((prev) => prev.filter((_, idx) => idx !== i)); }

  function buildPayload() {
    const cleanTasks = tasks.filter((t) => t.taskName.trim()).map((t) => ({ taskName: t.taskName.trim(), description: t.description.trim(), feasibilityLevel: "not_calculated", requiredAbilities: t.requiredAbilitiesText.split(",").map((a) => a.trim()).filter(Boolean) }));
    if (!cleanTasks.length) throw new Error("Please add at least one task.");
    return { ...formData, category: formData.title, tasks: cleanTasks };
  }

  async function handleSubmit(e) {
    e.preventDefault(); setMessage(""); setError("");
    try {
      const payload = buildPayload(); setLoading(true);
      if (editingJobId) { await updateEmployerJob(editingJobId, payload); setMessage("Job updated successfully."); }
      else { await createEmployerJob(payload); setMessage("Job posted successfully."); }
      resetForm(); setActiveTab("MY_JOBS"); await fetchMyJobs();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  function handleEditJob(job) {
    setMessage(""); setError(""); setEditingJobId(job.id);
    setFormData({ title: job.title || "", companyName: job.companyName || "", location: job.location || "", jobType: job.jobType || "Full-time", workMode: job.workMode || "On-site", description: job.description || "", requirements: job.requirements || "", applicationDeadline: job.applicationDeadline || "", cvRequired: Boolean(job.cvRequired), coverLetterRequired: Boolean(job.coverLetterRequired) });
    setTasks(job.tasks?.length ? job.tasks.map((t) => ({ taskName: t.taskName || "", description: t.description || "", requiredAbilitiesText: (t.requiredAbilities || []).join(", ") })) : [emptyTask]);
    setActiveTab("POST_JOB");
  }

  async function handleDeleteJob(jobId) {
    if (!window.confirm("Delete this job?")) return;
    try { setError(""); setMessage(""); await deleteEmployerJob(jobId); setMessage("Job deleted."); await fetchMyJobs(); }
    catch (err) { setError(err.message); }
  }

  async function handleStatusChange(appId, newStatus) {
    try { setError(""); setMessage(""); await updateApplicationStatus(appId, newStatus); setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a)); }
    catch (err) { setError(err.message); }
  }

  async function handleDeleteApplication(appId) {
    if (!window.confirm("Remove this application?")) return;
    try { setError(""); setMessage(""); await deleteEmployerApplication(appId); setApplications((prev) => prev.filter((a) => a.id !== appId)); setMessage("Application removed."); setTimeout(() => setMessage(""), 3000); }
    catch (err) { setError(err.message); }
  }

  function handleViewProfile(app) {
    setSelectedProfile({ name: app.candidateName, email: app.candidateEmail, selectedDisabilities: app.candidateSelectedDisabilities || [], remainingAbilities: app.candidateRemainingAbilities || [] });
  }

  async function fetchFileBlob(appId, type) {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/employer/applications/${appId}/download/${type}`, { method: "GET", headers: { "X-Auth-Token": token } });
    if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message || "Failed to load file."); }
    return res.blob();
  }

  async function handleView(appId, type) {
    try { setError(""); const blob = await fetchFileBlob(appId, type); window.open(window.URL.createObjectURL(blob), "_blank"); }
    catch (err) { setError(err.message); }
  }

  async function handleDownload(appId, type, name) {
    try {
      setError(""); const blob = await fetchFileBlob(appId, type);
      const url = window.URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = name || `${type}-document`; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
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

  function handleLogout() {
    logout();
    window.location.href = "/signin";
  }

  const today = new Date().toISOString().split("T")[0];

  const navItems = [
    { tab: "POST_JOB", label: editingJobId ? "Edit Job" : "Post a Job", icon: <PostJobIcon /> },
    { tab: "MY_JOBS", label: "My Jobs", icon: <MyJobsIcon /> },
    { tab: "APPLICATIONS", label: "Applications", icon: <ApplicationsIcon /> },
    { tab: "PROFILE", label: "Company Profile", icon: <ProfileIcon /> },
  ];

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "9px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", fontFamily: "Inter, sans-serif", color: "#0f172a", background: "#f8fafc", transition: "border-color 0.15s, box-shadow 0.15s" };
  const textareaStyle = { ...inputStyle, minHeight: "100px", resize: "vertical", padding: "10px 12px" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: '"Inter", -apple-system, sans-serif', background: "#f8fafc", color: "#0f172a" }}>
      <style>{globalStyles}</style>

      {/* SIDEBAR */}
      <aside style={{ width: "220px", minWidth: "220px", background: "linear-gradient(180deg, #0f172a 0%, #0a1628 100%)", padding: "28px 16px", display: "flex", flexDirection: "column", boxSizing: "border-box", boxShadow: "4px 0 20px rgba(0,0,0,0.15)" }}>
        <div style={{ marginBottom: "36px", paddingLeft: "8px" }}>
          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", color: "#475569", textTransform: "uppercase", letterSpacing: "1px" }}>Platform</p>
          <h2 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "600", color: "#ffffff", letterSpacing: "-0.3px" }}>Employer Console</h2>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItems.map(({ tab, label, icon }) => {
            const isActive = activeTab === tab;
            return (
              <button key={tab} className="nav-btn"
                onClick={() => { if (tab === "POST_JOB") resetForm(); switchTab(tab); }}
                style={{ display: "flex", alignItems: "center", gap: "10px", background: isActive ? "rgba(59,130,246,0.15)" : "transparent", color: isActive ? "#60a5fa" : "#94a3b8", border: "none", textAlign: "left", padding: "10px 12px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: isActive ? "600" : "400", transition: "all 0.15s", fontFamily: "Inter, sans-serif", borderLeft: isActive ? "2px solid #3b82f6" : "2px solid transparent" }}>
                {icon}{label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px", fontWeight: "400", padding: "8px 12px", borderRadius: "8px", fontFamily: "Inter, sans-serif", width: "100%" }}>
            <LogoutIcon />Log out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "32px 36px", boxSizing: "border-box", overflowX: "hidden" }}>

        {/* HEADER */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: "400", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>Employer</p>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.4px" }}>
            {activeTab === "POST_JOB" ? (editingJobId ? "Edit Job" : "Post a Job") : activeTab === "MY_JOBS" ? "My Jobs" : activeTab === "APPLICATIONS" ? "Applications" : "Company Profile"}
          </h1>
        </div>

        {message && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "10px 14px", marginBottom: "18px", fontSize: "13px", color: "#16a34a", fontWeight: "500" }}>
            ✓ {message}
          </div>
        )}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", marginBottom: "18px", fontSize: "13px", color: "#dc2626", fontWeight: "500" }}>
            ⚠ {error}
          </div>
        )}

        {/* POST JOB */}
        {activeTab === "POST_JOB" && (
          <form onSubmit={handleSubmit}>
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "28px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)", marginBottom: "16px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Job Details</h2>
              <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#94a3b8" }}>Fields marked with * are required.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 20px" }}>
                <Field label="Job Title *">
                  <input className="input-field" style={inputStyle} name="title" value={formData.title} onChange={handleChange} required />
                </Field>
                <Field label="Company Name *">
                  <input className="input-field" style={inputStyle} name="companyName" value={formData.companyName} onChange={handleChange} required />
                </Field>
                <Field label="Location *">
                  <input className="input-field" style={inputStyle} name="location" value={formData.location} onChange={handleChange} required />
                </Field>
                <Field label="Application Deadline *">
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
                <Field label="Job Type *">
                  <select className="input-field" style={inputStyle} name="jobType" value={formData.jobType} onChange={handleChange}>
                    <option>Full-time</option><option>Part-time</option><option>Internship</option><option>Seasonal</option>
                  </select>
                </Field>
                <Field label="Work Mode *">
                  <select className="input-field" style={inputStyle} name="workMode" value={formData.workMode} onChange={handleChange}>
                    <option>On-site</option><option>Hybrid</option><option>Remote</option>
                  </select>
                </Field>
              </div>
              <Field label="Job Description *">
                <textarea className="input-field" style={textareaStyle} name="description" value={formData.description} onChange={handleChange} required />
              </Field>
              <Field label="Requirements" hint="List the physical or practical requirements">
                <textarea className="input-field" style={{ ...textareaStyle, minHeight: "80px" }} name="requirements" value={formData.requirements} onChange={handleChange} />
              </Field>
              <div style={{ display: "flex", gap: "20px", marginTop: "4px" }}>
                {[{ name: "cvRequired", label: "Application document required" }, { name: "coverLetterRequired", label: "Recommendation letter required" }].map(({ name, label }) => (
                  <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#475569", cursor: "pointer" }}>
                    <input type="checkbox" name={name} checked={formData[name]} onChange={handleChange} style={{ accentColor: "#2563eb" }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* TASKS */}
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "28px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <h2 style={{ margin: "0 0 3px", fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Job Tasks *</h2>
                  <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Add tasks the candidate may need to perform.</p>
                </div>
                <button type="button" onClick={addTask} style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                  + Add Task
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
                {tasks.map((task, i) => (
                  <div key={i} style={{ border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px", background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "#2563eb", background: "#eff6ff", padding: "3px 9px", borderRadius: "999px" }}>Task {i + 1}</span>
                      {tasks.length > 1 && (
                        <button type="button" onClick={() => removeTask(i)} style={{ border: "none", background: "#fef2f2", color: "#dc2626", padding: "4px 10px", borderRadius: "7px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>Remove</button>
                      )}
                    </div>
                    <Field label="Task Name *">
                      <input className="input-field" style={inputStyle} value={task.taskName} onChange={(e) => handleTaskChange(i, "taskName", e.target.value)} required />
                    </Field>
                    <Field label="Description">
                      <textarea className="input-field" style={{ ...textareaStyle, minHeight: "70px" }} value={task.description} onChange={(e) => handleTaskChange(i, "description", e.target.value)} />
                    </Field>
                    <Field label="Required Abilities" hint="Comma separated">
                      <input className="input-field" style={inputStyle} value={task.requiredAbilitiesText} onChange={(e) => handleTaskChange(i, "requiredAbilitiesText", e.target.value)} placeholder="Can use one hand, Can work seated" />
                    </Field>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              {editingJobId && (
                <button type="button" onClick={resetForm} style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", padding: "10px 18px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontFamily: "Inter, sans-serif" }}>
                  Cancel Edit
                </button>
              )}
              <button type="submit" disabled={loading} style={{ border: "none", background: "#2563eb", color: "#fff", padding: "10px 24px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}>
                {loading ? "Saving..." : editingJobId ? "Update Job" : "Publish Job"}
              </button>
            </div>
          </form>
        )}

        {/* MY JOBS */}
        {activeTab === "MY_JOBS" && (
          <div style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Posted Jobs</h2>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{myJobs.length} job{myJobs.length !== 1 ? "s" : ""}</span>
            </div>
            {loadingJobs && <p style={{ color: "#94a3b8", textAlign: "center", fontSize: "13px" }}>Loading...</p>}
            {!loadingJobs && myJobs.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", border: "1.5px dashed #e2e8f0", borderRadius: "14px" }}>
                <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>No jobs posted yet. Click "Post a Job" to get started.</p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {myJobs.map((job) => (
                <div key={job.id} style={{ border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px 20px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>{job.title}</h3>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {[job.companyName, job.location, job.jobType, job.workMode].filter(Boolean).map((tag) => (
                        <span key={tag} style={{ background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "400" }}>{tag}</span>
                      ))}
                      {job.applicationDeadline && (
                        <span style={{ background: "#fffbeb", color: "#d97706", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "400" }}>Deadline: {job.applicationDeadline}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button onClick={() => handleEditJob(job)} style={{ border: "none", background: "#eff6ff", color: "#2563eb", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>Edit</button>
                    <button onClick={() => handleDeleteJob(job.id)} style={{ border: "none", background: "#fef2f2", color: "#dc2626", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* APPLICATIONS */}
        {activeTab === "APPLICATIONS" && (
          <div style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>Applications</h2>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{applications.length} application{applications.length !== 1 ? "s" : ""}</span>
            </div>
            {loadingApplications && <p style={{ color: "#94a3b8", textAlign: "center", fontSize: "13px" }}>Loading...</p>}
            {!loadingApplications && applications.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", border: "1.5px dashed #e2e8f0", borderRadius: "14px" }}>
                <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>No applications yet.</p>
              </div>
            )}
            {applications.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Candidate", "Job", "Profile", "Status", "Application", "Recommendation", "Action"].map((h) => (
                        <th key={h} style={{ padding: "11px 12px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8edf5", textAlign: "center" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className="row-hover" style={{ transition: "background 0.15s" }}>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", textAlign: "center", fontWeight: "500", color: "#0f172a" }}>{app.candidateName}</td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", textAlign: "center", color: "#64748b" }}>{app.jobTitle}</td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", textAlign: "center" }}>
                          <button onClick={() => handleViewProfile(app)} style={{ border: "none", background: "#f1f5f9", color: "#475569", padding: "5px 10px", borderRadius: "7px", cursor: "pointer", fontSize: "11px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>View</button>
                        </td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          <select value={app.status} onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            style={{ padding: "5px 8px", borderRadius: "7px", border: "1px solid #e2e8f0", fontSize: "11px", background: "#f8fafc", color: "#0f172a", cursor: "pointer", outline: "none", fontFamily: "Inter, sans-serif", ...getStatusStyle(app.status) }}>
                            <option value="pending">Pending</option>
                            <option value="in_review">In Review</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          {app.hasApplicationDocument ? (
                            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                              <button onClick={() => handleView(app.id, "application")} style={{ border: "none", background: "#eff6ff", color: "#2563eb", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>View</button>
                              <button onClick={() => handleDownload(app.id, "application", app.applicationOriginalName)} style={{ border: "none", background: "#f0fdf4", color: "#16a34a", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>Download</button>
                            </div>
                          ) : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          {app.hasRecommendationLetter ? (
                            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                              <button onClick={() => handleView(app.id, "recommendation")} style={{ border: "none", background: "#eff6ff", color: "#2563eb", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>View</button>
                              <button onClick={() => handleDownload(app.id, "recommendation", app.recommendationOriginalName)} style={{ border: "none", background: "#f0fdf4", color: "#16a34a", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>Download</button>
                            </div>
                          ) : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          <button onClick={() => handleDeleteApplication(app.id)} style={{ border: "none", background: "#fef2f2", color: "#dc2626", padding: "5px 10px", borderRadius: "7px", cursor: "pointer", fontSize: "11px", fontFamily: "Inter, sans-serif" }}>Delete</button>
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
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "20px", alignItems: "start" }}>
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: "500", color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", alignSelf: "flex-start" }}>Company Logo</p>
              <div style={{ width: "160px", height: "160px", borderRadius: "16px", background: "#f8fafc", border: "1.5px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {getLogoSrc() ? (
                  <img src={getLogoSrc()} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <p style={{ color: "#94a3b8", fontSize: "12px", textAlign: "center", margin: 0 }}>No logo uploaded</p>
                )}
              </div>
              <label style={{ border: "none", background: "#2563eb", color: "#fff", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                Upload Logo
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: "none" }} onChange={handleLogoChange} />
              </label>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>PNG, JPG, WebP or GIF. Max 3MB.</p>
            </div>

            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}>
              {loadingProfile && <p style={{ color: "#94a3b8", fontSize: "13px" }}>Loading...</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 20px" }}>
                {[{ name: "companyName", label: "Company Name" }, { name: "industry", label: "Industry" }, { name: "location", label: "Location" }, { name: "website", label: "Website" }].map(({ name, label }) => (
                  <Field key={name} label={label}>
                    <input className="input-field" style={inputStyle} name={name} value={employerProfile[name]} onChange={handleProfileChange} />
                  </Field>
                ))}
              </div>
              <Field label="Company Description">
                <textarea className="input-field" style={textareaStyle} name="description" value={employerProfile.description} onChange={handleProfileChange} />
              </Field>
              <Field label="Accessibility Statement" hint="Describe how your workplace supports people with disabilities">
                <textarea className="input-field" style={textareaStyle} name="accessibilityStatement" value={employerProfile.accessibilityStatement} onChange={handleProfileChange} />
              </Field>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSaveProfile} disabled={loading} style={{ border: "none", background: "#2563eb", color: "#fff", padding: "10px 24px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}>
                  {loading ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CANDIDATE PROFILE MODAL */}
      {selectedProfile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: "20px", backdropFilter: "blur(3px)" }}>
          <div style={{ width: "100%", maxWidth: "500px", background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 20px 60px rgba(15,23,42,0.2)", position: "relative" }}>
            <button onClick={() => setSelectedProfile(null)} style={{ position: "absolute", top: "14px", right: "16px", width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#f1f5f9", color: "#64748b", fontSize: "18px", cursor: "pointer" }}>×</button>
            <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "600", color: "#0f172a" }}>Candidate Profile</h2>
            <p style={{ margin: "0 0 18px", fontSize: "13px", color: "#94a3b8" }}>Detailed candidate information</p>
            <div style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{selectedProfile.name || "Not specified"}</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{selectedProfile.email || "Not specified"}</p>
            </div>
            {[
              { title: "Selected Disabilities", items: selectedProfile.selectedDisabilities, chipStyle: { background: "#eef2ff", color: "#4338ca" }, empty: "No disabilities selected." },
              { title: "Remaining Abilities", items: selectedProfile.remainingAbilities, chipStyle: { background: "#f0fdf4", color: "#16a34a" }, empty: "No abilities available yet." },
            ].map(({ title, items, chipStyle, empty }) => (
              <div key={title} style={{ marginBottom: "14px" }}>
                <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{title}</p>
                {items.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {items.map((item) => <span key={item} style={{ ...chipStyle, padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "400" }}>{item}</span>)}
                  </div>
                ) : <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>{empty}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployerDashboard;
