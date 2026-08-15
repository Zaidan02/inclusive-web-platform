import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Brand from "../common/Brand";

export default function SiteHeader() {
  const { t } = useTranslation("public");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function handleEscape(event) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="landing-container site-header__inner">
        <Brand />
        <button
          ref={menuButtonRef}
          className="site-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
          <span>{menuOpen ? t("header.closeMenu") : t("header.menu")}</span>
        </button>
        <nav id="site-navigation" className={`site-nav ${menuOpen ? "site-nav--open" : ""}`} aria-label={t("header.navigation")}>
          <a href="#purpose" onClick={closeMenu}>{t("header.purpose")}</a>
          <a href="#how-it-works" onClick={closeMenu}>{t("header.how")}</a>
          <a href="#paths" onClick={closeMenu}>{t("header.forYou")}</a>
          <Link to="/employers" onClick={closeMenu}>{t("header.employers")}</Link>
        </nav>
        <div className="site-header__actions">
          <Link className="text-link" to="/signin">{t("header.signIn")}</Link>
          <Link className="button button--small button--primary" to="/signup">{t("header.signUp")}</Link>
        </div>
      </div>
    </header>
  );
}
