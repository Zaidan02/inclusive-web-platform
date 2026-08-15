import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

const pageTitleKeys = {
  "/": "routes.home",
  "/signin": "routes.signin",
  "/signup": "routes.signup",
  "/forgot-password": "routes.forgotPassword",
  "/reset-password": "routes.resetPassword",
  "/employers": "routes.employers",
  "/voice-help": "routes.voiceHelp",
  "/privacy": "routes.privacy",
  "/candidate": "routes.candidate",
  "/candidate/setup": "routes.candidateSetup",
  "/employer": "routes.employer",
  "/admin": "routes.admin",
  "/verifier": "routes.verifier",
};

export default function RouteAccessibility() {
  const location = useLocation();
  const { t, i18n } = useTranslation("common");
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    document.title = t(pageTitleKeys[location.pathname] || "routes.home");
    if (previousPathRef.current === location.pathname) return;
    previousPathRef.current = location.pathname;
    const content = document.querySelector("#main-content main") || document.getElementById("main-content");
    if (!content) return;
    content.setAttribute("tabindex", "-1");
    content.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [i18n.resolvedLanguage, location.pathname, t]);

  return null;
}
