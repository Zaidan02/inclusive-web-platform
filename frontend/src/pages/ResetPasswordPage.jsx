import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logoImage from "../assets/john-logo.png";
import { resetPassword } from "../services/authApi";
import "../styles/authPages.css";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Password reset token is missing.");
      return;
    }

    if (!formData.newPassword || !formData.confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const data = await resetPassword(token, formData.newPassword);
      setMessage(data.message || "Password reset successfully.");

      setTimeout(() => {
        navigate("/signin");
      }, 1800);
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-left">
          <span className="auth-badge">Reset Password</span>
          <h1 className="auth-title">Choose a New Password</h1>
          <p className="auth-subtitle">
            Your new password must contain at least 8 characters, one uppercase
            letter, one lowercase letter, and one symbol.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="newPassword">New Password</label>

              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="auth-input password-input"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="auth-input"
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            {message && (
              <p
                style={{
                  color: "#166534",
                  background: "#dcfce7",
                  padding: "12px",
                  borderRadius: "12px",
                  fontWeight: "600",
                }}
              >
                {message}
              </p>
            )}

            <button type="submit" className="primary-btn full-width" disabled={loading}>
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
              alt="John Hospitality logo"
              className="logo-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
