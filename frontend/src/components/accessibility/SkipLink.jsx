export default function SkipLink() {
  function moveToMain(event) {
    const main = document.querySelector("#main-content main") || document.getElementById("main-content");
    if (!main) return;
    event.preventDefault();
    main.setAttribute("tabindex", "-1");
    main.focus();
  }

  return (
    <a className="skip-link" href="#main-content" onClick={moveToMain}>
      Skip to main content
    </a>
  );
}
