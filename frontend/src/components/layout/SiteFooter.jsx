import { Link } from "react-router-dom";
import Brand from "../common/Brand";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="landing-container site-footer__grid">
        <div className="site-footer__intro"><Brand light /><p>Opening hospitality to ability, potential, and meaningful work.</p></div>
        <div><strong>Platform</strong><a href="#purpose">Our purpose</a><a href="#how-it-works">How it works</a><a href="#paths">Get started</a></div>
        <div><strong>Account</strong><Link to="/signin">Sign in</Link><Link to="/signup?role=candidate">Candidate account</Link><Link to="/signup?role=employer">Employer account</Link></div>
        <div><strong>Inclusion</strong><span>Ability-first matching</span><span>Accessible opportunities</span><span>Inclusive hospitality</span></div>
      </div>
      <div className="landing-container site-footer__bottom"><span>© {new Date().getFullYear()} JoIn Hospitality</span><span>Designed for a more inclusive world of work.</span></div>
    </footer>
  );
}
