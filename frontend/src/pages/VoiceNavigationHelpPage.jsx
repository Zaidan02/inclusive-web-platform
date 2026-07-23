import { Link } from "react-router-dom";
import "../styles/voiceHelp.css";

const commandGroups = [
  {
    title: "Move around",
    commands: [
      ["Take me to the login page", "Open an available page"],
      ["Go back", "Return to the previous page"],
      ["Read this section", "Read available page content"],
    ],
  },
  {
    title: "Control the conversation",
    commands: [
      ["Stop talking", "Interrupt spoken feedback"],
      ["Pause listening", "Temporarily stop the microphone"],
      ["Cancel that", "Discard the current request"],
      ["Repeat that", "Hear the last response again"],
    ],
  },
  {
    title: "Control voice mode",
    commands: [
      ["Help", "Open this command tutorial"],
      ["Turn off voice navigation", "Stop voice mode completely"],
      ["Resume button", "Restart after pausing"],
    ],
  },
];

export default function VoiceNavigationHelpPage() {
  return (
    <main className="voice-help" data-voice-section="voice-help">
      <div className="voice-help__shell">
        <Link className="voice-help__back" to="/">← Back to JoIn</Link>
        <header className="voice-help__hero">
          <span>Voice navigation mini tutorial</span>
          <h1>Speak naturally, using a few clear phrases.</h1>
          <p>
            You do not need to memorize a dictionary. Start with the phrases below;
            similar wording such as “be quiet,” “main page,” or “never mind” is also understood.
            If more than one safe destination fits, JoIn will ask a short follow-up question.
          </p>
        </header>

        <section className="voice-help__steps" aria-label="How voice navigation works">
          <article><b>1</b><h2>Choose your language</h2><p>Select English or Arabic before speaking.</p></article>
          <article><b>2</b><h2>Say one request</h2><p>Use a short sentence and pause when you finish.</p></article>
          <article><b>3</b><h2>Listen or interrupt</h2><p>Use the visible controls whenever speech or processing is active.</p></article>
        </section>

        <section className="voice-help__commands">
          {commandGroups.map((group) => (
            <article key={group.title}>
              <h2>{group.title}</h2>
              <dl>
                {group.commands.map(([phrase, result]) => (
                  <div key={phrase}>
                    <dt>“{phrase}”</dt>
                    <dd>{result}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </section>

        <aside className="voice-help__note">
          <strong>Important for this version</strong>
          <p>
            When listening is paused, the microphone is genuinely stopped and cannot hear
            “resume.” Use the visible Resume button. While the system is speaking or processing,
            use the displayed Stop talking or Cancel button for an immediate interruption.
          </p>
        </aside>
        <aside className="voice-help__note voice-help__note--conversation">
          <strong>Short conversational follow-ups</strong>
          <p>
            If JoIn asks “Did you mean login or sign up?”, you can answer “the first one,”
            “login,” “no,” or “never mind.” Only the six most recent turns are held temporarily
            in this browser session, and the history is cleared when voice mode is turned off.
          </p>
        </aside>
      </div>
    </main>
  );
}
