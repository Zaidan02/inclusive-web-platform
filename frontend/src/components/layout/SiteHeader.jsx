import { Link } from "react-router-dom";
import Brand from "../common/Brand";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="landing-container site-header__inner">
        <Brand />
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#purpose">Our purpose</a>
          <a href="#how-it-works">How it works</a>
          <a href="#paths">For you</a>
          <Link to="/employers">For employers</Link>
        </nav>
        <div className="site-header__actions">
          <Link className="text-link" to="/signin">Sign in</Link>
          <Link className="button button--small button--primary" to="/signup">Sign up</Link>
        </div>
      </div>
    </header>
  );
}
