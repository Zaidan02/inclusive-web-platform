import { Link } from "react-router-dom";
import Brand from "../components/common/Brand";
import ArrowIcon from "../components/common/ArrowIcon";
import "../styles/employersPage.css";

export default function EmployersPage() {
  return (
    <main className="employers-placeholder">
      <header className="employers-placeholder__header">
        <Brand />
        <Link to="/" className="employers-placeholder__home">Back to home</Link>
      </header>
      <section className="employers-placeholder__content">
        <div className="employers-placeholder__visual" aria-hidden="true">
          <span>🏗</span>
          <i /><i /><i />
        </div>
        <span className="employers-placeholder__eyebrow">For employers</span>
        <h1>This page is under construction.</h1>
        <p>We’re preparing a dedicated space explaining inclusive hiring, task-based job creation, and how JoIn helps employers discover ability-led talent.</p>
        <div className="employers-placeholder__actions">
          <Link to="/signup?role=employer" className="button button--primary">Create an employer account <ArrowIcon /></Link>
          <Link to="/signin" className="button button--secondary">Employer sign in</Link>
        </div>
        <small>The employer dashboard remains available to registered employer accounts after sign in.</small>
      </section>
    </main>
  );
}
