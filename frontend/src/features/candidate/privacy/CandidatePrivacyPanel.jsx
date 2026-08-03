import { useEffect, useState } from "react";
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
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

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
      if (result?.message) setMessage(result.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function handleDelete(event) {
    event.preventDefault();
    if (confirmation !== "DELETE") {
      setError("Type DELETE exactly to confirm permanent account deletion.");
      return;
    }
    try {
      setBusy("delete"); setError("");
      await deleteCandidateAccount(password, confirmation);
      onAccountDeleted?.();
    } catch (err) {
      setError(err.message);
      setBusy("");
    }
  }

  const verification = summary?.verificationDocument;
  return (
    <section className="candidate-privacy" aria-labelledby="candidate-privacy-title">
      <h2 id="candidate-privacy-title">Privacy and your data</h2>
      <p>Review what the platform processes, download a copy of your data, or delete your account. Privacy notice version: {summary?.policy?.version || "loading"}.</p>
      {error && <p className="candidate-privacy__error" role="alert">{error}</p>}
      {message && <p className="candidate-privacy__success" role="status">{message}</p>}

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

      <form className="candidate-privacy__delete" onSubmit={handleDelete}>
        <h3>Delete account</h3>
        <p>This permanently deletes your account and privately stored application and verification documents. This cannot be undone.</p>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label>Type DELETE<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
        <button type="submit" disabled={Boolean(busy)}>{busy === "delete" ? "Deleting…" : "Permanently delete my account"}</button>
      </form>
    </section>
  );
}
