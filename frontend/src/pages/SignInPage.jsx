import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import logoImage from "../assets/john-logo.png";
import { loginUser } from "../services/authApi";
import { getRoleFromToken } from "../services/authService";
import { saveToken } from "../services/tokenService";
import { isValidEmail } from "../utils/authValidation";
import "../styles/authPages.css";

function EyeIcon({ hidden }) {
  return hidden ? (
    <svg className="eye-icon" viewBox="0 0 24 24" fill="none">
      <path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M9.8 9.8A3 3 0 0 0 14.2 14.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M10.7 5.2C11.1 5.1 11.6 5.1 12 5.1C17.1 5.1 20.7 9.1 22 12C21.6 13 20.8 14.2 19.7 15.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.3 6.7C4.3 8 2.9 10 2 12C3.3 14.9 6.9 18.9 12 18.9C13.4 18.9 14.7 18.6 15.9 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg className="eye-icon" viewBox="0 0 24 24" fill="none">
      <path d="M2 12C3.3 9.1 6.9 5.1 12 5.1C17.1 5.1 20.7 9.1 22 12C20.7 14.9 17.1 18.9 12 18.9C6.9 18.9 3.3 14.9 2 12Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 8l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

function SignInPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const formRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    function handleVoiceAction(event) {
      const { action } = event.detail;
      if (!action) return;
      if (action.type === "set_field" || action.type === "clear_field") {
        if (!["email", "password"].includes(action.target)) return;
        const value = action.type === "clear_field" ? "" : action.value;
        setFormData((current) => ({ ...current, [action.target]: value }));
        setFieldErrors((current) => ({ ...current, [action.target]: "" }));
        setError("");
        event.detail.handled = true;
        const fieldLabel = t(`shared.${action.target}`);
        event.detail.feedback = action.sensitive
          ? t("signIn.voice.sensitiveUpdated", { label: fieldLabel })
          : t("signIn.voice.fieldUpdated", { label: fieldLabel, value });
        requestAnimationFrame(() => {
          const field = document.getElementById(action.target);
          field?.focus();
          field?.closest(".auth-field")?.classList.add("voice-action-highlight");
          window.setTimeout(
            () => field?.closest(".auth-field")?.classList.remove("voice-action-highlight"),
            1800,
          );
        });
      } else if (action.type === "press" && action.target === "sign_in") {
        event.detail.handled = true;
        event.detail.feedback = t("signIn.voice.submitting");
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("join:voice-action", handleVoiceAction);
    return () => window.removeEventListener("join:voice-action", handleVoiceAction);
  }, [t]);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFieldErrors((current) => ({ ...current, [e.target.name]: "" }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const nextFieldErrors = {
      email: !formData.email.trim()
        ? t("shared.validation.emailRequired")
        : !isValidEmail(formData.email)
        ? t("shared.validation.emailInvalid")
        : "",
      password: !formData.password ? t("shared.validation.passwordRequired") : "",
    };
    setFieldErrors(nextFieldErrors);
    const firstInvalidField = Object.keys(nextFieldErrors).find((field) => nextFieldErrors[field]);
    if (firstInvalidField) {
      window.requestAnimationFrame(() => {
        document.getElementById(firstInvalidField)?.focus();
      });
      return;
    }

    try {
      setLoading(true);
      const data = await loginUser(formData);
      const token = data.token;

      if (!token) throw new Error("AUTH_NO_TOKEN");

      saveToken(token);
      const role = getRoleFromToken(token);

      if (role === "ROLE_ADMIN") navigate("/admin");
      else if (role === "ROLE_VERIFIER") navigate("/verifier");
      else if (role === "ROLE_EMPLOYER") navigate("/employer");
      else navigate("/candidate");
    } catch (err) {
      setError(err.message === "AUTH_NO_TOKEN"
        ? t("signIn.errors.noToken")
        : t("signIn.errors.invalidCredentials"));
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">

        {/* LEFT */}
        <div className="auth-left">

          <div className="signin-header">
            <span className="auth-badge">{t("signIn.badge")}</span>
            <h1 className="signin-title">
              {t("signIn.titleStart")} <span>{t("signIn.titleEmphasis")}</span>
            </h1>
            <p className="auth-subtitle">
              {t("signIn.subtitle")}
            </p>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="auth-form signin-form" noValidate aria-busy={loading}>

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="email">{t("shared.email")}</label>
              <div className="input-icon-wrapper">
                <EmailIcon />
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder={t("shared.emailPlaceholder")}
                  value={formData.email}
                  onChange={handleChange}
                  dir="ltr"
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={`signin-email-help${fieldErrors.email ? " signin-email-error" : ""}`}
                  className={fieldErrors.email ? "auth-input auth-input--icon input-error" : "auth-input auth-input--icon"}
                />
              </div>
              <p id="signin-email-help" className="field-help">{t("shared.emailFormatHelp")}</p>
              {fieldErrors.email && <p id="signin-email-error" className="field-error">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div className="auth-field">
              <div className="signin-password-label-row">
                <label htmlFor="password">{t("shared.password")}</label>
                <Link to="/forgot-password" className="forgot-link">
                  {t("signIn.forgotPassword")}
                </Link>
              </div>
              <div className="input-icon-wrapper">
                <LockIcon />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder={t("signIn.passwordPlaceholder")}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "signin-password-error" : undefined}
                  className={fieldErrors.password ? "auth-input auth-input--icon password-input input-error" : "auth-input auth-input--icon password-input"}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("shared.hidePassword") : t("shared.showPassword")}
                  aria-controls="password"
                  aria-pressed={showPassword}
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
              {fieldErrors.password && <p id="signin-password-error" className="field-error">{fieldErrors.password}</p>}
            </div>

            {error && <p ref={errorRef} className="auth-error" role="alert" tabIndex={-1}>{error}</p>}

            <button type="submit" className="primary-btn primary-btn--full" disabled={loading}>
              {loading ? (
                <span className="btn-spinner-wrap">
                  <span className="btn-spinner"></span>
                  <span>{t("signIn.submitting")}</span>
                </span>
              ) : (
                <>
                  <span>{t("signIn.submit")}</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <Link to="/signup" className="ghost-btn">
            {t("signIn.createPrompt")} <span>{t("signIn.createLink")}</span>
          </Link>

        </div>

        {/* RIGHT */}
        <div className="auth-right">
          <div className="logo-panel">
            <div className="logo-orb logo-orb-1"></div>
            <div className="logo-orb logo-orb-2"></div>
            <div className="logo-glow"></div>
            <img src={logoImage} alt={t("shared.logoAlt")} className="logo-image" />
          </div>
        </div>

      </div>
    </main>
  );
}

export default SignInPage;
