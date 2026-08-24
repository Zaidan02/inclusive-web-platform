import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import logoImage from "../assets/john-logo.png";
import { resetPassword } from "../services/authApi";
import { isStrongPassword } from "../utils/authValidation";
import AuthUtilityBar from "../components/layout/AuthUtilityBar";
import "../styles/authPages.css";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("auth");

  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const errorRef = useRef(null);
  const successRef = useRef(null);

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setFieldErrors((current) => ({ ...current, [e.target.name]: "" }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError(t("reset.missingToken"));
      return;
    }

    const nextFieldErrors = {
      newPassword: !formData.newPassword
        ? t("reset.validation.newRequired")
        : !isStrongPassword(formData.newPassword)
        ? t("reset.validation.weak")
        : "",
      confirmPassword: !formData.confirmPassword
        ? t("reset.validation.confirmRequired")
        : formData.newPassword !== formData.confirmPassword
        ? t("reset.validation.mismatch")
        : "",
    };
    setFieldErrors(nextFieldErrors);
    const firstInvalidField = Object.keys(nextFieldErrors).find((field) => nextFieldErrors[field]);
    if (firstInvalidField) {
      window.requestAnimationFrame(() => document.getElementById(firstInvalidField)?.focus());
      return;
    }

    try {
      setLoading(true);

      await resetPassword(token, formData.newPassword);
      setMessage(t("reset.successFallback"));
      window.requestAnimationFrame(() => successRef.current?.focus());
    } catch {
      setError(t("reset.errorFallback"));
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-left">
          <AuthUtilityBar />
          <span className="auth-badge">{t("reset.badge")}</span>
          <h1 className="auth-title">{t("reset.title")}</h1>
          <p className="auth-subtitle" id="reset-password-help">
            {t("reset.help")}
          </p>

          {!token && <p className="auth-error" role="alert">{t("reset.missingToken")}</p>}

          <form onSubmit={handleSubmit} className="auth-form" noValidate aria-busy={loading}>
            <div className="auth-field">
              <label htmlFor="newPassword">{t("reset.newPassword")}</label>

              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  autoComplete="new-password"
                  placeholder={t("reset.newPasswordPlaceholder")}
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  aria-invalid={Boolean(fieldErrors.newPassword)}
                  aria-describedby={`reset-password-help${fieldErrors.newPassword ? " new-password-error" : ""}`}
                  className={fieldErrors.newPassword ? "auth-input password-input input-error" : "auth-input password-input"}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("shared.hidePassword") : t("shared.showPassword")}
                  aria-controls="newPassword confirmPassword"
                  aria-pressed={showPassword}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {fieldErrors.newPassword && <p id="new-password-error" className="field-error">{fieldErrors.newPassword}</p>}
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword">{t("reset.confirmPassword")}</label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder={t("reset.confirmPasswordPlaceholder")}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
                className={fieldErrors.confirmPassword ? "auth-input input-error" : "auth-input"}
              />
              {fieldErrors.confirmPassword && <p id="confirm-password-error" className="field-error">{fieldErrors.confirmPassword}</p>}
            </div>

            {error && <p ref={errorRef} className="auth-error" role="alert" tabIndex={-1}>{error}</p>}

            {message && (
              <p
                ref={successRef}
                role="status"
                tabIndex={-1}
                style={{
                  color: "#166534",
                  background: "#dcfce7",
                  padding: "12px",
                  borderRadius: "12px",
                  fontWeight: "600",
                }}
              >
                {message} {t("shared.signInReady")}
              </p>
            )}

            <button type="submit" className="primary-btn full-width" disabled={loading || !token || Boolean(message)}>
              {loading ? t("reset.resetting") : t("reset.submit")}
            </button>
          </form>

          <p className="auth-footer">
            {t("reset.backTo")} <Link to="/signin">{t("shared.signIn")}</Link>
          </p>
        </div>

        <div className="auth-right">
          <div className="logo-panel">
            <div className="logo-glow"></div>
            <img
              src={logoImage}
              alt={t("shared.logoAlt")}
              className="logo-image"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default ResetPasswordPage;
