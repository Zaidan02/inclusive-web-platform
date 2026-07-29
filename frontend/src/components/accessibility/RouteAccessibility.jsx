import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const pageTitles = {
  "/": "JoIn Hospitality",
  "/signin": "Sign in | JoIn Hospitality",
  "/signup": "Create account | JoIn Hospitality",
  "/forgot-password": "Forgot password | JoIn Hospitality",
  "/reset-password": "Reset password | JoIn Hospitality",
  "/employers": "For employers | JoIn Hospitality",
  "/voice-help": "Voice navigation help | JoIn Hospitality",
  "/candidate": "Candidate dashboard | JoIn Hospitality",
  "/candidate/setup": "Candidate profile setup | JoIn Hospitality",
  "/employer": "Employer dashboard | JoIn Hospitality",
  "/admin": "Admin dashboard | JoIn Hospitality",
};

export default function RouteAccessibility() {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    document.title = pageTitles[location.pathname] || "JoIn Hospitality";
    if (previousPathRef.current === location.pathname) return;
    previousPathRef.current = location.pathname;
    const content = document.querySelector("#main-content main") || document.getElementById("main-content");
    if (!content) return;
    content.setAttribute("tabindex", "-1");
    content.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return null;
}
