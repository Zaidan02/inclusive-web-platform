import { useEffect, useRef, useState } from "react";
import {
  deleteCandidateAccount,
  exportCandidateData,
  getPrivacySummary,
  withdrawAiConsent,
} from "../../../services/candidatePrivacyApi";

function dateText(value) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

export default function CandidatePrivacyPanel({ onAccountDeleted }) {
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const messageRef = useRef(null);
  const errorRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmationRef = useRef(null);

  function focusMessage(type) {
    requestAnimationFrame(() => (type === "error" ? errorRef.current : messageRef.current)?.focus());
  }

  async function load() {
    try {
      setError("");
      setSummary(await getPrivacySummary());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function run(name, action) {
    try {
      setBusy(name); setError(""); setMessage("");
      const result = await action();
      if (result?.message) {
        setMessage(result.message);
        focusMessage("message");
      }
      await load();
    } catch (err) {
      setError(err.message);
      focusMessage("error");
    } finally {
      setBusy("");
    }
  }

  async function handleDelete(event) {
    event.preventDefault();
    setDeleteError("");
    if (!password) {
      setDeleteError("Enter your password to confirm account deletion.");
      requestAnimationFrame(() => passwordRef.current?.focus());
      return;
    }
    if (confirmation !== "DELETE") {
      setDeleteError("Type DELETE exactly to confirm permanent account deletion.");
      requestAnimationFrame(() => confirmationRef.current?.focus());
      return;
    }
    try {
      setBusy("delete"); setError("");
      await deleteCandidateAccount(password, confirmation);
      onAccountDeleted?.();
    } catch (err) {
      setError(err.message);
      focusMessage("error");
      setBusy("");
    }
  }

  const verification = summary?.verificationDocument;
  return (
    <section className="candidate-privacy" aria-labelledby="candidate-privacy-title">
      <h2 id="candidate-privacy-title">Privacy and your data</h2>
      <p>Review what the platform processes, download a copy of your data, or delete your account. Privacy notice version: {summary?.policy?.version || "loading"}.</p>
      {error && <p ref={errorRef} tabIndex="-1" className="candidate-privacy__error" role="alert">{error}</p>}
      {message && <p ref={messageRef} tabIndex="-1" className="candidate-privacy__success" role="status">{message}</p>}

      <div className="candidate-privacy__grid">
        <article>
          <h3>Data we use</h3>
          <ul>{(summary?.dataCategories || []).map((item) => <li key={item}>{item}</li>)}</ul>
          <button type="button" onClick={() => run("export", exportCandidateData)} disabled={Boolean(busy)}>
            {busy === "export" ? "Preparing export…" : "Download my data (JSON)"}
          </button>
        </article>

        <article>
          <h3>Disability-card retention</h3>
          {!verification && <p>No verification request is linked to this account.</p>}
          {verification && <>
            <p>Status: <strong>{verification.status}</strong></p>
            <p>Private document: {verification.available ? "retained temporarily" : "deleted"}</p>
            {verification.retentionUntil && <p>Scheduled deletion: {dateText(verification.retentionUntil)}</p>}
            {verification.deletedAt && <p>Deleted: {dateText(verification.deletedAt)}</p>}
          </>}
        </article>

        <article>
          <h3>AI profile assistant</h3>
          <p>The platform records consent and operational events, but not the transcript text. You approve suggestions before profile changes are saved.</p>
          <button type="button" onClick={() => run("withdraw", withdrawAiConsent)} disabled={Boolean(busy)}>
            {busy === "withdraw" ? "Withdrawing…" : "Withdraw active AI consent"}
          </button>
        </article>
      </div>

      <form className="candidate-privacy__delete" onSubmit={handleDelete} aria-busy={busy === "delete"}>
        <h3>Delete account</h3>
        <p>This permanently deletes your account and privately stored application and verification documents. This cannot be undone.</p>
        {deleteError && <p id="candidate-delete-error" className="candidate-privacy__error" role="alert">{deleteError}</p>}
        <label>Password<input ref={passwordRef} type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setDeleteError(""); }} required aria-invalid={Boolean(deleteError && !password)} aria-describedby={deleteError ? "candidate-delete-error" : undefined} /></label>
        <label>Type DELETE<input ref={confirmationRef} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setDeleteError(""); }} required aria-invalid={Boolean(deleteError && confirmation !== "DELETE")} aria-describedby={deleteError ? "candidate-delete-error" : undefined} /></label>
        <button type="submit" disabled={Boolean(busy)}>{busy === "delete" ? "Deleting…" : "Permanently delete my account"}</button>
      </form>
    </section>
  );
}
