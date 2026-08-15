import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getAdminApplications,
  openAdminApplicationFile,
} from "../services/adminApi";
import { getToken, logout } from "../services/authService";
import { API_BASE_URL } from "../config";
import useDialogFocus from "../hooks/useDialogFocus";
import AccessibleNotice from "../components/accessibility/AccessibleNotice";
import { disabilityOptions } from "../features/candidate/profile/profileOptions";

const globalStyles = `
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

function findAdminItem(items, spokenValue, labels) {
  if (!items?.length) return null;
  const value = String(spokenValue || "").trim().toLowerCase();
  const ordinal = { first: 0, "1": 0, "1st": 0, second: 1, "2": 1, "2nd": 1, third: 2, "3": 2, "3rd": 2 }[value];
  if (ordinal !== undefined) return items[ordinal] || null;
  return items.find((item) => labels(item).some((label) => {
    const normalized = String(label || "").toLowerCase();
    return normalized && (normalized === value || normalized.includes(value) || value.includes(normalized));
  })) || null;
}

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
  const location = useLocation();
  const { t, i18n } = useTranslation("dashboards");

  const [activeTab, setActiveTab] = useState("USERS");
  const [_hoveredTab, setHoveredTab] = useState(null);
  const [users, setUsers] = useState([]);
  const [candidateProfiles, setCandidateProfiles] = useState([]);
  const [adminApplications, setAdminApplications] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileApplications, setShowProfileApplications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
  const [catalogueImporting, setCatalogueImporting] = useState(false);
  const [catalogueImportResult, setCatalogueImportResult] = useState(null);
  const catalogueInputRef = useRef(null);
  const messageRef = useRef(null);
  const errorRef = useRef(null);
  const voiceActionHandlerRef = useRef(null);
  const anyDialogOpen = Boolean(selectedProfile || userToEdit || userToArchive || userToDelete);
  const closeActiveDialog = () => {
    setSelectedProfile(null);
    setShowProfileApplications(false);
    setUserToEdit(null);
    setUserToArchive(null);
    setUserToDelete(null);
    setShowPasswordField(false);
  };
  const adminDialogRef = useDialogFocus(anyDialogOpen, closeActiveDialog);

  const isArchivedView = activeTab === "ARCHIVED_USERS";
  const isUserProfilesView = activeTab === "USER_PROFILES";
  const isApplicationsView = activeTab === "APPLICATIONS";

  const fetchUsers = useCallback(async (tab) => {
    try {
      setLoading(true); setError("");
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const endpoint = tab === "ARCHIVED_USERS"
        ? `${API_BASE_URL}/admin/users/archived`
        : `${API_BASE_URL}/admin/users`;
      const res = await fetch(endpoint, { method: "GET", headers: { "X-Auth-Token": token } });
      const data = await res.json();
      if (!res.ok) throw new Error("load");
      setUsers(data.users || []);
    } catch { setError(t("admin.errors.users")); } finally { setLoading(false); }
  }, [navigate, t]);

  const fetchCandidateProfiles = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/admin/candidate-profiles`, { method: "GET", headers: { "X-Auth-Token": token } });
      const data = await res.json();
      if (!res.ok) throw new Error("load");
      setCandidateProfiles(data.profiles || []);
    } catch { setError(t("admin.errors.profiles")); } finally { setLoading(false); }
  }, [navigate, t]);

  const fetchAdminApplications = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const data = await getAdminApplications();
      setAdminApplications(data.applications || []);
    } catch { setError(t("admin.errors.applications")); } finally { setLoading(false); }
  }, [t]);

  useEffect(() => {
    const requestedTab = location.state?.voiceTab;
    if (!["USERS", "ARCHIVED_USERS", "APPLICATIONS", "USER_PROFILES"].includes(requestedTab)) return;
    handleTabChange(requestedTab);
  }, [location.state?.voiceNavigationTurn, location.state?.voiceTab]);

  useEffect(() => {
    if (activeTab === "USER_PROFILES") { fetchCandidateProfiles(); return; }
    if (activeTab === "APPLICATIONS") { fetchAdminApplications(); return; }
    fetchUsers(activeTab);
  }, [activeTab, fetchAdminApplications, fetchCandidateProfiles, fetchUsers]);

  function handleLogout() { logout(); navigate("/signin"); }
  function handleTabChange(tab) { setActiveTab(tab); setSearchTerm(""); setRoleFilter(""); setVerificationFilter(""); setError(""); setMessage(""); setSelectedProfile(null); setShowProfileApplications(false); }

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
      if (!res.ok) throw new Error("update");
      setUsers((prev) => prev.map((u) => u.id === userToEdit.id ? data.user : u));
      setUserToEdit(null);
      setEditFormData({ username: "", email: "", password: "" });
      setShowPasswordField(false);
      setMessage(data.emailVerificationRequired ? t("admin.messages.updatedVerification") : t("admin.messages.updated"));
    } catch { setError(t("admin.errors.update")); } finally { setEditingUser(false); setActionLoadingId(null); }
  }

  async function handleArchiveUser(userOverride = null) {
    const targetUser = userOverride?.id ? userOverride : userToArchive;
    if (!targetUser) return;
    try {
      setArchivingUser(true); setActionLoadingId(targetUser.id);
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/admin/users/${targetUser.id}/archive`, { method: "PATCH", headers: { "X-Auth-Token": token } });
      if (!res.ok) throw new Error("archive");
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setUserToArchive(null);
      setMessage(t("admin.messages.archived", { name: targetUser.username }));
    } catch { setError(t("admin.errors.archive")); } finally { setArchivingUser(false); setActionLoadingId(null); }
  }

  async function handleRestoreUser(user) {
    try {
      setActionLoadingId(user.id);
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}/restore`, { method: "PATCH", headers: { "X-Auth-Token": token } });
      if (!res.ok) throw new Error("restore");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setMessage(t("admin.messages.restored", { name: user.username }));
    } catch { setError(t("admin.errors.restore")); } finally { setActionLoadingId(null); }
  }

  async function handleDeleteUser(userOverride = null) {
    const targetUser = userOverride?.id ? userOverride : userToDelete;
    if (!targetUser) return;
    try {
      setDeletingUser(true);
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const res = await fetch(`${API_BASE_URL}/admin/users/${targetUser.id}`, { method: "DELETE", headers: { "X-Auth-Token": token } });
      if (!res.ok) throw new Error("delete");
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setUserToDelete(null);
      setMessage(t("admin.messages.deleted", { name: targetUser.username }));
    } catch { setError(t("admin.errors.delete")); } finally { setDeletingUser(false); }
  }

  function getMainRole(user) {
    if (user.roles.includes("ROLE_ADMIN")) return "ADMIN";
    if (user.roles.includes("ROLE_EMPLOYER")) return "EMPLOYER";
    return "USER";
  }

  function formatRole(user) {
    const r = getMainRole(user);
    return t(`admin.roles.${r.toLowerCase()}`);
  }

  function formatStatus(s) {
    return t(`admin.statuses.${String(s || "pending").toLowerCase().replace(" ", "_")}`, { defaultValue: s || t("admin.statuses.pending") });
  }

  function formatDate(d) {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return new Intl.DateTimeFormat(i18n.resolvedLanguage).format(date);
  }

  function formatDisability(value) {
    const option = disabilityOptions.find((item) => item.name === value);
    return option ? t(`profile:disabilities.${option.key}`) : value;
  }

  function formatEducation(value) {
    return value ? t(`profile:education.${value}`, { defaultValue: value.replaceAll("_", " ") }) : "";
  }

  async function handleCatalogueImport(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    try {
      setCatalogueImporting(true);
      setCatalogueImportResult(null);
      const token = getToken();
      if (!token) { navigate("/signin"); return; }
      const body = new FormData();
      files.forEach((file) => body.append("workbooks[]", file));
      const response = await fetch(`${API_BASE_URL}/admin/job-catalogue/import`, {
        method: "POST",
        headers: { "X-Auth-Token": token },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error("import");
      setCatalogueImportResult({ type: "success", message: t("admin.catalogue.complete"), summary: data.summary });
    } catch {
      setCatalogueImportResult({ type: "error", message: t("admin.catalogue.failed") });
    } finally {
      setCatalogueImporting(false);
    }
  }

  voiceActionHandlerRef.current = (event) => {
      const action = event.detail.action;
      if (!action) return;
      const respond = (feedback) => {
        event.detail.handled = true;
        event.detail.feedback = feedback;
      };
      const findUser = () => findAdminItem(users, action.value, (user) => [user.username, user.email]);
      const findProfile = () => findAdminItem(candidateProfiles, action.value, (profile) => [profile.username, profile.email]);
      const visibleApplications = selectedProfile && showProfileApplications
        ? selectedProfile.applications || []
        : adminApplications;
      const findApplication = () => findAdminItem(visibleApplications, action.value, (app) => [app.candidateName, app.candidateEmail, app.jobTitle]);

      if (action.type === "set_field" || action.type === "clear_field") {
        const value = action.type === "clear_field" ? "" : action.value;
        if (action.target === "admin_search") setSearchTerm(value);
        else if (action.target === "edit_username" && userToEdit) setEditFormData((current) => ({ ...current, username: value }));
        else if (action.target === "edit_email" && userToEdit) setEditFormData((current) => ({ ...current, email: value }));
        else if (action.target === "edit_password" && userToEdit) {
          setShowPasswordField(true);
          setEditFormData((current) => ({ ...current, password: value }));
        } else return;
        respond(action.sensitive ? t("admin.voice.sensitive", { label: action.label }) : t("admin.voice.fieldSet", { label: action.label, value }));
      } else if (action.type === "select_option") {
        const value = action.value === "all" ? "" : action.value;
        if (action.target === "role_filter") setRoleFilter(value);
        else if (action.target === "verification_filter") setVerificationFilter(value);
        else if (action.target === "admin_application_status") setAppStatusFilter(value);
        else return;
        respond(t("admin.voice.selected", { label: action.label, value: action.value.replaceAll("_", " ") }));
      } else if (action.type === "open_item") {
        if (["edit_user", "archive_user", "restore_user", "delete_user"].includes(action.target)) {
          const user = findUser();
          if (!user) { respond(t("admin.voice.userNotFound", { value: action.value })); return; }
          if (action.target === "edit_user") openEditModal(user);
          if (action.target === "archive_user") handleArchiveUser(user);
          if (action.target === "restore_user") handleRestoreUser(user);
          if (action.target === "delete_user") handleDeleteUser(user);
          respond(t("admin.voice.activatedFor", { label: action.label, name: user.username }));
        } else if (action.target === "candidate_profile") {
          const profile = findProfile();
          if (!profile) { respond(t("admin.voice.profileNotFound", { value: action.value })); return; }
          setSelectedProfile(profile); setShowProfileApplications(false);
          respond(t("admin.voice.openingProfile", { name: profile.username }));
        } else if (["view_admin_application_document", "download_admin_application_document", "view_admin_recommendation", "download_admin_recommendation"].includes(action.target)) {
          const app = findApplication();
          if (!app) { respond(t("admin.voice.applicationNotFound", { value: action.value })); return; }
          const recommendation = action.target.includes("recommendation");
          const download = action.target.includes("download");
          openAdminApplicationFile(app.id, recommendation ? "recommendation" : "application", download)
            .then(() => respond(t("admin.voice.openingFor", { label: action.label, name: app.candidateName || app.jobTitle })))
            .catch(() => setError(t("admin.errors.document")));
        } else return;
      } else if (action.type === "focus_field" && action.target === "catalogue_workbooks") {
        catalogueInputRef.current?.click();
        respond(t("admin.voice.workbookPicker"));
      } else if (action.type === "press") {
        if (action.target === "toggle_password" && userToEdit) {
          setShowPasswordField((current) => !current);
          setEditFormData((current) => ({ ...current, password: "" }));
        } else if (action.target === "save_user" && userToEdit) handleEditUser({ preventDefault() {} });
        else if (action.target === "close_modal") {
          setUserToEdit(null); setUserToArchive(null); setUserToDelete(null);
          setSelectedProfile(null); setShowProfileApplications(false); setShowPasswordField(false);
        } else if (action.target === "toggle_profile_applications" && selectedProfile) {
          setShowProfileApplications((current) => !current);
        } else if (action.target === "logout") handleLogout();
        else return;
        respond(t("admin.voice.activated", { label: action.label }));
      }
  };

  useEffect(() => {
    function handleVoiceAction(event) {
      voiceActionHandlerRef.current?.(event);
    }
    window.addEventListener("join:voice-action", handleVoiceAction);
    return () => window.removeEventListener("join:voice-action", handleVoiceAction);
  }, []);

  function renderApplicationFileButtons(application, type) {
    const hasFile = type === "application" ? application.hasApplicationDocument : application.hasRecommendationLetter;
    const typeLabel = t(`admin.applications.fileTypes.${type}`);
    const label = type === "application" ? application.applicationOriginalName || typeLabel : application.recommendationOriginalName || typeLabel;
    if (!hasFile) return <span aria-label={t("admin.applications.noDocument", { type: typeLabel })} style={{ color: "#64748b", fontSize: "12px" }}>—</span>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "#64748b", maxWidth: "100px", wordBreak: "break-word", textAlign: "center", lineHeight: "1.3" }}>{label}</span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button type="button" aria-label={t("admin.applications.viewFor", { type: typeLabel, name: application.candidateName || t("admin.applications.candidate") })} onClick={() => openAdminApplicationFile(application.id, type, false).catch(() => setError(t("admin.errors.document")))} style={{ border: 0, background: "#eff6ff", color: "#1d4ed8", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", cursor: "pointer" }}>{t("admin.actions.view")}</button>
          <button type="button" aria-label={t("admin.applications.downloadFor", { type: typeLabel, name: application.candidateName || t("admin.applications.candidate") })} onClick={() => openAdminApplicationFile(application.id, type, true).catch(() => setError(t("admin.errors.document")))} style={{ border: 0, background: "#f0fdf4", color: "#166534", padding: "3px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: "500", cursor: "pointer" }}>{t("admin.actions.download")}</button>
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
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", insetInlineStart: "12px", top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input aria-label={t("admin.applications.searchLabel")} type="search" placeholder={t("admin.applications.searchPlaceholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} dir="auto"
              style={{ width: "100%", paddingBlock: "9px", paddingInline: "34px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", background: "#f8fafc", fontFamily: "Inter, sans-serif", color: "#0f172a", boxSizing: "border-box" }} />
          </div>
          <select aria-label={t("admin.applications.filterLabel")} value={appStatusFilter} onChange={(e) => setAppStatusFilter(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#f8fafc", color: "#475569", cursor: "pointer", outline: "none", fontFamily: "Inter, sans-serif" }}>
            <option value="">{t("admin.filters.allStatuses")}</option>
            <option value="pending">{t("admin.statuses.pending")}</option>
            <option value="in_review">{t("admin.statuses.in_review")}</option>
            <option value="accepted">{t("admin.statuses.accepted")}</option>
            <option value="rejected">{t("admin.statuses.rejected")}</option>
          </select>
          <span style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>{t("admin.applications.count", { count: filtered.length })}</span>
        </div>
        <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label={t("admin.applications.tableLabel")}>
          <table className="dashboard-table dashboard-table--applications" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["#", t("admin.applications.candidate"), t("admin.applications.job"), t("admin.applications.status"), t("admin.applications.application"), t("admin.applications.recommendation"), t("admin.applications.applied")].map((h) => (
                  <th key={h} style={{ padding: "11px 12px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8edf5", textAlign: "center" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, i) => (
                <tr key={app.id || i} className="row-hover" style={{ transition: "background 0.15s" }}>
                  <td style={{ ...S.td, color: "#64748b", width: "36px" }}>{i + 1}</td>
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
              <p style={{ color: "#64748b", fontSize: "13px", margin: 0, fontWeight: "400" }}>{t("admin.applications.empty")}</p>
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
  const pendingEducationProfiles = candidateProfiles.filter((p) => !p.educationLevel).length;
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
    { tab: "USERS", label: t("admin.tabs.users"), icon: <UsersIcon /> },
    { tab: "ARCHIVED_USERS", label: t("admin.tabs.archived"), icon: <ArchiveIcon /> },
    { tab: "APPLICATIONS", label: t("admin.tabs.applications"), icon: <ApplicationsIcon /> },
    { tab: "USER_PROFILES", label: t("admin.tabs.profiles"), icon: <ProfilesIcon /> },
  ];

  const statsCards = isUserProfilesView ? [
    { label: "Total Profiles", value: totalProfiles, color: "#2563eb", bg: "#eff6ff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label: "Completed Profiles", value: completedProfiles, color: "#16a34a", bg: "#f0fdf4", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
    { label: "Pending Education", value: pendingEducationProfiles, color: "#d97706", bg: "#fffbeb", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { label: "Total Applications", value: totalProfileApplications, color: "#7c3aed", bg: "#f5f3ff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  ] : [
    { label: isArchivedView ? "Archived Users" : "Active Users", value: totalUsers, color: "#2563eb", bg: "#eff6ff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label: "Verified Emails", value: verifiedUsers, color: "#16a34a", bg: "#f0fdf4", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
    { label: "Unverified Users", value: unverifiedUsers, color: "#d97706", bg: "#fffbeb", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { label: "Admins", value: adminUsers, color: "#7c3aed", bg: "#f5f3ff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L19 6V11C19 15.5 16.2 19.4 12 21C7.8 19.4 5 15.5 5 11V6L12 3Z"/><polyline points="9.5 12 11.3 13.8 15 10"/></svg> },
  ];

  const statTranslationKeys = {
    "Total Profiles": "admin.stats.totalProfiles",
    "Completed Profiles": "admin.stats.completedProfiles",
    "Pending Education": "admin.stats.pendingEducation",
    "Total Applications": "admin.stats.totalApplications",
    "Archived Users": "admin.stats.archivedUsers",
    "Active Users": "admin.stats.activeUsers",
    "Verified Emails": "admin.stats.verifiedEmails",
    "Unverified Users": "admin.stats.unverifiedUsers",
    Admins: "admin.stats.admins",
  };

  return (
    <div className="dashboard-screen dashboard-screen--admin" style={{ minHeight: "100vh", display: "flex", fontFamily: '"Inter", -apple-system, sans-serif', background: "#f8fafc", color: "#0f172a" }} data-voice-section="admin-dashboard" data-voice-view={activeTab}>
      <style>{globalStyles}</style>

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar" style={{ width: "220px", minWidth: "220px", background: "linear-gradient(180deg, #0f172a 0%, #0a1628 100%)", padding: "28px 16px", display: "flex", flexDirection: "column", boxSizing: "border-box", boxShadow: "4px 0 20px rgba(0,0,0,0.15)" }}>
        <div style={{ marginBottom: "36px", paddingInlineStart: "8px" }}>
          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>{t("admin.platform")}</p>
          <h2 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "600", color: "#ffffff", letterSpacing: "-0.3px" }}>{t("admin.console")}</h2>
        </div>

        <nav aria-label={t("admin.tabsLabel")} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItems.map(({ tab, label, icon }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                className="nav-btn"
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleTabChange(tab)}
                onMouseEnter={() => setHoveredTab(tab)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                  color: isActive ? "#60a5fa" : "#94a3b8",
                  border: "none", textAlign: "start", padding: "10px 12px",
                  borderRadius: "10px", cursor: "pointer", fontSize: "13px",
                  fontWeight: isActive ? "600" : "400",
                  transition: "all 0.15s", fontFamily: "Inter, sans-serif",
                  borderInlineStart: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button type="button" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "13px", fontWeight: "400", padding: "8px 12px", borderRadius: "8px", fontFamily: "Inter, sans-serif", width: "100%" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t("common.signOut")}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="dashboard-main" style={{ flex: 1, padding: "32px 36px", boxSizing: "border-box", overflowX: "hidden" }} aria-busy={loading || catalogueImporting}>

        {/* HEADER */}
        <div className="dashboard-page-header" style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
          <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: "400", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            {navItems.find((n) => n.tab === activeTab)?.label}
          </p>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.4px" }}>
            {navItems.find((item) => item.tab === activeTab)?.label}
          </h1>
          </div>
          <div>
            <input
              ref={catalogueInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              onChange={handleCatalogueImport}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => catalogueInputRef.current?.click()}
              disabled={catalogueImporting}
              style={{ border: "none", borderRadius: "10px", background: catalogueImporting ? "#64748b" : "#2563eb", color: "white", padding: "10px 16px", fontSize: "13px", fontWeight: 600, cursor: catalogueImporting ? "wait" : "pointer" }}
            >
              {catalogueImporting ? t("admin.catalogue.importing") : t("admin.catalogue.add")}
            </button>
          </div>
        </div>

        <AccessibleNotice noticeRef={messageRef} tone="success" message={message} />
        <AccessibleNotice noticeRef={errorRef} tone="error" message={error} />

        {catalogueImportResult && (
          <div
            role={catalogueImportResult.type === "error" ? "alert" : "status"}
            style={{
              margin: "-12px 0 20px",
              padding: "12px 14px",
              borderRadius: "10px",
              border: `1px solid ${catalogueImportResult.type === "error" ? "#fecaca" : "#bbf7d0"}`,
              background: catalogueImportResult.type === "error" ? "#fef2f2" : "#f0fdf4",
              color: catalogueImportResult.type === "error" ? "#b91c1c" : "#166534",
              fontSize: "13px",
            }}
          >
            <strong>{catalogueImportResult.type === "error" ? t("admin.catalogue.failedPrefix") : t("admin.catalogue.completePrefix")}</strong>
            {catalogueImportResult.message}
            {catalogueImportResult.summary?.warnings?.length > 0 && (
              <details style={{ marginTop: "8px" }}>
                <summary>{t("admin.catalogue.warningCount", { count: catalogueImportResult.summary.warnings.length })}</summary>
                <ul>{catalogueImportResult.summary.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              </details>
            )}
          </div>
        )}

        {/* STATS */}
        {!isApplicationsView && (
          <div className="dashboard-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
            {statsCards.map((card) => (
              <div key={card.label} className="card-stat" style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)", transition: "all 0.2s ease", cursor: "default", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                  {card.icon}
                </div>
                <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: "400", color: "#64748b" }}>{t(statTranslationKeys[card.label])}</p>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.5px" }}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* CONTENT */}
        <div className="dashboard-content-card" style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e8edf5", boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}>

          {/* SEARCH + FILTERS */}
          {!isApplicationsView && (
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", insetInlineStart: "12px", top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input aria-label={isUserProfilesView ? t("admin.search.profilesLabel") : t("admin.search.usersLabel")} type="search" placeholder={isUserProfilesView ? t("admin.search.profilesPlaceholder") : t("admin.search.usersPlaceholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} dir="auto"
                  style={{ width: "100%", paddingBlock: "9px", paddingInline: "34px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#f8fafc", fontFamily: "Inter, sans-serif", color: "#0f172a" }} />
              </div>
              {!isUserProfilesView && !isArchivedView && (
                <>
                  <select aria-label={t("admin.filters.roleLabel")} value={roleFilter} onChange={(e) => e.target.value === "RESET" ? setRoleFilter("") : setRoleFilter(e.target.value)}
                    style={{ padding: "9px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#f8fafc", color: "#475569", cursor: "pointer", outline: "none", fontFamily: "Inter, sans-serif" }}>
                    <option value="" disabled hidden>{t("admin.filters.role")}</option>
                    <option value="RESET">{t("admin.filters.allRoles")}</option>
                    <option value="ADMIN">{t("admin.roles.admin")}</option>
                    <option value="USER">{t("admin.roles.user")}</option>
                    <option value="EMPLOYER">{t("admin.roles.employer")}</option>
                  </select>
                  <select aria-label={t("admin.filters.verificationLabel")} value={verificationFilter} onChange={(e) => e.target.value === "RESET" ? setVerificationFilter("") : setVerificationFilter(e.target.value)}
                    style={{ padding: "9px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", background: "#f8fafc", color: "#475569", cursor: "pointer", outline: "none", fontFamily: "Inter, sans-serif" }}>
                    <option value="" disabled hidden>{t("admin.filters.emailStatus")}</option>
                    <option value="RESET">{t("admin.filters.allStatuses")}</option>
                    <option value="VERIFIED">{t("admin.verification.verified")}</option>
                    <option value="UNVERIFIED">{t("admin.verification.unverified")}</option>
                  </select>
                </>
              )}
              {!isUserProfilesView && (
                <span style={{ display: "flex", alignItems: "center", fontSize: "12px", color: "#64748b", fontWeight: "400", whiteSpace: "nowrap" }}>
                  {t("admin.search.results", { count: isUserProfilesView ? filteredProfiles.length : filteredUsers.length })}
                </span>
              )}
            </div>
          )}

          {isApplicationsView && (
            <div>
              {loading && <p style={S.empty}>{t("admin.loading")}</p>}
              {error && <p style={{ color: "#dc2626", fontSize: "13px", textAlign: "center" }}>{error}</p>}
              {!loading && !error && renderApplicationsTable(filteredApplications)}
            </div>
          )}
          {!loading && !error && !isUserProfilesView && !isApplicationsView && (
            <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label={isArchivedView ? t("admin.users.archivedTable") : t("admin.users.table")}>
              <table className="dashboard-table dashboard-table--users" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["#", t("admin.users.username"), t("admin.users.email"), t("admin.users.role"), t("admin.users.verified"), t("admin.users.actions")].map((h) => (
                      <th key={h} style={{ padding: "11px 14px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e8edf5", textAlign: h === t("admin.users.actions") ? "center" : "start" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.id} className="row-hover" style={{ transition: "background 0.15s" }}>
                      <td style={{ ...S.td, textAlign: "left", width: "40px", color: "#64748b" }}>{index + 1}</td>
                      <td style={{ ...S.td, textAlign: "left", fontWeight: "500" }}>{user.username}</td>
                      <td style={{ ...S.td, textAlign: "left", color: "#64748b" }}>{user.email}</td>
                      <td style={{ ...S.td, textAlign: "left" }}>
                        <span style={{ ...S.badge, background: "#eef2ff", color: "#4338ca" }}>{formatRole(user)}</span>
                      </td>
                      <td style={{ ...S.td, textAlign: "left" }}>
                        <span style={{ ...S.badge, ...(user.isVerified ? { background: "#f0fdf4", color: "#16a34a" } : { background: "#fffbeb", color: "#d97706" }) }}>
                          {user.isVerified ? t("admin.verification.verified") : t("admin.verification.unverified")}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          {!isArchivedView ? (
                            <>
                              <button type="button" className="action-btn" aria-label={t("admin.actions.editFor", { name: user.username })} onClick={() => openEditModal(user)} disabled={actionLoadingId === user.id} style={S.btnBlue}>{t("admin.actions.edit")}</button>
                              <button type="button" className="action-btn" aria-label={t("admin.actions.archiveFor", { name: user.username })} onClick={() => setUserToArchive(user)} disabled={actionLoadingId === user.id} style={S.btnGray}>{t("admin.actions.archive")}</button>
                              <button type="button" className="action-btn" aria-label={t("admin.actions.deleteFor", { name: user.username })} onClick={() => setUserToDelete(user)} style={S.btnRed}>{t("admin.actions.delete")}</button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="action-btn" aria-label={t("admin.actions.restoreFor", { name: user.username })} onClick={() => handleRestoreUser(user)} disabled={actionLoadingId === user.id} style={S.btnGreen}>{actionLoadingId === user.id ? "…" : t("admin.actions.restore")}</button>
                              <button type="button" className="action-btn" aria-label={t("admin.actions.deleteFor", { name: user.username })} onClick={() => setUserToDelete(user)} style={S.btnRed}>{t("admin.actions.delete")}</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p style={S.empty}>{t("admin.users.empty")}</p>}
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
                  <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#64748b", wordBreak: "break-word" }}>{profile.email}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px" }}>
                    {[
                      t("admin.profiles.disabilityCount", { count: profile.selectedDisabilities.length }),
                      profile.educationLevel ? t("admin.profiles.education", { value: formatEducation(profile.educationLevel) }) : t("admin.profiles.educationPending"),
                      t("admin.profiles.applicationCount", { count: profile.applications?.length || 0 }),
                    ].map((s) => (
                      <span key={s} style={{ background: "#ffffff", border: "1px solid #e8edf5", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: "400", color: "#475569" }}>{s}</span>
                    ))}
                  </div>
                  <button onClick={() => { setSelectedProfile(profile); setShowProfileApplications(false); }}
                    style={{ border: "none", background: "#2563eb", color: "#fff", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                    {t("admin.profiles.view")}
                  </button>
                </div>
              ))}
              {filteredProfiles.length === 0 && <p style={S.empty}>{t("admin.profiles.empty")}</p>}
            </div>
          )}
        </div>
      </main>

      {/* PROFILE MODAL */}
      {selectedProfile && (
        <div style={S.overlay}>
          <div ref={adminDialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-profile-dialog-title" tabIndex={-1} style={{ width: "100%", maxWidth: "860px", maxHeight: "88vh", background: "#ffffff", borderRadius: "20px", boxShadow: "0 20px 60px rgba(15,23,42,0.2)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
              <h2 id="admin-profile-dialog-title" style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "600", color: "#0f172a" }}>{t("admin.profileDialog.title")}</h2>
              <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b" }}>{t("admin.profileDialog.description")}</p>
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
                  { title: t("admin.profileDialog.disabilities"), chips: selectedProfile.selectedDisabilities.map(formatDisability), empty: t("admin.profileDialog.noDisabilities"), chipStyle: { background: "#eef2ff", color: "#4338ca" } },
                  { title: t("admin.profileDialog.education"), chips: selectedProfile.educationLevel ? [formatEducation(selectedProfile.educationLevel)] : [], empty: t("admin.profileDialog.noEducation"), chipStyle: { background: "#f0fdf4", color: "#166534" } },
                ].map(({ title, chips, empty, chipStyle }) => (
                  <div key={title} style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px" }}>
                    <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{title}</p>
                    {chips.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {chips.map((c) => <span key={c} style={{ ...chipStyle, padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "400" }}>{c}</span>)}
                      </div>
                    ) : <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{empty}</p>}
                  </div>
                ))}
                <div style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{t("admin.tabs.applications")}</p>
                  <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#64748b" }}>{t("admin.profiles.applicationCount", { count: selectedProfile.applications?.length || 0 })}</p>
                  {(selectedProfile.applications?.length || 0) > 0 && (
                    <button onClick={() => setShowProfileApplications((p) => !p)}
                      style={{ border: "none", background: "#2563eb", color: "#fff", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                      {showProfileApplications ? t("admin.actions.hideApplications") : t("admin.actions.viewApplications")}
                    </button>
                  )}
                </div>
                <div style={{ background: "#f8fafc", border: "1px solid #e8edf5", borderRadius: "14px", padding: "16px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{t("admin.profileDialog.lastUpdated")}</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{selectedProfile.updatedAt ? formatDate(selectedProfile.updatedAt) : t("admin.profileDialog.notUpdated")}</p>
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
                {t("admin.actions.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {userToEdit && (
        <div style={S.overlay}>
          <div ref={adminDialogRef} role="dialog" aria-modal="true" aria-labelledby="edit-user-dialog-title" tabIndex={-1} style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 20px 60px rgba(15,23,42,0.18)" }}>
            <h2 id="edit-user-dialog-title" style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "600", color: "#0f172a" }}>{t("admin.edit.title")}</h2>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b" }}>{t("admin.edit.description", { name: userToEdit.username })}</p>
            <form onSubmit={handleEditUser} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[{ label: t("admin.users.username"), name: "username", type: "text" }, { label: t("admin.users.email"), name: "email", type: "email" }].map(({ label, name, type }) => (
                <div key={name}>
                  <label htmlFor={`edit-user-${name}`} style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#475569", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</label>
                  <input id={`edit-user-${name}`} type={type} name={name} value={editFormData[name]} onChange={handleEditFormChange}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "9px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
                </div>
              ))}
              <div style={{ background: "#eff6ff", borderRadius: "9px", padding: "10px 12px", fontSize: "12px", color: "#1d4ed8" }}>
                {t("admin.edit.emailHelp")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button type="button" onClick={() => { setShowPasswordField((p) => !p); setEditFormData((d) => ({ ...d, password: "" })); }}
                  style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", padding: "9px 14px", borderRadius: "9px", cursor: "pointer", fontSize: "12px", fontFamily: "Inter, sans-serif", alignSelf: "flex-start" }}>
                  {showPasswordField ? t("admin.edit.cancelPassword") : t("admin.edit.changePassword")}
                </button>
                {showPasswordField && (
                  <div>
                    <label htmlFor="edit-user-password" style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#475569", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{t("admin.edit.newPassword")}</label>
                    <input id="edit-user-password" type="password" name="password" value={editFormData.password} onChange={handleEditFormChange}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "9px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "6px" }}>
                <button type="button" onClick={() => { setUserToEdit(null); setShowPasswordField(false); }} disabled={editingUser}
                  style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontFamily: "Inter, sans-serif" }}>{t("admin.actions.cancel")}</button>
                <button type="submit" disabled={editingUser}
                  style={{ border: "none", background: "#2563eb", color: "#fff", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                  {editingUser ? t("admin.edit.saving") : t("admin.edit.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE MODAL */}
      {userToArchive && (
        <div style={S.overlay}>
          <div ref={adminDialogRef} role="dialog" aria-modal="true" aria-labelledby="archive-user-dialog-title" tabIndex={-1} style={{ width: "100%", maxWidth: "400px", background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 20px 60px rgba(15,23,42,0.18)", textAlign: "center" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <ArchiveIcon />
            </div>
            <h2 id="archive-user-dialog-title" style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: "600", color: "#0f172a" }}>{t("admin.archive.title")}</h2>
            <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#64748b" }}>{t("admin.archive.description", { name: userToArchive.username })}</p>
            <p style={{ margin: "0 0 22px", fontSize: "12px", color: "#92400e" }}>{t("admin.archive.help")}</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setUserToArchive(null)} disabled={archivingUser}
                style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontFamily: "Inter, sans-serif" }}>{t("admin.actions.cancel")}</button>
              <button onClick={handleArchiveUser} disabled={archivingUser}
                style={{ border: "none", background: "#d97706", color: "#fff", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                {archivingUser ? t("admin.archive.progress") : t("admin.actions.archive")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {userToDelete && (
        <div style={S.overlay}>
          <div ref={adminDialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-user-dialog-title" tabIndex={-1} style={{ width: "100%", maxWidth: "400px", background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 20px 60px rgba(15,23,42,0.18)", textAlign: "center" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: "18px", fontWeight: "600" }}>!</div>
            <h2 id="delete-user-dialog-title" style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: "600", color: "#0f172a" }}>{t("admin.delete.title")}</h2>
            <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#64748b" }}>{t("admin.delete.description", { name: userToDelete.username })}</p>
            <p style={{ margin: "0 0 22px", fontSize: "12px", color: "#b91c1c" }}>{t("admin.delete.help")}</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setUserToDelete(null)} disabled={deletingUser}
                style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontFamily: "Inter, sans-serif" }}>{t("admin.actions.cancel")}</button>
              <button onClick={handleDeleteUser} disabled={deletingUser}
                style={{ border: "none", background: "#dc2626", color: "#fff", padding: "9px 16px", borderRadius: "9px", cursor: "pointer", fontSize: "13px", fontWeight: "500", fontFamily: "Inter, sans-serif" }}>
                {deletingUser ? t("admin.delete.progress") : t("admin.actions.delete")}
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
  empty: { color: "#64748b", textAlign: "center", padding: "32px", fontSize: "13px", fontWeight: "400" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(3px)" },
  btnBlue: { border: "none", background: "#eff6ff", color: "#2563eb", padding: "6px 12px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif", transition: "filter 0.15s" },
  btnGray: { border: "none", background: "#f1f5f9", color: "#475569", padding: "6px 12px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif", transition: "filter 0.15s" },
  btnRed: { border: "none", background: "#fef2f2", color: "#dc2626", padding: "6px 12px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif", transition: "filter 0.15s" },
  btnGreen: { border: "none", background: "#f0fdf4", color: "#16a34a", padding: "6px 12px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "Inter, sans-serif", transition: "filter 0.15s" },
};

export default AdminDashboard;
