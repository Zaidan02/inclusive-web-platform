import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { registerUser } from "../services/authApi";
import { PRIVACY_VERSION } from "../privacy";
import { getPasswordChecks, isValidEmail } from "../utils/authValidation";
import AuthUtilityBar from "../components/layout/AuthUtilityBar";
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

function UserIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 21C5.8 16.8 8.6 14.5 12 14.5C15.4 14.5 18.2 16.8 19 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

function SignUpPage() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("auth");
  const requestedRole = searchParams.get("role");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    accountType: requestedRole === "employer" ? "employer" : "candidate",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [disabilityCard, setDisabilityCard] = useState(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [disabilityVerificationConsent, setDisabilityVerificationConsent] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef(null);
  const successRef = useRef(null);

  useEffect(() => {
    function handleVoiceAction(event) {
      const { action } = event.detail;
      if (!action) return;
      if (action.type === "set_field" || action.type === "clear_field") {
        if (!["username", "email", "password"].includes(action.target)) return;
        const value = action.type === "clear_field" ? "" : action.value;
        setFormData((current) => ({ ...current, [action.target]: value }));
        setServerError("");
        event.detail.handled = true;
        const fieldLabel = action.target === "username"
          ? t("signup.username")
          : t(`shared.${action.target}`);
        event.detail.feedback = action.sensitive
          ? t("signup.voice.sensitiveUpdated", { label: fieldLabel })
          : t("signup.voice.fieldUpdated", { label: fieldLabel, value });
        requestAnimationFrame(() => {
          const field = document.getElementById(action.target);
          field?.focus();
          field?.closest(".auth-field")?.classList.add("voice-action-highlight");
          window.setTimeout(
            () => field?.closest(".auth-field")?.classList.remove("voice-action-highlight"),
            1800,
          );
        });
      } else if (action.type === "select_option" && action.target === "account_type") {
        setFormData((current) => ({ ...current, accountType: action.value }));
        event.detail.handled = true;
        event.detail.feedback = t("signup.voice.accountType", {
          accountType: t(`signup.${action.value}`),
        });
        document.querySelector(".account-type-options")?.classList.add("voice-action-highlight");
        window.setTimeout(
          () => document.querySelector(".account-type-options")?.classList.remove("voice-action-highlight"),
          1800,
        );
      } else if (action.type === "press" && action.target === "create_account") {
        event.detail.handled = true;
        event.detail.feedback = t("signup.voice.submitting");
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("join:voice-action", handleVoiceAction);
    return () => window.removeEventListener("join:voice-action", handleVoiceAction);
  }, [t]);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setServerError("");
  }

  function handleBlur(e) {
    setTouched({ ...touched, [e.target.name]: true });
  }

  function handleAccountTypeChange(accountType) {
    setFormData({ ...formData, accountType });
    if (accountType === "employer") {
      setDisabilityCard(null);
      setTouched((current) => ({ ...current, disabilityCard: false }));
    }
    setServerError("");
  }

  function handleCardChange(e) {
    setDisabilityCard(e.target.files?.[0] || null);
    setTouched((current) => ({ ...current, disabilityCard: true }));
    setServerError("");
  }

  const passwordChecks = getPasswordChecks(formData.password);

  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;

  const passwordStrength =
    passwordScore === 0
      ? { labelKey: "", color: "", width: "0%" }
      : passwordScore === 1
      ? { labelKey: "weak", color: "#ef4444", width: "25%" }
      : passwordScore === 2
      ? { labelKey: "fair", color: "#f59e0b", width: "50%" }
      : passwordScore === 3
      ? { labelKey: "good", color: "#3b82f6", width: "75%" }
      : { labelKey: "strong", color: "#10b981", width: "100%" };

  const errors = {
    username:
      touched.username && !formData.username.trim()
        ? t("signup.errors.usernameRequired")
        : "",
    email:
      touched.email && !formData.email.trim()
        ? t("signup.errors.emailRequired")
        : touched.email && !isValidEmail(formData.email)
        ? t("signup.errors.emailInvalid")
        : "",
    password:
      touched.password && !formData.password
        ? t("signup.errors.passwordRequired")
        : touched.password && passwordScore < 4
        ? t("signup.errors.passwordRequirements")
        : "",
    disabilityCard:
      formData.accountType === "candidate" && touched.disabilityCard && !disabilityCard
        ? t("signup.errors.cardRequired")
        : formData.accountType === "candidate" && disabilityCard && disabilityCard.size > 5 * 1024 * 1024
        ? t("signup.errors.cardSize")
        : formData.accountType === "candidate" && disabilityCard && !["application/pdf", "image/jpeg", "image/png"].includes(disabilityCard.type)
        ? t("signup.errors.cardType")
        : "",
  };

  function validateForm() {
    setTouched({ username: true, email: true, password: true, disabilityCard: true, privacy: true, verificationConsent: true });
    const firstInvalidField = !formData.username.trim()
      ? "username"
      : !isValidEmail(formData.email)
      ? "email"
      : passwordScore < 4
      ? "password"
      : formData.accountType === "candidate" && (
          !disabilityCard
          || disabilityCard.size > 5 * 1024 * 1024
          || !["application/pdf", "image/jpeg", "image/png"].includes(disabilityCard.type)
        )
      ? "disabilityCard"
      : !privacyAccepted
      ? "privacyAccepted"
      : formData.accountType === "candidate" && !disabilityVerificationConsent
      ? "disabilityVerificationConsent"
      : null;
    if (firstInvalidField) {
      window.requestAnimationFrame(() => document.getElementById(firstInvalidField)?.focus());
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");
    setSuccess("");
    if (!validateForm()) return;

    try {
      setLoading(true);
      const registration = new FormData();
      Object.entries(formData).forEach(([key, value]) => registration.append(key, value));
      registration.append("privacyVersion", PRIVACY_VERSION);
      registration.append("privacyAccepted", String(privacyAccepted));
      registration.append("disabilityVerificationConsent", String(disabilityVerificationConsent));
      if (formData.accountType === "candidate" && disabilityCard) {
        registration.append("disabilityCard", disabilityCard);
      }
      await registerUser(registration);
      setSuccess(
        formData.accountType === "candidate"
          ? t("signup.candidateSuccess")
          : t("signup.employerSuccess")
      );
      window.requestAnimationFrame(() => successRef.current?.focus());
    } catch {
      setServerError(t("signup.errors.server"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page signup-page">
      <div className="signup-card">

        {/* Card header shimmer stripe */}
        <div className="signup-card-stripe"></div>
        <AuthUtilityBar />

        <div className="signup-header">
          <span className="auth-badge signup-badge">{t("signup.badge")}</span>
          <h1 className="signup-title">
            {t("signup.titleStart")} <span>{t("signup.titleEmphasis")}</span>
          </h1>
          <p className="signup-subtitle">
            {t("signup.subtitle")}
          </p>
        </div>

        {/* Account type selector */}
        <fieldset className="account-type-fieldset">
          <legend>{t("signup.accountTypeLegend")}</legend>
          <div className="account-type-options">
          <button
            type="button"
            aria-label={t("signup.candidateAria")}
            aria-pressed={formData.accountType === "candidate"}
            className={formData.accountType === "candidate" ? "account-type-card selected" : "account-type-card"}
            onClick={() => handleAccountTypeChange("candidate")}
          >
            <span className="account-type-icon">👤</span>
            <strong>{t("signup.candidate")}</strong>
            <small>{t("signup.candidateDescription")}</small>
            {formData.accountType === "candidate" && <span className="account-type-check">✓</span>}
          </button>

          <button
            type="button"
            aria-label={t("signup.employerAria")}
            aria-pressed={formData.accountType === "employer"}
            className={formData.accountType === "employer" ? "account-type-card selected" : "account-type-card"}
            onClick={() => handleAccountTypeChange("employer")}
          >
            <span className="account-type-icon">🏢</span>
            <strong>{t("signup.employer")}</strong>
            <small>{t("signup.employerDescription")}</small>
            {formData.accountType === "employer" && <span className="account-type-check">✓</span>}
          </button>
          </div>
        </fieldset>

        <form ref={formRef} onSubmit={handleSubmit} className="auth-form signup-form" noValidate aria-busy={loading}>

          {/* Username */}
          <div className="auth-field">
            <label htmlFor="username">{t("signup.username")}</label>
            <div className="input-icon-wrapper">
              <UserIcon />
              <input
                id="username"
                type="text"
                name="username"
                autoComplete="username"
                placeholder={t("signup.usernamePlaceholder")}
                value={formData.username}
                dir="auto"
                onChange={handleChange}
                onBlur={handleBlur}
                required
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? "username-error" : undefined}
                className={errors.username ? "auth-input auth-input--icon input-error" : "auth-input auth-input--icon"}
              />
            </div>
            {errors.username && <p id="username-error" className="field-error">{errors.username}</p>}
          </div>

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
                dir="ltr"
                onChange={handleChange}
                onBlur={handleBlur}
                required
                aria-invalid={Boolean(errors.email)}
                aria-describedby={`signup-email-help${errors.email ? " signup-email-error" : ""}`}
                className={errors.email ? "auth-input auth-input--icon input-error" : "auth-input auth-input--icon"}
              />
            </div>
            <p id="signup-email-help" className="field-help">{t("shared.emailFormatHelp")}</p>
            {errors.email && <p id="signup-email-error" className="field-error">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="password">{t("shared.password")}</label>
            <div className="input-icon-wrapper">
              <LockIcon />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                placeholder={t("signup.passwordPlaceholder")}
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                aria-invalid={Boolean(errors.password)}
                aria-describedby={`password-requirements${errors.password ? " password-error" : ""}`}
                className={errors.password ? "auth-input auth-input--icon password-input input-error" : "auth-input auth-input--icon password-input"}
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
            {errors.password && <p id="password-error" className="field-error">{errors.password}</p>}

            {/* Password strength bar */}
            {formData.password.length > 0 && (
              <div className="strength-row" role="status" aria-live="polite" aria-atomic="true">
                <div className="strength-track" aria-hidden="true">
                  <div
                    className="strength-fill"
                    style={{
                      width: passwordStrength.width,
                      background: passwordStrength.color,
                    }}
                  />
                </div>
                <span className="strength-label">
                  {t("signup.strength", {
                    strength: passwordStrength.labelKey
                      ? t(`signup.strengthLevels.${passwordStrength.labelKey}`)
                      : "",
                  })}
                </span>
              </div>
            )}

            {/* Password rules compact */}
            <div id="password-requirements" className="password-hints-compact" aria-label={t("signup.passwordRequirements")}>
              {[
                { key: "length", visualLabel: "8+" },
                { key: "lowercase", visualLabel: "a–z" },
                { key: "uppercase", visualLabel: "A–Z" },
                { key: "symbol", visualLabel: "#@!" },
              ].map(({ key, visualLabel }) => (
                <span
                  key={key}
                  className={passwordChecks[key] ? "hint-pill hint-pill--valid" : "hint-pill"}
                  aria-label={t(passwordChecks[key] ? "signup.requirementMet" : "signup.requirementNotMet", {
                    requirement: t(`signup.requirements.${key}`),
                  })}
                >
                  {passwordChecks[key] ? "✓" : "○"} {visualLabel}
                </span>
              ))}
            </div>
          </div>

          {formData.accountType === "candidate" && (
            <div className="auth-field candidate-card-field">
              <label htmlFor="disabilityCard">
                {t("signup.disabilityCard")} <span aria-hidden="true">*</span>
              </label>
              <p id="disability-card-help" className="field-help">
                {t("signup.disabilityCardHelp")}
              </p>
              <input
                id="disabilityCard"
                name="disabilityCard"
                type="file"
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                required
                onChange={handleCardChange}
                onBlur={() => setTouched((current) => ({ ...current, disabilityCard: true }))}
                aria-describedby={`disability-card-help${errors.disabilityCard ? " disability-card-error" : ""}`}
                aria-invalid={Boolean(errors.disabilityCard)}
                className={errors.disabilityCard ? "auth-file-input input-error" : "auth-file-input"}
              />
              {disabilityCard && !errors.disabilityCard && (
                <p className="selected-file" role="status">{t("signup.selectedFile", { name: disabilityCard.name })}</p>
              )}
              {errors.disabilityCard && <p id="disability-card-error" className="field-error">{errors.disabilityCard}</p>}
            </div>
          )}

          <div className="auth-field privacy-consent-group">
            <label className="privacy-consent-option" htmlFor="privacyAccepted">
              <input
                id="privacyAccepted"
                type="checkbox"
                checked={privacyAccepted}
                onChange={(event) => { setPrivacyAccepted(event.target.checked); setServerError(""); }}
                onBlur={() => setTouched((current) => ({ ...current, privacy: true }))}
                required
                aria-invalid={touched.privacy && !privacyAccepted}
                aria-describedby={touched.privacy && !privacyAccepted ? "privacy-accepted-error" : undefined}
              />
              <span><Trans
                t={t}
                i18nKey="signup.privacyConsent"
                values={{ version: PRIVACY_VERSION }}
                components={{ privacyLink: <Link to="/privacy" target="_blank" rel="noreferrer" /> }}
              /></span>
            </label>
            {touched.privacy && !privacyAccepted && <p id="privacy-accepted-error" className="field-error">{t("signup.privacyRequired")}</p>}

            {formData.accountType === "candidate" && (
              <>
                <label className="privacy-consent-option" htmlFor="disabilityVerificationConsent">
                  <input
                    id="disabilityVerificationConsent"
                    type="checkbox"
                    checked={disabilityVerificationConsent}
                    onChange={(event) => { setDisabilityVerificationConsent(event.target.checked); setServerError(""); }}
                    onBlur={() => setTouched((current) => ({ ...current, verificationConsent: true }))}
                    required
                    aria-invalid={touched.verificationConsent && !disabilityVerificationConsent}
                    aria-describedby={touched.verificationConsent && !disabilityVerificationConsent ? "verification-consent-error" : undefined}
                  />
                  <span>{t("signup.verificationConsent")}</span>
                </label>
                {touched.verificationConsent && !disabilityVerificationConsent && <p id="verification-consent-error" className="field-error">{t("signup.verificationRequired")}</p>}
              </>
            )}
          </div>

          {serverError && <p className="auth-error" role="alert">{serverError}</p>}
          {success && <p ref={successRef} className="auth-success" role="status" tabIndex={-1}>{success} {t("shared.signInReady")}</p>}

          <button type="submit" className="primary-btn primary-btn--full" disabled={loading || Boolean(success)}>
            {loading ? (
              <span className="btn-spinner-wrap">
                <span className="btn-spinner"></span>
                <span>{t("signup.creating")}</span>
              </span>
            ) : (
              <>
                <span>{t("signup.submit")}</span>
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        <Link to="/signin" className="ghost-btn">
          {t("signup.existingPrompt")} <span>{t("shared.signIn")}</span>
        </Link>

      </div>
    </main>
  );
}

export default SignUpPage;
