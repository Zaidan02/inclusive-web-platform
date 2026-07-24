from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from core.schemas import (
    AuthorizedCommand,
    ClarificationCommand,
    IntentProposal,
    PermissionDeniedCommand,
    RejectedCommand,
)


class NavigationRegistry:
    def __init__(self, path: Path | None = None) -> None:
        registry_path = path or Path(__file__).with_name("registry.json")
        self._data: dict[str, Any] = json.loads(registry_path.read_text(encoding="utf-8"))

    @property
    def version(self) -> int:
        return int(self._data["version"])

    def context_for_prompt(self, current_context: str) -> dict[str, Any]:
        context = self._context(current_context)
        return {
            "context": current_context,
            "commands": context["commands"],
            "allowedNavigationTargets": context["navigationTargets"],
            "allNavigationTargets": list(self._data["pages"]),
            "targetDescriptions": {
                target: page
                for target, page in self._data["pages"].items()
            },
            "sectionTargets": context["sectionTargets"],
        }

    def route(
        self, proposal: IntentProposal, current_context: str
    ) -> AuthorizedCommand | RejectedCommand | PermissionDeniedCommand | ClarificationCommand:
        context = self._context(current_context)
        command = proposal.command
        target = proposal.target

        if command not in context["commands"]:
            return self._reject(proposal, "Command is not available in the current context.")

        if command == "UNKNOWN":
            return self._reject(proposal, "The request is unsupported or ambiguous.")

        if command == "CLARIFY":
            allowed = context["navigationTargets"]
            choices = list(dict.fromkeys(proposal.choices))
            if not choices or any(choice not in allowed for choice in choices):
                return self._reject(proposal, "Clarification choices are not allowed in the current context.")
            question = (proposal.question or "").strip()
            if not question:
                question = "Which page did you mean: " + " or ".join(choices) + "?"
            return ClarificationCommand(
                status="needs_clarification",
                command="CLARIFY",
                choices=choices,
                question=question,
                action={"type": "clarify", "choices": choices},
            )

        if proposal.choices or proposal.question:
            return self._reject(proposal, "Only clarification proposals may include choices or a question.")

        if command == "NAVIGATE":
            if target not in self._data["pages"]:
                return self._reject(proposal, "Navigation target does not exist.")
            if target not in context["navigationTargets"]:
                return PermissionDeniedCommand(
                    status="permission_denied",
                    command="NAVIGATE",
                    target=target,
                    reason="You do not have permission to open that destination.",
                )
            page = self._data["pages"][target]
            action = page.get("action") or {"type": "route", "value": page["path"]}
        elif command == "READ_SECTION":
            if target not in context["sectionTargets"]:
                return self._reject(proposal, "Section target is not allowed in the current context.")
            action = {"type": "read_section", "value": target}
        elif command == "GO_BACK":
            self._require_null_target(proposal)
            action = {"type": "history_back", "value": None}
        elif command == "HELP":
            self._require_null_target(proposal)
            action = {"type": "help", "value": current_context}
        elif command == "REPEAT":
            self._require_null_target(proposal)
            action = {"type": "repeat", "value": None}
        elif command == "STOP_SPEAKING":
            self._require_null_target(proposal)
            action = {"type": "stop_speaking", "value": None}
        elif command == "PAUSE_LISTENING":
            self._require_null_target(proposal)
            action = {"type": "pause_listening", "value": None}
        elif command == "CANCEL":
            self._require_null_target(proposal)
            action = {"type": "cancel", "value": None}
        elif command == "DISABLE_VOICE":
            self._require_null_target(proposal)
            action = {"type": "disable_voice", "value": None}
        else:
            return self._reject(proposal, "Command has no registered action.")

        risk = int(self._data["commands"][command]["risk"])
        return AuthorizedCommand(
            status="authorized",
            command=command,
            target=target,
            risk=risk,
            action=action,
        )

    def _context(self, current_context: str) -> dict[str, Any]:
        try:
            return self._data["contexts"][current_context]
        except KeyError as exc:
            raise ValueError(f"Unknown voice context: {current_context}") from exc

    @staticmethod
    def _require_null_target(proposal: IntentProposal) -> None:
        if proposal.target is not None:
            raise ValueError(f"{proposal.command} does not accept a target.")

    @staticmethod
    def _reject(proposal: IntentProposal, reason: str) -> RejectedCommand:
        return RejectedCommand(
            status="rejected",
            command=proposal.command,
            target=proposal.target,
            reason=reason,
        )
