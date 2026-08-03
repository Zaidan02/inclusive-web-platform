import { Link } from "react-router-dom";
import { PRIVACY_VERSION } from "../privacy";

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 900, margin: "32px auto", padding: "28px", fontFamily: "Inter, sans-serif", lineHeight: 1.65, color: "#334155" }}>
      <h1 style={{ color: "#0f172a" }}>Privacy notice</h1>
      <p>Version {PRIVACY_VERSION}</p>
      <h2>What we process</h2>
      <p>We process account and contact details, candidate profile information, selected abilities, job applications, and documents you choose to upload. Candidate disability cards are used only to verify eligibility and are available only to authorized verifiers and administrators.</p>
      <h2>Disability-card retention</h2>
      <p>Cards are stored outside the public web directory with randomized filenames. After an authorized verifier records a decision, the card is scheduled for deletion after 30 days. The verification result and limited audit record remain so the account can continue to operate.</p>
      <h2>AI-assisted profiles</h2>
      <p>The editable text you approve is sent to the profile assistant only when you give explicit consent. Suggestions are reviewable and never update the profile automatically. The platform records consent and operational event metadata, not the transcript content.</p>
      <h2>Your controls</h2>
      <p>Candidates can download a machine-readable copy of their data, withdraw active AI consent, view card-retention status, and permanently delete their account and private documents from the Privacy &amp; data dashboard.</p>
      <h2>Security and access</h2>
      <p>Private documents are served only through authenticated, role-authorized endpoints. Document responses disable browser caching, and access to disability cards is audited.</p>
      <p><Link to="/signup">Return to registration</Link></p>
    </main>
  );
}
