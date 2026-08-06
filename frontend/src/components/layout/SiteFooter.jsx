import { Link } from "react-router-dom";
import Brand from "../common/Brand";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="landing-container site-footer__grid">
        <div className="site-footer__intro"><Brand light /><p>Opening hospitality to ability, potential, and meaningful work.</p></div>
        <nav aria-label="Platform"><h2>Platform</h2><a href="#purpose">Our purpose</a><a href="#how-it-works">How it works</a><a href="#paths">Get started</a></nav>
        <nav aria-label="Account"><h2>Account</h2><Link to="/signin">Sign in</Link><Link to="/signup?role=candidate">Candidate account</Link><Link to="/signup?role=employer">Employer account</Link></nav>
        <section aria-labelledby="footer-inclusion-heading"><h2 id="footer-inclusion-heading">Inclusion</h2><span>Ability-first matching</span><span>Accessible opportunities</span><span>Inclusive hospitality</span></section>
      </div>
      <div className="landing-container site-footer__bottom"><span>© {new Date().getFullYear()} JoIn Hospitality</span><span>Designed for a more inclusive world of work.</span></div>
    </footer>
  );
}
