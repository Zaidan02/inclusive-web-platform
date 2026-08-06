import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import logoImage from "../assets/john-logo.png";
import { requestPasswordReset } from "../services/authApi";
import { isValidEmail } from "../utils/authValidation";
import "../styles/authPages.css";

function EmailIcon() {
  return (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 8l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const successRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setFieldError("");

    if (!email.trim() || !isValidEmail(email)) {
      setFieldError(!email.trim() ? "Please enter your email address." : "Enter a valid email address, like name@example.com.");
      window.requestAnimationFrame(() => document.getElementById("email")?.focus());
      return;
    }

    try {
      setLoading(true);
      const data = await requestPasswordReset(email);
      setSentEmail(email);
      setMessage(data.message || "We sent a reset link to your email.");
      window.requestAnimationFrame(() => successRef.current?.focus());
    } catch (err) {
      setError(err.message || "Failed to request password reset.");
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
            <span className="auth-badge">JoIn Hospitality</span>
            <h1 className="signin-title">
              Forgot your <span>password?</span>
            </h1>
            <p className="auth-subtitle">
              No worries — enter your email and we'll send you a secure link to reset it.
            </p>
          </div>

          {!message ? (
            <form onSubmit={handleSubmit} className="auth-form" noValidate aria-busy={loading}>
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <div className="input-icon-wrapper">
                  <EmailIcon />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldError(""); setError(""); }}
                    required
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={fieldError ? "forgot-email-error" : undefined}
                    className={fieldError ? "auth-input auth-input--icon input-error" : "auth-input auth-input--icon"}
                  />
                </div>
                {fieldError && <p id="forgot-email-error" className="field-error">{fieldError}</p>}
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button type="submit" className="primary-btn primary-btn--full" disabled={loading}>
                {loading ? (
                  <span className="btn-spinner-wrap">
                    <span className="btn-spinner"></span>
                    <span>Sending</span>
                  </span>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <span className="btn-arrow">→</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div ref={successRef} className="reset-success-card" role="status" tabIndex={-1}>
              <div className="reset-success-icon">
                <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
                  <rect x="3" y="5" width="18" height="14" rx="3" stroke="#1a4fa0" strokeWidth="1.8" />
                  <path d="M3 8l9 6 9-6" stroke="#1a4fa0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2>Check your inbox</h2>
              <p>
                We sent a reset link to <strong>{sentEmail}</strong>. It expires in 1 hour.
              </p>
              <p className="reset-success-note">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMessage("");
                    setError("");
                    setFieldError("");
                    window.requestAnimationFrame(() => document.getElementById("email")?.focus());
                  }}
                >
                  try again
                </button>
              </p>
            </div>
          )}

          <Link to="/signin" className="ghost-btn">
            Remembered your password? <span>Sign in</span>
          </Link>

        </div>

        {/* RIGHT */}
        <div className="auth-right">
          <div className="logo-panel">
            <div className="logo-orb logo-orb-1"></div>
            <div className="logo-orb logo-orb-2"></div>
            <div className="logo-glow"></div>
            <img src={logoImage} alt="JoIn Hospitality logo" className="logo-image" />
          </div>
        </div>

      </div>
    </main>
  );
}

export default ForgotPasswordPage;
