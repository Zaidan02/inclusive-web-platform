import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../services/tokenService";
import AccessibleNotice from "../components/accessibility/AccessibleNotice";
import LanguageSwitcher from "../components/localization/LanguageSwitcher";
import {
  getVerificationRequests,
  openVerificationDocument,
  updateVerificationRequest,
} from "../services/verifierApi";
import "../styles/verifierDashboard.css";

const FILTERS = ["pending", "approved", "rejected", "all"];

function formatBytes(bytes, locale, t) {
  if (!Number.isFinite(bytes)) return t("verifier.unknownSize");
  const megabytes = bytes >= 1024 * 1024;
  const value = megabytes ? bytes / (1024 * 1024) : Math.max(1, Math.round(bytes / 1024));
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: megabytes ? 1 : 0 }).format(value)} ${megabytes ? "MB" : "KB"}`;
}

function formatDate(value, locale, t) {
  if (!value) return t("verifier.notReviewed");
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function VerifierDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("dashboards");
  const locale = i18n.resolvedLanguage || "en";
  const [filter, setFilter] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const errorRef = useRef(null);
  const messageRef = useRef(null);

  function focusNotice(kind) {
    requestAnimationFrame(() => (kind === "error" ? errorRef.current : messageRef.current)?.focus());
  }

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getVerificationRequests(filter);
      setRequests(data.requests || []);
      setCounts(data.counts || {});
    } catch {
      setError(t("verifier.errors.load"));
      focusNotice("error");
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function review(item, status) {
    const note = (notes[item.id] || "").trim();
    if (status === "rejected" && !note) {
      setError(t("verifier.errors.rejectionReason"));
      document.getElementById(`note-${item.id}`)?.focus();
      return;
    }
    if (!window.confirm(t(`verifier.confirm.${status}`, { name: item.candidate.username }))) return;

    setWorkingId(item.id);
    setError("");
    setMessage("");
    try {
      const data = await updateVerificationRequest(item.id, status, note);
      setMessage(t(`verifier.saved.${data.notificationSent ? "emailSent" : "emailUnavailable"}`, { status: t(`verifier.filters.${status}`) }));
      setNotes((current) => ({ ...current, [item.id]: "" }));
      await loadRequests();
      focusNotice("message");
    } catch {
      setError(t("verifier.errors.update"));
      focusNotice("error");
    } finally {
      setWorkingId(null);
    }
  }

  async function openDocument(item, download = false) {
    setError("");
    try {
      await openVerificationDocument(item.id, item.document.originalName, download);
    } catch {
      setError(t("verifier.errors.document"));
      focusNotice("error");
    }
  }

  function signOut() {
    clearToken();
    navigate("/signin", { replace: true });
  }

  return (
    <main className="verifier-page dashboard-screen">
      <aside className="verifier-sidebar">
        <div className="verifier-sidebar__heading">
          <p className="verifier-eyebrow">{t("verifier.eyebrow")}</p>
          <h2>{t("verifier.requests")}</h2>
        </div>
        <div className="verifier-filters" aria-label={t("verifier.filterLabel")} role="group">
          {FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filter === status}
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
            >
              {t(`verifier.filters.${status}`)}
              {status !== "all" && <span>{new Intl.NumberFormat(locale).format(counts[status] ?? 0)}</span>}
            </button>
          ))}
        </div>
      </aside>

      <div className="verifier-main">
        <header className="verifier-header">
          <div>
            <p className="verifier-eyebrow">{t("verifier.eyebrow")}</p>
            <h1>{t("verifier.title")}</h1>
            <p>{t("verifier.intro")}</p>
          </div>
          <div className="verifier-header__actions">
            <LanguageSwitcher compact />
            <button type="button" className="verifier-signout" onClick={signOut}>{t("common.signOut")}</button>
          </div>
        </header>

        <section className="verifier-content" aria-labelledby="request-heading" aria-busy={loading}>
          <div className="verifier-toolbar">
            <h2 id="request-heading">{t("verifier.requests")}</h2>
            <button type="button" className="verifier-refresh" onClick={loadRequests} disabled={loading}>
              {loading ? t("common.refreshing") : t("common.refresh")}
            </button>
          </div>

        <div className="verifier-announcements">
          <AccessibleNotice noticeRef={errorRef} tone="error" message={error} />
          <AccessibleNotice noticeRef={messageRef} tone="success" message={message} />
        </div>

        {loading ? (
          <p className="verifier-empty" role="status">{t("verifier.loading")}</p>
        ) : requests.length === 0 ? (
          <p className="verifier-empty" role="status">{t("verifier.empty", { filter: filter === "all" ? "" : t(`verifier.filters.${filter}`).toLocaleLowerCase(locale) })}</p>
        ) : (
          <div className="verification-list">
            {requests.map((item) => (
              <article className="verification-card" key={item.id}>
                <div className="verification-card-heading">
                  <div>
                    <h3 dir="auto">{item.candidate.username}</h3>
                    <a dir="ltr" href={`mailto:${item.candidate.email}`}>{item.candidate.email}</a>
                  </div>
                  <span className={`verification-status status-${item.status}`} aria-label={t("verifier.statusLabel", { status: t(`verifier.filters.${item.status}`) })}>{t(`verifier.filters.${item.status}`)}</span>
                </div>

                <dl className="verification-meta">
                  <div><dt>{t("verifier.email")}</dt><dd>{item.candidate.emailVerified ? t("verifier.emailVerified") : t("verifier.emailNotVerified")}</dd></div>
                  <div><dt>{t("verifier.submitted")}</dt><dd>{formatDate(item.submittedAt, locale, t)}</dd></div>
                  <div><dt>{t("verifier.document")}</dt><dd><bdi>{item.document.originalName}</bdi> · {formatBytes(item.document.size, locale, t)} · {item.document.available ? t("verifier.available") : t("verifier.deletedAfterRetention")}</dd></div>
                  {item.reviewedAt && <div><dt>{t("verifier.lastReview")}</dt><dd>{t("verifier.reviewedBy", { date: formatDate(item.reviewedAt, locale, t), reviewer: item.reviewer })}</dd></div>}
                  {item.document.retentionUntil && item.document.available && <div><dt>{t("verifier.scheduledDeletion")}</dt><dd>{formatDate(item.document.retentionUntil, locale, t)}</dd></div>}
                  {item.document.deletedAt && <div><dt>{t("verifier.documentDeleted")}</dt><dd>{formatDate(item.document.deletedAt, locale, t)}</dd></div>}
                </dl>

                <div className="document-actions">
                  <button type="button" aria-label={t("verifier.openFor", { name: item.candidate.username })} onClick={() => openDocument(item)} disabled={!item.document.available}>{t("verifier.open")}</button>
                  <button type="button" aria-label={t("verifier.downloadFor", { name: item.candidate.username })} onClick={() => openDocument(item, true)} disabled={!item.document.available}>{t("verifier.download")}</button>
                </div>

                <label htmlFor={`note-${item.id}`}>{t("verifier.noteLabel")} {item.status !== "approved" && t("verifier.noteRequired")}</label>
                <textarea
                  id={`note-${item.id}`}
                  dir="auto"
                  rows="3"
                  maxLength="2000"
                  value={notes[item.id] ?? item.reviewerNote ?? ""}
                  aria-describedby={`note-help-${item.id}`}
                  aria-invalid={Boolean(error && item.status !== "approved" && !(notes[item.id] || "").trim())}
                  onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder={t("verifier.notePlaceholder")}
                />
                <p id={`note-help-${item.id}`} className="verifier-note-help">{t("verifier.noteHelp")}</p>

                <div className="review-actions" aria-busy={workingId === item.id}>
                  <button type="button" className="approve-button" disabled={workingId === item.id} onClick={() => review(item, "approved")}>{t("verifier.approve")}</button>
                  <button type="button" className="reject-button" disabled={workingId === item.id} onClick={() => review(item, "rejected")}>{t("verifier.reject")}</button>
                </div>
              </article>
            ))}
          </div>
        )}
        </section>
      </div>
    </main>
  );
}
