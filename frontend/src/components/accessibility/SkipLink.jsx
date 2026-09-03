import { useTranslation } from "react-i18next";

export default function SkipLink() {
  const { t } = useTranslation("common");

  function moveToMain(event) {
    const main = document.querySelector("#main-content main") || document.getElementById("main-content");
    if (!main) return;
    event.preventDefault();
    main.setAttribute("tabindex", "-1");
    main.focus();
  }

  return (
    <a className="skip-link" href="#main-content" onClick={moveToMain}>
      {t("accessibility.skipToMain")}
    </a>
  );
}
