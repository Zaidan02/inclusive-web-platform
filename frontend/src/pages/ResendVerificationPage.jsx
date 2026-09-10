import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import logoImage from "../assets/john-logo.png";
import AuthUtilityBar from "../components/layout/AuthUtilityBar";
import { resendVerificationEmail } from "../services/authApi";
import { isValidEmail } from "../utils/authValidation";
import "../styles/authPages.css";

function EmailIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 8l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ResendVerificationPage() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const statusRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldError("");
    setError("");
    setSuccess("");
    const value = email.trim();
    if (!value || !isValidEmail(value)) {
      setFieldError(value ? t("shared.validation.emailInvalid") : t("shared.validation.emailRequired"));
      window.requestAnimationFrame(() => document.getElementById("resend-email")?.focus());
      return;
    }
    try {
      setLoading(true);
      await resendVerificationEmail(value);
      setSuccess(t("verificationResend.success"));
    } catch (requestError) {
      setError(requestError.status === 429
        ? t("verificationResend.wait", { seconds: requestError.retryAfterSeconds || 60 })
        : t("verificationResend.error"));
    } finally {
      setLoading(false);
      window.requestAnimationFrame(() => statusRef.current?.focus());
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-left">
          <AuthUtilityBar />
          <div className="signin-header">
            <span className="auth-badge">JoIn Hospitality</span>
            <h1 className="signin-title">{t("verificationResend.title")}</h1>
            <p className="auth-subtitle">{t("verificationResend.subtitle")}</p>
          </div>
          <form onSubmit={handleSubmit} className="auth-form" noValidate aria-busy={loading}>
            <div className="auth-field">
              <label htmlFor="resend-email">{t("shared.email")}</label>
              <div className="input-icon-wrapper">
                <EmailIcon />
                <input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setFieldError(""); setError(""); setSuccess(""); }}
                  className={fieldError ? "auth-input auth-input--icon input-error" : "auth-input auth-input--icon"}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? "resend-email-error" : "resend-email-help"}
                  dir="ltr"
                />
              </div>
              <p id="resend-email-help" className="field-help">{t("shared.emailFormatHelp")}</p>
              {fieldError && <p id="resend-email-error" className="field-error">{fieldError}</p>}
            </div>
            {(error || success) && (
              <p ref={statusRef} className={error ? "auth-error" : "auth-success"} role={error ? "alert" : "status"} tabIndex={-1}>
                {error || success}
              </p>
            )}
            <button type="submit" className="primary-btn primary-btn--full" disabled={loading}>
              {loading ? t("verificationResend.sending") : t("verificationResend.submit")}
            </button>
          </form>
          <Link to="/signin" className="ghost-btn">{t("verificationResend.backToSignIn")}</Link>
        </div>
        <div className="auth-right">
          <div className="logo-panel">
            <div className="logo-orb logo-orb-1"></div><div className="logo-orb logo-orb-2"></div><div className="logo-glow"></div>
            <img src={logoImage} alt={t("shared.logoAlt")} className="logo-image" />
          </div>
        </div>
      </div>
    </main>
  );
}
