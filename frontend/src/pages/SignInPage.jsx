import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoImage from "../assets/john-logo.png";
import { loginUser } from "../services/authApi";
import { getRoleFromToken } from "../services/authService";
import { saveToken } from "../services/tokenService";
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

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const data = await loginUser(formData);
      const token = data.token;

      if (!token) throw new Error("No token returned from backend.");

      saveToken(token);
      const role = getRoleFromToken(token);

      if (role === "ROLE_ADMIN") navigate("/admin");
      else if (role === "ROLE_EMPLOYER") navigate("/employer");
      else navigate("/candidate");
    } catch (err) {
      setError(err.message || "Invalid credentials or email not verified.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">

        {/* LEFT */}
        <div className="auth-left">

          <div className="signin-header">
            <span className="auth-badge">JoIn Hospitality</span>
            <h1 className="signin-title">
              Welcome <span>back.</span>
            </h1>
            <p className="auth-subtitle">
              Access your account and continue your journey with JoIn Hospitality.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form signin-form" noValidate>

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <div className="input-icon-wrapper">
                <EmailIcon />
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="auth-input auth-input--icon"
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <div className="signin-password-label-row">
                <label htmlFor="password">Password</label>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="input-icon-wrapper">
                <LockIcon />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="auth-input auth-input--icon password-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="primary-btn primary-btn--full" disabled={loading}>
              {loading ? (
                <span className="btn-spinner-wrap">
                  <span className="btn-spinner"></span>
                  <span>Signing in</span>
                </span>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <Link to="/signup" className="ghost-btn">
            Don't have an account? <span>Create one</span>
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
    </div>
  );
}

export default SignInPage;
