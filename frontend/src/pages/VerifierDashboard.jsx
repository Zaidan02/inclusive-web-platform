import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../services/tokenService";
import {
  getVerificationRequests,
  openVerificationDocument,
  updateVerificationRequest,
} from "../services/verifierApi";
import "../styles/verifierDashboard.css";

const FILTERS = ["pending", "approved", "rejected", "all"];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "Unknown size";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "Not reviewed";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function VerifierDashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getVerificationRequests(filter);
      setRequests(data.requests || []);
      setCounts(data.counts || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function review(item, status) {
    const note = (notes[item.id] || "").trim();
    if (status === "rejected" && !note) {
      setError("Enter a clear reason before rejecting this request.");
      document.getElementById(`note-${item.id}`)?.focus();
      return;
    }
    const action = status === "approved" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} ${item.candidate.username}'s verification?`)) return;

    setWorkingId(item.id);
    setError("");
    setMessage("");
    try {
      const data = await updateVerificationRequest(item.id, status, note);
      setMessage(`${data.message}${data.notificationSent ? " The candidate was notified by email." : " The decision was saved; email delivery was unavailable."}`);
      setNotes((current) => ({ ...current, [item.id]: "" }));
      await loadRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setWorkingId(null);
    }
  }

  async function openDocument(item, download = false) {
    setError("");
    try {
      await openVerificationDocument(item.id, item.document.originalName, download);
    } catch (err) {
      setError(err.message);
    }
  }

  function signOut() {
    clearToken();
    navigate("/signin", { replace: true });
  }

  return (
    <main className="verifier-page dashboard-screen">
      <header className="verifier-header">
        <div>
          <p className="verifier-eyebrow">Authorized access</p>
          <h1>Candidate verification</h1>
          <p>Review disability cards before candidate accounts are allowed to sign in.</p>
        </div>
        <button type="button" className="verifier-signout" onClick={signOut}>Sign out</button>
      </header>

      <section className="verifier-content" aria-labelledby="request-heading">
        <div className="verifier-toolbar">
          <h2 id="request-heading">Signup requests</h2>
          <button type="button" className="verifier-refresh" onClick={loadRequests} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="verifier-filters" aria-label="Filter verification requests">
          {FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filter === status}
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
            >
              {status[0].toUpperCase() + status.slice(1)}
              {status !== "all" && <span>{counts[status] ?? 0}</span>}
            </button>
          ))}
        </div>

        <div className="verifier-announcements" aria-live="polite">
          {error && <p className="verifier-error" role="alert">{error}</p>}
          {message && <p className="verifier-success">{message}</p>}
        </div>

        {loading ? (
          <p className="verifier-empty" role="status">Loading verification requests…</p>
        ) : requests.length === 0 ? (
          <p className="verifier-empty">No {filter === "all" ? "" : `${filter} `}requests found.</p>
        ) : (
          <div className="verification-list">
            {requests.map((item) => (
              <article className="verification-card" key={item.id}>
                <div className="verification-card-heading">
                  <div>
                    <h3>{item.candidate.username}</h3>
                    <a href={`mailto:${item.candidate.email}`}>{item.candidate.email}</a>
                  </div>
                  <span className={`verification-status status-${item.status}`}>{item.status}</span>
                </div>

                <dl className="verification-meta">
                  <div><dt>Email</dt><dd>{item.candidate.emailVerified ? "Verified" : "Not verified yet"}</dd></div>
                  <div><dt>Submitted</dt><dd>{formatDate(item.submittedAt)}</dd></div>
                  <div><dt>Document</dt><dd>{item.document.originalName} · {formatBytes(item.document.size)}</dd></div>
                  {item.reviewedAt && <div><dt>Last review</dt><dd>{formatDate(item.reviewedAt)} by {item.reviewer}</dd></div>}
                </dl>

                <div className="document-actions">
                  <button type="button" onClick={() => openDocument(item)}>Open document</button>
                  <button type="button" onClick={() => openDocument(item, true)}>Download</button>
                </div>

                <label htmlFor={`note-${item.id}`}>Reviewer note {item.status !== "approved" && "(required to reject)"}</label>
                <textarea
                  id={`note-${item.id}`}
                  rows="3"
                  maxLength="2000"
                  value={notes[item.id] ?? item.reviewerNote ?? ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Give a concise reason or internal review note."
                />

                <div className="review-actions">
                  <button type="button" className="approve-button" disabled={workingId === item.id} onClick={() => review(item, "approved")}>Approve</button>
                  <button type="button" className="reject-button" disabled={workingId === item.id} onClick={() => review(item, "rejected")}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
