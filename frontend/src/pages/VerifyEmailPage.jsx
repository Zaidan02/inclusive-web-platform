import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../services/authApi";
import AuthUtilityBar from "../components/layout/AuthUtilityBar";
import "../styles/authPages.css";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("auth");
  const token = searchParams.get("token");
  const [state, setState] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState("");
  const statusRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    verifyEmail(token)
      .then(() => {
        if (!active) return;
        setState("success");
        setMessage("");
      })
      .catch(() => {
        if (!active) return;
        setState("error");
        setMessage("");
      })
      .finally(() => window.requestAnimationFrame(() => statusRef.current?.focus()));
    return () => { active = false; };
  }, [token]);

  return (
    <main className="auth-page signup-page">
      <div className="signup-card">
        <div className="signup-card-stripe"></div>
        <AuthUtilityBar />
        <div className="signup-header">
          <span className="auth-badge signup-badge">JoIn Hospitality</span>
          <h1 className="signup-title">{t("emailVerification.title")}</h1>
          <p className="signup-subtitle">{t("emailVerification.subtitle")}</p>
        </div>
        <p
          ref={statusRef}
          className={state === "error" ? "auth-error" : "auth-success"}
          role={state === "error" ? "alert" : "status"}
          aria-live="polite"
          tabIndex={-1}
        >
          {state === "loading"
            ? t("emailVerification.loading")
            : state === "success"
            ? message || t("emailVerification.success")
            : token
            ? t("emailVerification.error")
            : t("emailVerification.missing")}
        </p>
        {state === "success" ? (
          <Link to="/signin" className="primary-btn primary-btn--full">{t("shared.signIn")}</Link>
        ) : (
          <Link to="/resend-verification" className="primary-btn primary-btn--full">{t("emailVerification.resend")}</Link>
        )}
      </div>
    </main>
  );
}
