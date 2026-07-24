import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { registerUser } from "../services/authApi";
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    accountType: requestedRole === "employer" ? "employer" : "candidate",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef(null);

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
        event.detail.feedback = action.sensitive
          ? `I updated the ${action.label} field without reading it aloud. Please check it.`
          : `I set ${action.label} to ${value}. Please check it.`;
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
        event.detail.feedback = `I selected ${action.value} as the account type. Please check it.`;
        document.querySelector(".account-type-options")?.classList.add("voice-action-highlight");
        window.setTimeout(
          () => document.querySelector(".account-type-options")?.classList.remove("voice-action-highlight"),
          1800,
        );
      } else if (action.type === "press" && action.target === "create_account") {
        event.detail.handled = true;
        event.detail.feedback = "Creating the account with the values currently in the form.";
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("join:voice-action", handleVoiceAction);
    return () => window.removeEventListener("join:voice-action", handleVoiceAction);
  }, []);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setServerError("");
  }

  function handleBlur(e) {
    setTouched({ ...touched, [e.target.name]: true });
  }

  function handleAccountTypeChange(accountType) {
    setFormData({ ...formData, accountType });
  }

  const passwordChecks = {
    length: formData.password.length >= 8,
    lowercase: /[a-z]/.test(formData.password),
    uppercase: /[A-Z]/.test(formData.password),
    symbol: /[\W_]/.test(formData.password),
  };

  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;

  const passwordStrength =
    passwordScore === 0
      ? { label: "", color: "", width: "0%" }
      : passwordScore === 1
      ? { label: "Weak", color: "#ef4444", width: "25%" }
      : passwordScore === 2
      ? { label: "Fair", color: "#f59e0b", width: "50%" }
      : passwordScore === 3
      ? { label: "Good", color: "#3b82f6", width: "75%" }
      : { label: "Strong", color: "#10b981", width: "100%" };

  const errors = {
    username:
      touched.username && !formData.username.trim()
        ? "Please enter a username."
        : "",
    email:
      touched.email && !formData.email.trim()
        ? "Please enter your email address."
        : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        ? "Please enter a valid email address, like name@example.com."
        : "",
    password:
      touched.password && !formData.password
        ? "Please create a password."
        : touched.password && passwordScore < 4
        ? "Your password must meet all requirements below."
        : "",
  };

  function validateForm() {
    setTouched({ username: true, email: true, password: true });
    if (!formData.username.trim()) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return false;
    if (passwordScore < 4) return false;
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");
    setSuccess("");
    if (!validateForm()) return;

    try {
      setLoading(true);
      await registerUser(formData);
      setSuccess("Account created successfully. Please check your email to verify your account before signing in.");
      setTimeout(() => navigate("/signin"), 2000);
    } catch (err) {
      setServerError(err.message || "We could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page signup-page">
      <div className="signup-card">

        {/* Card header shimmer stripe */}
        <div className="signup-card-stripe"></div>

        <div className="signup-header">
          <span className="auth-badge signup-badge">JoIn Hospitality</span>
          <h1 className="signup-title">
            Create your <span>account</span>
          </h1>
          <p className="signup-subtitle">
            Start your journey in a more inclusive hospitality experience.
          </p>
        </div>

        {/* Account type selector */}
        <div className="account-type-options">
          <button
            type="button"
            className={formData.accountType === "candidate" ? "account-type-card selected" : "account-type-card"}
            onClick={() => handleAccountTypeChange("candidate")}
          >
            <span className="account-type-icon">👤</span>
            <strong>Candidate</strong>
            <small>Looking for opportunities</small>
            {formData.accountType === "candidate" && <span className="account-type-check">✓</span>}
          </button>

          <button
            type="button"
            className={formData.accountType === "employer" ? "account-type-card selected" : "account-type-card"}
            onClick={() => handleAccountTypeChange("employer")}
          >
            <span className="account-type-icon">🏢</span>
            <strong>Employer</strong>
            <small>Hiring for my business</small>
            {formData.accountType === "employer" && <span className="account-type-check">✓</span>}
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="auth-form signup-form" noValidate>

          {/* Username */}
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <div className="input-icon-wrapper">
              <UserIcon />
              <input
                id="username"
                type="text"
                name="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.username ? "auth-input auth-input--icon input-error" : "auth-input auth-input--icon"}
              />
            </div>
            {errors.username && <p className="field-error">{errors.username}</p>}
          </div>

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
                onBlur={handleBlur}
                className={errors.email ? "auth-input auth-input--icon input-error" : "auth-input auth-input--icon"}
              />
            </div>
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <div className="input-icon-wrapper">
              <LockIcon />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.password ? "auth-input auth-input--icon password-input input-error" : "auth-input auth-input--icon password-input"}
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
            {errors.password && <p className="field-error">{errors.password}</p>}

            {/* Password strength bar */}
            {formData.password.length > 0 && (
              <div className="strength-row">
                <div className="strength-track">
                  <div
                    className="strength-fill"
                    style={{
                      width: passwordStrength.width,
                      background: passwordStrength.color,
                    }}
                  />
                </div>
                <span className="strength-label" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}

            {/* Password rules compact */}
            <div className="password-hints-compact">
              {[
                { key: "length", label: "8+ chars" },
                { key: "lowercase", label: "a–z" },
                { key: "uppercase", label: "A–Z" },
                { key: "symbol", label: "#@!" },
              ].map(({ key, label }) => (
                <span
                  key={key}
                  className={passwordChecks[key] ? "hint-pill hint-pill--valid" : "hint-pill"}
                >
                  {passwordChecks[key] ? "✓" : "○"} {label}
                </span>
              ))}
            </div>
          </div>

          {serverError && <p className="auth-error">{serverError}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button type="submit" className="primary-btn primary-btn--full" disabled={loading}>
            {loading ? (
              <span className="btn-spinner-wrap">
                <span className="btn-spinner"></span>
                <span>Creating account</span>
              </span>
            ) : (
              <>
                <span>Create Account</span>
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        <Link to="/signin" className="ghost-btn">
          Already have an account? <span>Sign in</span>
        </Link>

      </div>
    </div>
  );
}

export default SignUpPage;
