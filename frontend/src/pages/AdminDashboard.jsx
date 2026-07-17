import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getToken,
  logout,
  getAdminApplications,
  getAdminApplicationFileUrl,
} from "../services/authService";
import { API_BASE_URL } from "../config";

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  .nav-btn:hover { background: rgba(255,255,255,0.07) !important; color: #ffffff !important; }
  .action-btn:hover { filter: brightness(0.93); }
  .card-stat:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,23,42,0.1) !important; }
  .row-hover:hover { background: #f8fafc !important; }
`;

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function ApplicationsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ProfilesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("USERS");
  const [_hoveredTab, setHoveredTab] = useState(null);
  const [users, setUsers] = useState([]);
  const [candidateProfiles, setCandidateProfiles] = useState([]);
  const [adminApplications, setAdminApplications] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileApplications, setShowProfileApplications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");
  const [userToEdit, setUserToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({ username: "", email: "", password: "" });
  const [editingUser, setEditingUser] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [userToArchive, setUserToArchive] = useState(null);
  const [archivingUser, setArchivingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const isArchivedView = activeTab === "ARCHIVED_USERS";
  const isUserProfilesView = activeTab === "USER_PROFILES";
  const isApplicationsView = activeTab === "APPLICATIONS";

  async function fetchUsers(tab = activeTab) {
    try {
      setLoading(true); setError("");
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const endpoint = tab === "ARCHIVED_USERS"
        ? `${API_BASE_URL}/admin/users/archived`
        : `${API_BASE_URL}/admin/users`;
      const res = await fetch(endpoint, { method: "GET", headers: { "X-Auth-Token": token } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load users.");
      setUsers(data.users || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function fetchCandidateProfiles() {
    try {
      setLoading(true); setError("");
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/admin/candidate-profiles`, { method: "GET", headers: { "X-Auth-Token": token } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load profiles.");
      setCandidateProfiles(data.profiles || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function fetchAdminApplications() {
    try {
      setLoading(true); setError("");
      const data = await getAdminApplications();
      setAdminApplications(data.applications || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  useEffect(() => {
    if (activeTab === "USER_PROFILES") { fetchCandidateProfiles(); return; }
    if (activeTab === "APPLICATIONS") { fetchAdminApplications(); return; }
    fetchUsers(activeTab);
  }, [activeTab]);

  function handleLogout() { logout(); navigate("/signin"); }
  function handleTabChange(tab) { setActiveTab(tab); setSearchTerm(""); setRoleFilter(""); setVerificationFilter(""); setError(""); setSelectedProfile(null); setShowProfileApplications(false); }

  function openEditModal(user) {
    setUserToEdit(user);
    setEditFormData({ username: user.username, email: user.email, password: "" });
    setShowPasswordField(false);
  }

  function handleEditFormChange(e) { setEditFormData({ ...editFormData, [e.target.name]: e.target.value }); }

  async function handleEditUser(e) {
    e.preventDefault();
    if (!userToEdit) return;
    try {
      setEditingUser(true); setActionLoadingId(userToEdit.id);
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/admin/users/${userToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Auth-Token": token },
        body: JSON.stringify({ username: editFormData.username, email: editFormData.email, password: showPasswordField ? editFormData.password : "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update user.");
      setUsers((prev) => prev.map((u) => u.id === userToEdit.id ? data.user : u));
      setUserToEdit(null);
      setEditFormData({ username: "", email: "", password: "" });
      setShowPasswordField(false);
      if (data.emailVerificationRequired) alert("User updated. New verification email sent.");
    } catch (err) { alert(err.message); } finally { setEditingUser(false); setActionLoadingId(null); }
  }

  async function handleArchiveUser() {
    if (!userToArchive) return;
    try {
      setArchivingUser(true); setActionLoadingId(userToArchive.id);
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/admin/users/${userToArchive.id}/archive`, { method: "PATCH", headers: { "X-Auth-Token": token } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to archive user.");
      setUsers((prev) => prev.filter((u) => u.id !== userToArchive.id));
      setUserToArchive(null);
    } catch (err) { alert(err.message); } finally { setArchivingUser(false); setActionLoadingId(null); }
  }

  async function handleRestoreUser(user) {
    try {
      setActionLoadingId(user.id);
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}/restore`, { method: "PATCH", headers: { "X-Auth-Token": token } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to restore user.");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) { alert(err.message); } finally { setActionLoadingId(null); }
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;
    try {
      setDeletingUser(true);
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/admin/users/${userToDelete.id}`, { method: "DELETE", headers: { "X-Auth-Token": token } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete user.");
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err) { alert(err.message); } finally { setDeletingUser(false); }
  }

  function getMainRole(user) {
    if (user.roles.includes("ROLE_ADMIN")) return "ADMIN";
    if (user.roles.includes("ROLE_EMPLOYER")) return "EMPLOYER";
    return "USER";
  }

  function formatRole(user) {
    const r = getMainRole(user);
    if (r === "ADMIN") return "Admin";
    if (r === "EMPLOYER") return "Employer";
    return "User";
  }

  function formatStatus(s) {
    if (!s) return "Pending";
    return s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function formatDate(d) {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-GB");
  }

  function renderApplicationFileButtons(application, type) {
    const hasFile = type === "application" ? application.hasApplicationDocument : application.hasRecommendationLetter;
    const label = type === "application" ? application.applicationOriginalName || "Application" : application.recommendationOriginalName || "Recommendation";
    if (!hasFile) return <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "#64748b", maxWidth: "100px", wordBreak: "break-word", textAlign: "center", lineHeight: "1.3" }}>{label}</span>
        <div style={{ display: "flex", gap: "4px" }}>
          <a href={getAdminApplicationFileUrl(application.id, type, false)} target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "#eff6ff", color: "#1d4ed8", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "500" }}>View</a>
          <a href={getAdminApplicationFileUrl(application.id, type, true)} target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: "#f0fdf4", color: "#16a34a", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "500" }}>Download</a>
        </div>
      </div>
    );
  }

  function getAppStatusStyle(status) {
    if (!status) return { background: "#fff7ed", color: "#c2410c" };
    const s = status.toLowerCase();
    if (s === "accepted") return { background: "#f0fdf4", color: "#16a34a" };
    if (s === "rejected") return { background: "#fef2f2", color: "#dc2626" };
    if (s === "in_review" || s === "in review") return { background: "#eff6ff", color: "#2563eb" };
    return { background: "#fff7ed", color: "#c2410c" };
  }

  function renderApplicationsTable(applications) {
    const filtered = appStatusFilter ? applications.filter((a) => (a.status || "pending").toLowerCase() === appStatusFilter.toLowerCase()) : applications;
    return (
      <div>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input type="text" placeholder="Search by candidate, job or status..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", background: "#f8fafc", fontFamily: "Inter, sans-serif", color: "#0f172a", boxSizing: "border-box" }} />
          </div>
          <select value={appStatusFilter} onChange={(e) => setAppStatusFilter(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#f8fafc", color: "#475569", cursor: "pointer", outline: "none", fontFamily: "Inter, sans-serif" }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <span style={{ fontSize: "12px", color: "#94a3b8", whiteSpace: "nowrap" }}>{filtered.length} application{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["#", "Candidate", "Job", "Status", "Application", "Recommendation", "Applied"].map((h) => (
                  <th key={h} style={{ padding: "11px 12px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8edf5", textAlign: "center" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, i) => (
                <tr key={app.id || i} className="row-hover" style={{ transition: "background 0.15s" }}>
                  <td style={{ ...S.td, color: "#94a3b8", width: "36px" }}>{i + 1}</td>
                  <td style={{ ...S.td, fontWeight: "500", color: "#0f172a" }}>{app.candidateName || "—"}</td>
                  <td style={{ ...S.td, color: "#475569" }}>{app.jobTitle || "—"}</td>
                  <td style={S.td}>
                    <span style={{ ...S.badge, ...getAppStatusStyle(app.status) }}>{formatStatus(app.status)}</span>
                  </td>
                  <td style={S.td}>{renderApplicationFileButtons(app, "application")}</td>
                  <td style={S.td}>{renderApplicationFileButtons(app, "recommendation")}</td>
                  <td style={{ ...S.td, color: "#64748b", fontSize: "12px" }}>{formatDate(app.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0, fontWeight: "400" }}>No applications found</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const verifiedUsers = users.filter((u) => u.isVerified).length;
  const unverifiedUsers = users.filter((u) => !u.isVerified).length;
  const adminUsers = users.filter((u) => u.roles.includes("ROLE_ADMIN")).length;
  const totalProfiles = candidateProfiles.length;
  const completedProfiles = candidateProfiles.filter((p) => p.selectedDisabilities.length > 0).length;
  const pendingAbilityProfiles = candidateProfiles.filter((p) => p.remainingAbilities.length === 0).length;
  const totalProfileApplications = candidateProfiles.reduce((t, p) => t + (p.applications?.length || 0), 0);

  const filteredUsers = users.filter((u) => {
    const s = searchTerm.toLowerCase().trim();
    return (u.username.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)) &&
      (roleFilter === "" || getMainRole(u) === roleFilter) &&
      (verificationFilter === "" || (verificationFilter === "VERIFIED" && u.isVerified) || (verificationFilter === "UNVERIFIED" && !u.isVerified));
  });

  const filteredProfiles = candidateProfiles.filter((p) => {
    const s = searchTerm.toLowerCase().trim();
    return p.username.toLowerCase().includes(s) || p.email.toLowerCase().includes(s);
  });

  const filteredApplications = adminApplications.filter((a) => {
    const s = searchTerm.toLowerCase().trim();
    return (a.candidateName || "").toLowerCase().includes(s) || (a.jobTitle || "").toLowerCase().includes(s) || (a.status || "").toLowerCase().includes(s);
  });

  const navItems = [
    { tab: "USERS", label: "Users", icon: <UsersIcon /> },
    { tab: "ARCHIVED_USERS", label: "Archived Users", icon: <ArchiveIcon /> },
    { tab: "APPLICATIONS", label: "Applications", icon: <ApplicationsIcon /> },
    { tab: "USER_PROFILES", label: "User Profiles", icon: <ProfilesIcon /> },
  ];

  const statsCards = isUserProfilesView ? [
    { label: "Total Profiles", value: totalProfiles, color: "#2563eb", bg: "#eff6ff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label: "Completed Profiles", value: completedProfiles, color: "#16a34a", bg: "#f0fdf4", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
    { label: "Pending Abilities", value: pendingAbilityProfiles, color: "#d97706", bg: "#fffbeb", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { label: "Total Applications", value: totalProfileApplications, color: "#7c3aed", bg: "#f5f3ff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  ] : [
    { label: isArchivedView ? "Archived Users" : "Active Users", value: totalUsers, color: "#2563eb", bg: "#eff6ff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label: "Verified Emails", value: verifiedUsers, color: "#16a34a", bg: "#f0fdf4", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
    { label: "Unverified Users", value: unverifiedUsers, color: "#d97706", bg: "#fffbeb", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { label: "Admins", value: adminUsers, color: "#7c3aed", bg: "#f5f3ff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L19 6V11C19 15.5 16.2 19.4 12 21C7.8 19.4 5 15.5 5 11V6L12 3Z"/><polyline points="9.5 12 11.3 13.8 15 10"/></svg> },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: '"Inter", -apple-system, sans-serif', background: "#f8fafc", color: "#0f172a" }}>
      <style>{globalStyles}</style>

      {/* SIDEBAR */}
      <aside style={{ width: "220px", minWidth: "220px", background: "linear-gradient(180deg, #0f172a 0%, #0a1628 100%)", padding: "28px 16px", display: "flex", flexDirection: "column", boxSizing: "border-box", boxShadow: "4px 0 20px rgba(0,0,0,0.15)" }}>
        <div style={{ marginBottom: "36px", paddingLeft: "8px" }}>
          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", color: "#475569", textTransform: "uppercase", letterSpacing: "1px" }}>Platform</p>
          <h2 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "600", color: "#ffffff", letterSpacing: "-0.3px" }}>Admin Console</h2>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItems.map(({ tab, label, icon }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                className="nav-btn"
                onClick={() => handleTabChange(tab)}
                onMouseEnter={() => setHoveredTab(tab)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                  color: isActive ? "#60a5fa" : "#94a3b8",
                  border: "none", textAlign: "left", padding: "10px 12px",
                  borderRadius: "10px", cursor: "pointer", fontSize: "13px",
                  fontWeight: isActive ? "600" : "400",
                  transition: "all 0.15s", fontFamily: "Inter, sans-serif",
                  borderLeft: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px", fontWeight: "400", padding: "8px 12px", borderRadius: "8px", fontFamily: "Inter, sans-serif", width: "100%" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "32px 36px", boxSizing: "border-box", overflowX: "hidden" }}>

        {/* HEADER */}
        <div style={{ marginBottom: "28px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: "400", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            {navItems.find((n) => n.tab === activeTab)?.label}
          </p>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.4px" }}>
            {isArchivedView ? "Archived Users" : isUserProfilesView ? "User Profiles" : isApplicationsView ? "Applications" : "Users"}
          </h1>
        </div>

        {/* STATS */}
        {!isApplicationsView && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
            {statsCards.map((card) => (
              <div key={card.label} className="card-stat" style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)", transition: "all 0.2s ease", cursor: "default", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                  {card.icon}
                </div>
                <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: "400", color: "#94a3b8" }}>{card.label}</p>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.5px" }}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* CONTENT */}
        <div style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}>

          {/* SEARCH + FILTERS */}
          {!isApplicationsView && (
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input type="text" placeholder={isUserProfilesView ? "Search profiles..." : "Search users..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#f8fafc", fontFamily: "Inter, sans-serif", color: "#0f172a" }} />
              </div>
              {!isUserProfilesView && !isArchivedView && (
                <>
                  <select value={roleFilter} onChange={(e) => e.target.value === "RESET" ? setRoleFilter("") : setRoleFilter(e.target.value)}
                    style={{ padding: "9px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#f8fafc", color: "#475569", cursor: "pointer", outline: "none", fontFamily: "Inter, sans-serif" }}>
                    <option value="" disabled hidden>Role</option>
                    <option value="RESET">All roles</option>
                    <option value="ADMIN">Admin</option>
                    <option value="USER">User</option>
                    <option value="EMPLOYER">Employer</option>
                  </select>
                  <select value={verificationFilter} onChange={(e) => e.target.value === "RESET" ? setVerificationFilter("") : setVerificationFilter(e.target.value)}
                    style={{ padding: "9px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#f8fafc", color: "#475569", cursor: "pointer", outline: "none", fontFamily: "Inter, sans-serif" }}>
                    <option value="" disabled hidden>Email status</option>
                    <option value="RESET">All statuses</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="UNVERIFIED">Unverified</option>
                  </select>
                </>
              )}
              {!isUserProfilesView && (
                <span style={{ display: "flex", alignItems: "center", fontSize: "12px", color: "#94a3b8", fontWeight: "400", whiteSpace: "nowrap" }}>
                  {isUserProfilesView ? filteredProfiles.length : filteredUsers.length} result{(isUserProfilesView ? filteredProfiles.length : filteredUsers.length) !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {isApplicationsView && (
            <div>
              {loading && <p style={S.empty}>Loading...</p>}
              {error && <p style={{ color: "#dc2626", fontSize: "13px", textAlign: "center" }}>{error}</p>}
              {!loading && !error && renderApplicationsTable(filteredApplications)}
            </div>
          )}
          {!loading && !error && !isUserProfilesView && !isApplicationsView && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["#", "Username", "Email", "Role", "Verified", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "11px 14px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8edf5", textAlign: h === "Actions" ? "center" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.id} className="row-hover" style={{ transition: "background 0.15s" }}>
                      <td style={{ ...S.td, textAlign: "left", width: "40px", color: "#94a3b8" }}>{index + 1}</td>
                      <td style={{ ...S.td, textAlign: "left", fontWeight: "500" }}>{user.username}</td>
                      <td style={{ ...S.td, textAlign: "left", color: "#64748b" }}>{user.email}</td>
                      <td style={{ ...S.td, textAlign: "left" }}>
                        <span style={{ ...S.badge, background: "#eef2ff", color: "#4338ca" }}>{formatRole(user)}</span>
                      </td>
                      <td style={{ ...S.td, textAlign: "left" }}>
                        <span style={{ ...S.badge, ...(user.isVerified ? { background: "#f0fdf4", color: "#16a34a" } : { background: "#fffbeb", color: "#d97706" }) }}>
                          {user.isVerified ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          {!isArchivedView ? (
                            <>
                              <button className="action-btn" onClick={() => openEditModal(user)} disabled={actionLoadingId === user.id} style={S.btnBlue}>Edit</button>
                              <button className="action-btn" onClick={() => setUserToArchive(user)} disabled={actionLoadingId === user.id} style={S.btnGray}>Archive</button>
                              <button className="action-btn" onClick={() => setUserToDelete(user)} style={S.btnRed}>Delete</button>
                            </>
                          ) : (
                            <>
                              <button className="action-btn" onClick={() => handleRestoreUser(user)} disabled={actionLoadingId === user.id} style={S.btnGreen}>{actionLoadingId === user.id ? "..." : "Restore"}</button>
                              <button className="action-btn" onClick={() => setUserToDelete(user)} style={S.btnRed}>Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p style={S.empty}>No users match your search.</p>}
            </div>
          )}

          {/* USER PROFILES */}
          {!loading && !error && isUserProfilesView && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
              {filteredProfiles.map((profile) => (
                <div key={profile.id} style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "16px", padding: "20px", textAlign: "center" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "#fff", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: "600" }}>
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                  <p style={{ margin: "0 0 3px", fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>{profile.username}</p>
                  <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#94a3b8", wordBreak: "break-word" }}>{profile.email}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px" }}>
                    {[
                      `${profile.selectedDisabilities.length} disabilities`,
                      profile.remainingAbilities.length > 0 ? "Abilities ready" : "Abilities pending",
                      `${profile.applications?.length || 0} applications`,
                    ].map((s) => (
                      <span key={s} style={{ background: "#ffffff", border: "1px solid #e8edf5", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: "400", color: "#475569" }}>{s}</span>
                    ))}
                  </div>
                  <button onClick={() => { setSelectedProfile(profile); setShowProfileApplications(false); }}
                    style={{ border: "none", background: "#2563eb", color: "#fff", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                    View Profile
                  </button>
                </div>
              ))}
              {filteredProfiles.length === 0 && <p style={S.empty}>No profiles found.</p>}
            </div>
          )}
        </div>
      </main>

      {/* PROFILE MODAL */}
      {selectedProfile && (
        <div style={S.overlay}>
          <div style={{ width: "100%", maxWidth: "860px", maxHeight: "88vh", background: "#ffffff", borderRadius: "20px", boxShadow: "0 20px 60px rgba(15,23,42,0.2)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "600", color: "#0f172a" }}>Candidate Profile</h2>
              <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#94a3b8" }}>Detailed candidate information</p>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px", marginBottom: "18px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px", fontWeight: "600", flexShrink: 0 }}>
                  {selectedProfile.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>{selectedProfile.username}</p>
                  <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#64748b" }}>{selectedProfile.email}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {[
                  { title: "Selected Disabilities", chips: selectedProfile.selectedDisabilities, empty: "No disabilities selected.", chipStyle: { background: "#eef2ff", color: "#4338ca" } },
                  { title: "Remaining Abilities", chips: selectedProfile.remainingAbilities, empty: "Abilities pending analysis.", chipStyle: { background: "#f0fdf4", color: "#16a34a" } },
                ].map(({ title, chips, empty, chipStyle }) => (
                  <div key={title} style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px" }}>
                    <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{title}</p>
                    {chips.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {chips.map((c) => <span key={c} style={{ ...chipStyle, padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "400" }}>{c}</span>)}
                      </div>
                    ) : <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>{empty}</p>}
                  </div>
                ))}
                <div style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Applications</p>
                  <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#64748b" }}>{selectedProfile.applications?.length || 0} application(s)</p>
                  {(selectedProfile.applications?.length || 0) > 0 && (
                    <button onClick={() => setShowProfileApplications((p) => !p)}
                      style={{ border: "none", background: "#2563eb", color: "#fff", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                      {showProfileApplications ? "Hide" : "View"} Applications
                    </button>
                  )}
                </div>
                <div style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>Last Updated</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{selectedProfile.updatedAt || "Not updated yet."}</p>
                </div>
              </div>
              {showProfileApplications && (
                <div style={{ marginTop: "16px", border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px" }}>
                  {renderApplicationsTable(selectedProfile.applications || [])}
                </div>
              )}
            </div>
            <div style={{ borderTop: "1px solid #e8edf5", padding: "14px 28px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { setSelectedProfile(null); setShowProfileApplications(false); }}
                style={{ border: "none", background: "#2563eb", color: "#fff", padding: "9px 20px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {userToEdit && (
        <div style={S.overlay}>
          <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 20px 60px rgba(15,23,42,0.18)" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "600", color: "#0f172a" }}>Edit User</h2>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b" }}>Update {userToEdit.username}&apos;s account information.</p>
            <form onSubmit={handleEditUser} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[{ label: "Username", name: "username", type: "text" }, { label: "Email", name: "email", type: "email" }].map(({ label, name, type }) => (
                <div key={name}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#475569", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</label>
                  <input type={type} name={name} value={editFormData[name]} onChange={handleEditFormChange}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "9px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
                </div>
              ))}
              <div style={{ background: "#eff6ff", borderRadius: "9px", padding: "10px 12px", fontSize: "12px", color: "#1d4ed8" }}>
                If the email changes, a new verification email will be sent.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button type="button" onClick={() => { setShowPasswordField((p) => !p); setEditFormData((d) => ({ ...d, password: "" })); }}
                  style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", padding: "9px 14px", borderRadius: "9px", cursor: "pointer", fontSize: "12px", fontFamily: "Inter, sans-serif", alignSelf: "flex-start" }}>
                  {showPasswordField ? "Cancel password change" : "Change password"}
                </button>
                {showPasswordField && (
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#475569", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px" }}>New Password</label>
                    <input type="password" name="password" value={editFormData.password} onChange={handleEditFormChange}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "9px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "6px" }}>
                <button type="button" onClick={() => { setUserToEdit(null); setShowPasswordField(false); }} disabled={editingUser}
                  style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontFamily: "Inter, sans-serif" }}>Cancel</button>
                <button type="submit" disabled={editingUser}
                  style={{ border: "none", background: "#2563eb", color: "#fff", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                  {editingUser ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE MODAL */}
      {userToArchive && (
        <div style={S.overlay}>
          <div style={{ width: "100%", maxWidth: "400px", background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 20px 60px rgba(15,23,42,0.18)", textAlign: "center" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <ArchiveIcon />
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: "600", color: "#0f172a" }}>Archive user?</h2>
            <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#64748b" }}>You are about to archive <strong>{userToArchive.username}</strong>.</p>
            <p style={{ margin: "0 0 22px", fontSize: "12px", color: "#d97706" }}>This user will be moved to Archived Users.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setUserToArchive(null)} disabled={archivingUser}
                style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontFamily: "Inter, sans-serif" }}>Cancel</button>
              <button onClick={handleArchiveUser} disabled={archivingUser}
                style={{ border: "none", background: "#d97706", color: "#fff", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                {archivingUser ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {userToDelete && (
        <div style={S.overlay}>
          <div style={{ width: "100%", maxWidth: "400px", background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 20px 60px rgba(15,23,42,0.18)", textAlign: "center" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: "18px", fontWeight: "600" }}>!</div>
            <h2 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: "600", color: "#0f172a" }}>Delete user?</h2>
            <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#64748b" }}>You are about to permanently delete <strong>{userToDelete.username}</strong>.</p>
            <p style={{ margin: "0 0 22px", fontSize: "12px", color: "#dc2626" }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setUserToDelete(null)} disabled={deletingUser}
                style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontFamily: "Inter, sans-serif" }}>Cancel</button>
              <button onClick={handleDeleteUser} disabled={deletingUser}
                style={{ border: "none", background: "#dc2626", color: "#fff", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                {deletingUser ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  td: { padding: "14px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "13px", verticalAlign: "middle", textAlign: "center", color: "#374151" },
  badge: { padding: "4px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", whiteSpace: "nowrap", display: "inline-block" },
  empty: { color: "#94a3b8", textAlign: "center", padding: "32px", fontSize: "13px", fontWeight: "400" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(3px)" },
  btnBlue: { border: "none", background: "#eff6ff", color: "#2563eb", padding: "6px 12px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif", transition: "filter 0.15s" },
  btnGray: { border: "none", background: "#f1f5f9", color: "#475569", padding: "6px 12px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif", transition: "filter 0.15s" },
  btnRed: { border: "none", background: "#fef2f2", color: "#dc2626", padding: "6px 12px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif", transition: "filter 0.15s" },
  btnGreen: { border: "none", background: "#f0fdf4", color: "#16a34a", padding: "6px 12px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif", transition: "filter 0.15s" },
};

export default AdminDashboard;
