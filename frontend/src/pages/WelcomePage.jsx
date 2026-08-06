import { Link } from "react-router-dom";
import heroImage from "../assets/hero.png";
import ArrowIcon from "../components/common/ArrowIcon";
import SiteHeader from "../components/layout/SiteHeader";
import SiteFooter from "../components/layout/SiteFooter";
import "../styles/landing.css";

const steps = [
  { number: "01", title: "Share what you can do", text: "Candidates build an ability-led profile focused on strengths, preferences, and practical potential." },
  { number: "02", title: "Describe the real work", text: "Employers break opportunities into clear tasks and the abilities each task actually requires." },
  { number: "03", title: "Discover better matches", text: "Our platform brings both sides together with transparent, task-based compatibility insights." },
];

const principles = [
  ["Ability first", "We start with strengths and practical capabilities—not labels or assumptions."],
  ["Clear by design", "Jobs, tasks, and expectations are presented in a way people can understand."],
  ["Human at heart", "Technology supports better decisions while people remain at the center."],
];

export default function WelcomePage() {
  return (
    <div className="landing-page">
      <SiteHeader />
      <main>
        <section className="hero-section" id="hero" data-voice-section="hero">
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow"><i /> Inclusive hospitality starts here</span>
              <h1>Opportunity should be shaped by <em>ability.</em></h1>
              <p>JoIn connects candidates and hospitality employers through a clearer, more human way of matching people to the work they can thrive in.</p>
              <div className="hero-actions">
                <Link className="button button--primary" to="/signup?role=candidate">Find your opportunity <ArrowIcon /></Link>
                <a className="button button--secondary" href="#purpose">Explore our purpose</a>
              </div>
              <div className="hero-trust"><span><b>✓</b> Ability-led profiles</span><span><b>✓</b> Task-based matching</span><span><b>✓</b> Inclusive by design</span></div>
            </div>
            <div className="hero-visual">
              <div className="hero-visual__glow" />
              <div className="hero-visual__frame"><img src={heroImage} alt="People connecting through inclusive employment" /></div>
              <div className="floating-card floating-card--top"><span className="floating-icon">✦</span><div><strong>Strengths recognized</strong><small>Potential made visible</small></div></div>
              <div className="floating-card floating-card--bottom"><span className="match-ring">92<small>%</small></span><div><strong>Great match</strong><small>Based on real tasks</small></div></div>
            </div>
          </div>
        </section>

        <section className="purpose-section section" id="purpose" data-voice-section="features">
          <div className="landing-container purpose-grid">
            <div><span className="section-kicker">Why JoIn exists</span><h2>Work becomes more inclusive when we ask a better question.</h2></div>
            <div className="purpose-copy"><p>Instead of asking what someone cannot do, we help employers understand what a person <strong>can contribute</strong>. That shift turns uncertainty into practical opportunity.</p><p>JoIn makes hospitality roles easier to understand by connecting job tasks with real abilities—giving candidates confidence and employers clarity.</p></div>
          </div>
          <div className="landing-container principles-grid">{principles.map(([title, text], i) => <article className="principle-card" key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="process-section section" id="how-it-works" data-voice-section="accessibility">
          <div className="landing-container"><div className="section-heading section-heading--center"><span className="section-kicker">How it works</span><h2>A thoughtful path from potential to opportunity.</h2><p>Simple steps, clearer information, and matching built around the work itself.</p></div>
            <div className="steps-grid">{steps.map((step) => <article className="step-card" key={step.number}><span className="step-number">{step.number}</span><div className="step-line" /><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
          </div>
        </section>

        <section className="paths-section section" id="paths">
          <div className="landing-container"><div className="section-heading section-heading--center"><span className="section-kicker">Choose your path</span><h2>One purpose. Two ways to take part.</h2></div>
            <div className="paths-grid">
              <article className="path-card path-card--candidate"><span className="path-label">For candidates</span><h3>Let your abilities lead the way.</h3><p>Create your profile, understand your strengths, explore suitable roles, and apply with confidence.</p><ul><li>Build an ability-led profile</li><li>Receive compatibility insights</li><li>Explore accessible employers</li></ul><Link className="button button--light" to="/signup?role=candidate">Become a candidate <ArrowIcon /></Link></article>
              <article className="path-card path-card--employer"><span className="path-label">For employers</span><h3>Hire with more clarity and confidence.</h3><p>Describe the work that matters, reach a wider talent pool, and focus hiring decisions on capability.</p><ul><li>Publish task-based opportunities</li><li>Build an inclusive company profile</li><li>Review applications in one place</li></ul><Link className="button button--primary" to="/employers">For employers <ArrowIcon /></Link></article>
            </div>
          </div>
        </section>

        <section className="closing-cta"><div className="landing-container closing-cta__inner"><div><span className="section-kicker section-kicker--light">A more inclusive future of work</span><h2>Ready to turn potential into possibility?</h2><p>Join a community that sees ability first.</p></div><div className="closing-cta__actions"><Link className="button button--light" to="/signup">Create your account <ArrowIcon /></Link><Link className="button button--outline-light" to="/signin">Sign in</Link></div></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
