import { Link } from "react-router-dom";
import "../styles/voiceHelp.css";

const commandGroups = [
  {
    title: "Fill authentication forms",
    commands: [
      ["Set my email to name@example.com", "Fill and highlight the current email field"],
      ["Set my username to Fouad", "Fill the signup username field"],
      ["Choose employer", "Select the employer signup account type"],
      ["Sign in", "Ask before submitting the login form"],
      ["Yes", "Confirm the immediately pending submit action"],
    ],
  },
  {
    title: "Candidate actions",
    commands: [
      ["Get my job match", "Run compatibility matching from the Jobs view"],
      ["Open the second matched job", "Open a loaded result by rank"],
      ["Show the second match explanation", "Expand a loaded result's scoring details"],
      ["Open the Ice Cream Maker job", "Open a loaded job by title"],
      ["Set my education to high school", "Change a profile selection"],
      ["Select Wheelchair as my disability", "Toggle a registered disability option"],
      ["Save my profile", "Save the current candidate profile draft"],
      ["Filter my applications to accepted", "Change the application-status filter"],
      ["Upload my CV", "Focus the file picker so you can choose the local file"],
      ["Submit my application", "Ask before submitting the current application"],
    ],
  },
  {
    title: "Employer actions",
    commands: [
      ["Select the Pastry Chef position", "Resolve a currently loaded job definition"],
      ["Select the task Clean work surfaces", "Toggle a task loaded for the selected position"],
      ["Set accommodation to yes", "Change a registered posting option"],
      ["Post this job", "Ask before publishing or updating the job"],
      ["Edit the Ice Cream Maker job", "Open a loaded employer job for editing"],
      ["Delete the Ice Cream Maker job", "Ask before deleting a loaded job"],
      ["Accept the application from Fouad", "Ask before changing a loaded application"],
      ["Open the candidate profile for Fouad", "Inspect a loaded applicant"],
    ],
  },
  {
    title: "Administrator actions",
    commands: [
      ["Search users for Fouad", "Filter the currently loaded administration view"],
      ["Edit the user candidate@join.local", "Open a loaded user in the edit dialog"],
      ["Archive the user candidate@join.local", "Ask before archiving the loaded account"],
      ["Restore the user candidate@join.local", "Ask before restoring the loaded account"],
      ["Delete the user candidate@join.local", "Ask before permanent deletion"],
      ["Open the candidate profile for candidate@join.local", "Open a loaded candidate profile"],
      ["Set the role filter to employer", "Filter loaded active users"],
    ],
  },
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
      ["Scroll down a bit", "Move down by a bounded part of the current screen"],
      ["Scroll up one page", "Move upward by approximately one screen"],
      ["Scroll to the top", "Move to the beginning of the page"],
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
        <aside className="voice-help__note">
          <strong>Form actions are drafts until you submit</strong>
          <p>
            JoIn reads back ordinary field values and highlights the changed control so you can
            check it. Passwords are never read aloud or shown in voice diagnostics. Signing in
            or creating an account always requires a separate confirmation.
          </p>
        </aside>
      </div>
    </main>
  );
}
