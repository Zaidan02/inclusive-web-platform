import { useEffect } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "audio[controls]",
  "video[controls]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const textInputTypes = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

function isVisible(element) {
  return element.getClientRects().length > 0
    && element.getAttribute("aria-hidden") !== "true"
    && element.tabIndex >= 0;
}

function canLeaveWithArrow(element, direction) {
  if (!(element instanceof HTMLElement)) return true;
  if (element.closest("[data-arrow-navigation='off']")) return false;
  if (element.isContentEditable) return false;

  const tagName = element.tagName.toLowerCase();
  if (tagName === "select" || tagName === "audio" || tagName === "video") return false;

  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    if (["radio", "range", "date", "datetime-local", "month", "time", "week", "color"].includes(type)) {
      return false;
    }
    if (!textInputTypes.has(type)) return true;

    const start = element.selectionStart;
    const end = element.selectionEnd;
    if (start === null || end === null || start !== end) return false;
    return direction > 0 ? end === element.value.length : start === 0;
  }

  if (element instanceof HTMLTextAreaElement) {
    if (element.selectionStart !== element.selectionEnd) return false;
    return direction > 0
      ? element.selectionEnd === element.value.length
      : element.selectionStart === 0;
  }

  return !element.closest(
    "[role='combobox'], [role='listbox'], [role='menu'], [role='menubar'], "
      + "[role='radio'], [role='slider'], [role='spinbutton'], [role='tree']",
  );
}

export default function ArrowKeyFocusNavigation() {
  useEffect(() => {
    function handleArrowNavigation(event) {
      if (
        event.defaultPrevented
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || event.shiftKey
        || !["ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        return;
      }

      const direction = event.key === "ArrowRight" ? 1 : -1;
      const activeElement = document.activeElement;
      if (!canLeaveWithArrow(activeElement, direction)) return;

      const activeDialog = document.querySelector("[role='dialog'][aria-modal='true']");
      const scope = activeDialog || document;
      const controls = [...scope.querySelectorAll(focusableSelector)].filter(isVisible);
      if (!controls.length) return;

      const currentIndex = controls.indexOf(activeElement);
      let nextIndex = currentIndex + direction;

      if (currentIndex < 0) {
        nextIndex = direction > 0 ? 0 : controls.length - 1;
      } else if (activeDialog) {
        nextIndex = (nextIndex + controls.length) % controls.length;
      } else if (nextIndex < 0 || nextIndex >= controls.length) {
        return;
      }

      event.preventDefault();
      controls[nextIndex]?.focus();
    }

    document.addEventListener("keydown", handleArrowNavigation);
    return () => document.removeEventListener("keydown", handleArrowNavigation);
  }, []);

  return null;
}
