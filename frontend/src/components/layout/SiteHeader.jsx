import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Brand from "../common/Brand";
import LanguageSwitcher from "../localization/LanguageSwitcher";

export default function SiteHeader() {
  const { t } = useTranslation("public");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const menuButtonRef = useRef(null);
  const headerRef = useRef(null);
  const groupButtonRefs = useRef({});

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") return;
      if (openGroup) {
        const group = openGroup;
        setOpenGroup(null);
        groupButtonRefs.current[group]?.focus();
        return;
      }
      if (!menuOpen) return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen, openGroup]);

  useEffect(() => {
    function closeOnOutsidePointer(event) {
      if (!headerRef.current?.contains(event.target)) setOpenGroup(null);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
    setOpenGroup(null);
  }

  const groups = [
    {
      id: "candidates",
      label: t("header.candidates"),
      items: [
        { label: t("header.latestJobs"), href: "#opportunities" },
        { label: t("header.candidateHow"), href: "#how-it-works" },
        { label: t("header.candidateAccount"), to: "/signup?role=candidate" },
      ],
    },
    {
      id: "employers",
      label: t("header.employers"),
      items: [
        { label: t("header.employerOverview"), to: "/employers" },
        { label: t("header.employerHow"), href: "#how-it-works" },
        { label: t("header.employerAccount"), to: "/signup?role=employer" },
      ],
    },
    {
      id: "about",
      label: t("header.about"),
      items: [
        { label: t("header.missionVision"), href: "#mission-vision" },
        { label: t("header.purpose"), href: "#purpose" },
        { label: t("header.privacy"), to: "/privacy" },
      ],
    },
  ];

  return (
    <header className="site-header" ref={headerRef}>
      <div className="landing-container site-header__inner">
        <Brand />
        <button
          ref={menuButtonRef}
          className="site-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => {
            setMenuOpen((current) => !current);
            setOpenGroup(null);
          }}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
            {menuOpen
              ? <path d="m4 4 12 12M16 4 4 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              : <path d="M3 5h14M3 10h14M3 15h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
          </svg>
          <span>{menuOpen ? t("header.closeMenu") : t("header.menu")}</span>
        </button>
        <nav id="site-navigation" className={`site-nav ${menuOpen ? "site-nav--open" : ""}`} aria-label={t("header.navigation")}>
          {groups.map((group) => {
            const expanded = openGroup === group.id;
            return (
              <div className="site-nav__group" key={group.id}>
                <button
                  ref={(element) => { groupButtonRefs.current[group.id] = element; }}
                  className="site-nav__trigger"
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`site-nav-${group.id}`}
                  onClick={() => setOpenGroup(expanded ? null : group.id)}
                >
                  {group.label}
                  <svg className="site-nav__chevron" aria-hidden="true" viewBox="0 0 16 16" width="15" height="15">
                    <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div id={`site-nav-${group.id}`} className="site-nav__dropdown" hidden={!expanded}>
                  {group.items.map((item) => item.to
                    ? <Link key={item.label} to={item.to} onClick={closeMenu}>{item.label}</Link>
                    : <a key={item.label} href={item.href} onClick={closeMenu}>{item.label}</a>)}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="site-header__actions">
          <LanguageSwitcher compact />
          <Link className="text-link" to="/signin">{t("header.signIn")}</Link>
          <Link className="button button--small button--primary" to="/signup">{t("header.signUp")}</Link>
        </div>
      </div>
    </header>
  );
}
