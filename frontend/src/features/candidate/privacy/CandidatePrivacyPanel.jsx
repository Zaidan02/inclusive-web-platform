import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deleteCandidateAccount,
  exportCandidateData,
  getPrivacySummary,
  withdrawAiConsent,
} from "../../../services/candidatePrivacyApi";

function dateText(value, locale, fallback) {
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : fallback;
}

export default function CandidatePrivacyPanel({ onAccountDeleted }) {
  const { t, i18n } = useTranslation("dashboards");
  const locale = i18n.resolvedLanguage || "en";
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

  const load = useCallback(async () => {
    try {
      setError("");
      setSummary(await getPrivacySummary());
    } catch {
      setError(t("candidatePrivacy.errors.load"));
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  async function run(name, action) {
    try {
      setBusy(name);
      setError("");
      setMessage("");
      await action();
      setMessage(t(`candidatePrivacy.success.${name}`));
      focusMessage("message");
      await load();
    } catch {
      setError(t(`candidatePrivacy.errors.${name}`));
      focusMessage("error");
    } finally {
      setBusy("");
    }
  }

  async function handleDelete(event) {
    event.preventDefault();
    setDeleteError("");
    if (!password) {
      setDeleteError(t("candidatePrivacy.errors.password"));
      requestAnimationFrame(() => passwordRef.current?.focus());
      return;
    }
    if (confirmation !== "DELETE") {
      setDeleteError(t("candidatePrivacy.errors.confirmation"));
      requestAnimationFrame(() => confirmationRef.current?.focus());
      return;
    }
    try {
      setBusy("delete");
      setError("");
      await deleteCandidateAccount(password, confirmation);
      onAccountDeleted?.();
    } catch {
      setError(t("candidatePrivacy.errors.delete"));
      focusMessage("error");
      setBusy("");
    }
  }

  const verification = summary?.verificationDocument;
  return (
    <section className="candidate-privacy" aria-labelledby="candidate-privacy-title">
      <h2 id="candidate-privacy-title">{t("candidatePrivacy.title")}</h2>
      <p>{t("candidatePrivacy.intro", { version: summary?.policy?.version || t("candidatePrivacy.loading") })}</p>
      {error && <p ref={errorRef} tabIndex="-1" className="candidate-privacy__error" role="alert">{error}</p>}
      {message && <p ref={messageRef} tabIndex="-1" className="candidate-privacy__success" role="status">{message}</p>}

      <div className="candidate-privacy__grid">
        <article>
          <h3>{t("candidatePrivacy.dataTitle")}</h3>
          <ul>{(summary?.dataCategories || []).map((item) => <li key={item}>{t(`candidatePrivacy.categories.${item}`, { defaultValue: item })}</li>)}</ul>
          <button type="button" onClick={() => run("export", exportCandidateData)} disabled={Boolean(busy)}>
            {busy === "export" ? t("candidatePrivacy.preparing") : t("candidatePrivacy.export")}
          </button>
        </article>

        <article>
          <h3>{t("candidatePrivacy.retentionTitle")}</h3>
          {!verification && <p>{t("candidatePrivacy.noVerification")}</p>}
          {verification && <>
            <p>{t("candidatePrivacy.status")} <strong>{t(`candidatePrivacy.statuses.${verification.status}`, { defaultValue: verification.status })}</strong></p>
            <p>{t("candidatePrivacy.privateDocument")} {verification.available ? t("candidatePrivacy.retained") : t("candidatePrivacy.deleted")}</p>
            {verification.retentionUntil && <p>{t("candidatePrivacy.scheduledDeletion")} {dateText(verification.retentionUntil, locale, t("candidatePrivacy.notSet"))}</p>}
            {verification.deletedAt && <p>{t("candidatePrivacy.deletedAt")} {dateText(verification.deletedAt, locale, t("candidatePrivacy.notSet"))}</p>}
          </>}
        </article>

        <article>
          <h3>{t("candidatePrivacy.aiTitle")}</h3>
          <p>{t("candidatePrivacy.aiText")}</p>
          <button type="button" onClick={() => run("withdraw", withdrawAiConsent)} disabled={Boolean(busy)}>
            {busy === "withdraw" ? t("candidatePrivacy.withdrawing") : t("candidatePrivacy.withdraw")}
          </button>
        </article>
      </div>

      <form className="candidate-privacy__delete" onSubmit={handleDelete} aria-busy={busy === "delete"}>
        <h3>{t("candidatePrivacy.deleteTitle")}</h3>
        <p>{t("candidatePrivacy.deleteText")}</p>
        {deleteError && <p id="candidate-delete-error" className="candidate-privacy__error" role="alert">{deleteError}</p>}
        <label>{t("candidatePrivacy.password")}<input ref={passwordRef} type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setDeleteError(""); }} required aria-invalid={Boolean(deleteError && !password)} aria-describedby={deleteError ? "candidate-delete-error" : undefined} /></label>
        <label>{t("candidatePrivacy.typeDelete")}<input ref={confirmationRef} dir="ltr" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setDeleteError(""); }} required aria-invalid={Boolean(deleteError && confirmation !== "DELETE")} aria-describedby={deleteError ? "candidate-delete-error" : undefined} /></label>
        <button type="submit" disabled={Boolean(busy)}>{busy === "delete" ? t("candidatePrivacy.deleting") : t("candidatePrivacy.deleteButton")}</button>
      </form>
    </section>
  );
}
