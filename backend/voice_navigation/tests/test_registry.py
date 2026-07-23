from __future__ import annotations

import unittest

from registry import CommandRegistry
from schemas import AuthorizedCommand, ClarificationCommand, IntentProposal, RejectedCommand


class CommandRegistryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = CommandRegistry()

    def test_registered_navigation_resolves_trusted_route(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="login", language="ar", confidence=0.9),
            "landing",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual({"type": "route", "value": "/signin"}, result.action)

    def test_model_cannot_invent_navigation_target(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="admin", language="en", confidence=1),
            "landing",
        )
        self.assertIsInstance(result, RejectedCommand)

    def test_section_is_restricted_to_current_context(self) -> None:
        result = self.registry.route(
            IntentProposal(command="READ_SECTION", target="login-form", language="en", confidence=1),
            "landing",
        )
        self.assertIsInstance(result, RejectedCommand)

    def test_unknown_is_safe_rejection(self) -> None:
        result = self.registry.route(
            IntentProposal(command="UNKNOWN", target=None, language="fr", confidence=0.1),
            "landing",
        )
        self.assertIsInstance(result, RejectedCommand)

    def test_local_stop_is_authorized_without_target(self) -> None:
        result = self.registry.route(
            IntentProposal(command="STOP_SPEAKING", target=None, language="en", confidence=1),
            "landing",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual("stop_speaking", result.action["type"])

    def test_pause_listening_is_a_distinct_local_action(self) -> None:
        result = self.registry.route(
            IntentProposal(command="PAUSE_LISTENING", target=None, language="en", confidence=1),
            "landing",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual("pause_listening", result.action["type"])

    def test_disable_voice_is_not_confused_with_stopping_speech(self) -> None:
        result = self.registry.route(
            IntentProposal(command="DISABLE_VOICE", target=None, language="en", confidence=1),
            "landing",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual("disable_voice", result.action["type"])

    def test_clarification_accepts_only_registered_choices(self) -> None:
        result = self.registry.route(
            IntentProposal(
                command="CLARIFY",
                target=None,
                language="en",
                confidence=0.7,
                choices=["login", "signup"],
                question="Did you mean login or sign up?",
            ),
            "landing",
        )
        self.assertIsInstance(result, ClarificationCommand)
        self.assertEqual(["login", "signup"], result.choices)

    def test_clarification_cannot_offer_an_unregistered_destination(self) -> None:
        result = self.registry.route(
            IntentProposal(
                command="CLARIFY",
                target=None,
                language="en",
                confidence=0.5,
                choices=["login", "admin"],
                question="Which one?",
            ),
            "landing",
        )
        self.assertIsInstance(result, RejectedCommand)


if __name__ == "__main__":
    unittest.main()
