from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from core.schemas import ActionProposal, ActionRejected, AuthorizedAction


class ActionRegistry:
    def __init__(self, path: Path | None = None) -> None:
        registry_path = path or Path(__file__).with_name("registry.json")
        self._data: dict[str, Any] = json.loads(registry_path.read_text(encoding="utf-8"))

    @property
    def version(self) -> int:
        return int(self._data["version"])

    def context_for_prompt(self, current_context: str) -> dict[str, Any]:
        controls = self._controls(current_context)
        return {
            "context": current_context,
            "controls": {
                control_id: {
                    "kind": spec["kind"],
                    "label": spec["label"],
                    "aliases": spec.get("aliases", []),
                    "options": spec.get("options", []),
                }
                for control_id, spec in controls.items()
            },
        }

    def route(
        self, proposal: ActionProposal, current_context: str
    ) -> AuthorizedAction | ActionRejected:
        if proposal.command == "UNKNOWN":
            return self._reject(proposal, "rejected", "The requested action is unsupported or ambiguous.")
        if proposal.command in {"CONFIRM", "CANCEL_ACTION"}:
            return AuthorizedAction(
                status="authorized",
                command=proposal.command,
                target=None,
                risk=0,
                action={"type": proposal.command.lower()},
            )

        controls = self._controls(current_context)
        if proposal.target not in controls:
            return self._reject(proposal, "unavailable", "That control is not available on this page.")
        spec = controls[proposal.target]
        command = proposal.command

        expected_kind = {
            "PRESS": "button",
            "SELECT_OPTION": "select",
            "TOGGLE_OPTION": "multi_select",
            "OPEN_ITEM": "collection",
            "FOCUS_FIELD": "file",
        }.get(command, "field")
        if spec["kind"] != expected_kind:
            return self._reject(proposal, "rejected", "That operation is not valid for this control.")
        if expected_kind in {"field", "select", "multi_select"} and not spec.get("editable", False):
            return self._reject(proposal, "read_only", "That field is read-only.")

        value = proposal.value
        if command in {"SET_FIELD", "SELECT_OPTION", "TOGGLE_OPTION", "OPEN_ITEM"}:
            if value is None or not value.strip():
                return self._reject(proposal, "invalid_value", "A value is required.")
            value = value.strip()
            if spec.get("valueType") == "enum":
                normalized = value.casefold()
                options = {option.casefold(): option for option in spec.get("options", [])}
                if normalized not in options:
                    return self._reject(
                        proposal,
                        "invalid_value",
                        "Choose one of: " + ", ".join(spec.get("options", [])) + ".",
                    )
                value = options[normalized]
            elif spec.get("valueType") == "registered_option":
                options = {option.casefold(): option for option in spec.get("options", [])}
                normalized = value.casefold()
                if normalized not in options:
                    return self._reject(
                        proposal,
                        "invalid_value",
                        "That option is not registered for this control.",
                    )
                value = options[normalized]
        elif command == "CLEAR_FIELD":
            if value is not None:
                return self._reject(proposal, "rejected", "Clearing a field does not accept a value.")
            value = ""
        elif command == "FOCUS_FIELD":
            if value is not None:
                return self._reject(proposal, "rejected", "Focusing a file picker does not accept a value.")
        elif command == "PRESS":
            if value is not None:
                return self._reject(proposal, "rejected", "Pressing a button does not accept a value.")

        sensitive = bool(spec.get("sensitive", False))
        if spec.get("requiresConfirmation", False):
            return ActionRejected(
                status="needs_confirmation",
                command=command,
                target=proposal.target,
                reason=f"Please confirm that you want to {spec['label']}"
                + (f" for {value}" if value else "")
                + ".",
                action={
                    "type": command.lower(),
                    "target": proposal.target,
                    "value": value,
                    "label": spec["label"],
                    "sensitive": sensitive,
                },
            )
        return AuthorizedAction(
            status="authorized",
            command=command,
            target=proposal.target,
            risk=int(spec.get("risk", 0)),
            sensitive=sensitive,
            action={
                "type": command.lower(),
                "target": proposal.target,
                "value": value,
                "label": spec["label"],
                "sensitive": sensitive,
            },
        )

    def _controls(self, current_context: str) -> dict[str, Any]:
        return self._data.get("contexts", {}).get(current_context, {}).get("controls", {})

    @staticmethod
    def _reject(
        proposal: ActionProposal, status: str, reason: str
    ) -> ActionRejected:
        return ActionRejected(
            status=status,
            command=proposal.command,
            target=proposal.target,
            reason=reason,
        )
