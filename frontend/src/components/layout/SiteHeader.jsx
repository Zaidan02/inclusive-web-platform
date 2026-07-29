import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Brand from "../common/Brand";

export default function SiteHeader() {
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
          <span>{menuOpen ? "Close menu" : "Menu"}</span>
        </button>
        <nav id="site-navigation" className={`site-nav ${menuOpen ? "site-nav--open" : ""}`} aria-label="Main navigation">
          <a href="#purpose" onClick={closeMenu}>Our purpose</a>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="#paths" onClick={closeMenu}>For you</a>
          <Link to="/employers" onClick={closeMenu}>For employers</Link>
        </nav>
        <div className="site-header__actions">
          <Link className="text-link" to="/signin">Sign in</Link>
          <Link className="button button--small button--primary" to="/signup">Sign up</Link>
        </div>
      </div>
    </header>
  );
}
