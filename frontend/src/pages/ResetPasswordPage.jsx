import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import logoImage from "../assets/john-logo.png";
import { resetPassword } from "../services/authApi";
import { isStrongPassword } from "../utils/authValidation";
import "../styles/authPages.css";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();

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
      setError("Password reset token is missing.");
      return;
    }

    const nextFieldErrors = {
      newPassword: !formData.newPassword
        ? "Please enter a new password."
        : !isStrongPassword(formData.newPassword)
        ? "Use at least 8 characters with uppercase, lowercase, and a symbol."
        : "",
      confirmPassword: !formData.confirmPassword
        ? "Please confirm your new password."
        : formData.newPassword !== formData.confirmPassword
        ? "Passwords do not match."
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

      const data = await resetPassword(token, formData.newPassword);
      setMessage(data.message || "Password reset successfully.");
      window.requestAnimationFrame(() => successRef.current?.focus());
    } catch (err) {
      setError(err.message || "Failed to reset password.");
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-left">
          <span className="auth-badge">Reset Password</span>
          <h1 className="auth-title">Choose a New Password</h1>
          <p className="auth-subtitle" id="reset-password-help">
            Your new password must contain at least 8 characters, one uppercase
            letter, one lowercase letter, and one symbol.
          </p>

          {!token && <p className="auth-error" role="alert">This reset link is missing its security token. Request a new password-reset email.</p>}

          <form onSubmit={handleSubmit} className="auth-form" noValidate aria-busy={loading}>
            <div className="auth-field">
              <label htmlFor="newPassword">New Password</label>

              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  autoComplete="new-password"
                  placeholder="Enter new password"
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="newPassword confirmPassword"
                  aria-pressed={showPassword}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {fieldErrors.newPassword && <p id="new-password-error" className="field-error">{fieldErrors.newPassword}</p>}
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirm new password"
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
                {message} Use the Sign in link below when you are ready.
              </p>
            )}

            <button type="submit" className="primary-btn full-width" disabled={loading || !token || Boolean(message)}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <p className="auth-footer">
            Back to <Link to="/signin">Sign in</Link>
          </p>
        </div>

        <div className="auth-right">
          <div className="logo-panel">
            <div className="logo-glow"></div>
            <img
              src={logoImage}
              alt="JoIn Hospitality logo"
              className="logo-image"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default ResetPasswordPage;
