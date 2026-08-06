import { Link } from "react-router-dom";
import { PRIVACY_VERSION } from "../privacy";
import "../styles/privacy.css";

const sections = [
  {
    id: "privacy-processing",
    title: "What we process",
    text: "We process account and contact details, candidate profile information, selected abilities, job applications, and documents you choose to upload. Candidate disability cards are used only to verify eligibility and are available only to authorized verifiers and administrators.",
  },
  {
    id: "privacy-retention",
    title: "Disability-card retention",
    text: "Cards are stored outside the public web directory with randomized filenames. After an authorized verifier records a decision, the card is scheduled for deletion after 30 days. The verification result and limited audit record remain so the account can continue to operate.",
  },
  {
    id: "privacy-ai",
    title: "AI-assisted profiles",
    text: "The editable text you approve is sent to the profile assistant only when you give explicit consent. Suggestions are reviewable and never update the profile automatically. The platform records consent and operational event metadata, not the transcript content.",
  },
  {
    id: "privacy-controls",
    title: "Your controls",
    text: "Candidates can download a machine-readable copy of their data, withdraw active AI consent, view card-retention status, and permanently delete their account and private documents from the Privacy & data dashboard.",
  },
  {
    id: "privacy-security",
    title: "Security and access",
    text: "Private documents are served only through authenticated, role-authorized endpoints. Document responses disable browser caching, and access to disability cards is audited.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <nav className="privacy-page__back" aria-label="Privacy page navigation">
        <Link to="/">Back to home</Link>
      </nav>
      <header className="privacy-page__header">
        <span>JoIn Hospitality</span>
        <h1>Privacy notice</h1>
        <p>How we use, protect, retain, and let you control your information.</p>
        <p className="privacy-page__version">Version {PRIVACY_VERSION}</p>
      </header>
      <div className="privacy-page__sections">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id}>{section.title}</h2>
            <p>{section.text}</p>
          </section>
        ))}
      </div>
      <div className="privacy-page__actions">
        <Link className="button button--primary" to="/signup">Return to registration</Link>
        <Link className="button button--secondary" to="/signin">Sign in</Link>
      </div>
    </main>
  );
}
