from __future__ import annotations

import unittest

from core.schemas import AuthorizedCommand, ClarificationCommand, IntentProposal, RejectedCommand
from specialists.navigation.registry import NavigationRegistry


class NavigationRegistryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = NavigationRegistry()

    def test_registered_navigation_resolves_trusted_route(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="login", language="ar", confidence=0.9),
            "home",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual({"type": "route", "value": "/signin"}, result.action)

    def test_expanded_public_navigation_resolves_voice_help(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="voice_help", language="en", confidence=1),
            "home",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual("/voice-help", result.action["value"])

    def test_protected_route_is_registered_but_existing_app_guards_remain_authoritative(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="candidate_dashboard", language="en", confidence=1),
            "home",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual("/candidate", result.action["value"])
        self.assertEqual("route_and_tab", result.action["type"])
        self.assertEqual("JOBS", result.action["tab"])

    def test_candidate_applications_resolves_to_internal_tab(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="candidate_applications", language="en", confidence=1),
            "candidate",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual(
            {"type": "route_and_tab", "value": "/candidate", "tab": "APPLICATIONS"},
            result.action,
        )

    def test_candidate_profile_resolves_to_internal_tab(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="candidate_profile", language="en", confidence=1),
            "candidate",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual("PROFILE", result.action["tab"])

    def test_employer_jobs_resolves_to_internal_tab(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="employer_jobs", language="en", confidence=1),
            "employer",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual(
            {"type": "route_and_tab", "value": "/employer", "tab": "MY_JOBS"},
            result.action,
        )

    def test_employer_profile_resolves_to_internal_tab(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="employer_profile", language="en", confidence=1),
            "employer",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual("PROFILE", result.action["tab"])

    def test_admin_archived_users_resolves_to_internal_tab(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="admin_archived_users", language="en", confidence=1),
            "admin",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual(
            {"type": "route_and_tab", "value": "/admin", "tab": "ARCHIVED_USERS"},
            result.action,
        )

    def test_admin_candidate_profiles_resolves_to_internal_tab(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="admin_candidate_profiles", language="en", confidence=1),
            "admin",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual("USER_PROFILES", result.action["tab"])

    def test_model_cannot_invent_navigation_target(self) -> None:
        result = self.registry.route(
            IntentProposal(command="NAVIGATE", target="secret_console", language="en", confidence=1),
            "home",
        )
        self.assertIsInstance(result, RejectedCommand)

    def test_section_is_restricted_to_current_context(self) -> None:
        result = self.registry.route(
            IntentProposal(command="READ_SECTION", target="login-form", language="en", confidence=1),
            "home",
        )
        self.assertIsInstance(result, RejectedCommand)

    def test_unknown_is_safe_rejection(self) -> None:
        result = self.registry.route(
            IntentProposal(command="UNKNOWN", target=None, language="fr", confidence=0.1),
            "home",
        )
        self.assertIsInstance(result, RejectedCommand)

    def test_local_stop_is_authorized_without_target(self) -> None:
        result = self.registry.route(
            IntentProposal(command="STOP_SPEAKING", target=None, language="en", confidence=1),
            "home",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual("stop_speaking", result.action["type"])

    def test_pause_listening_is_a_distinct_local_action(self) -> None:
        result = self.registry.route(
            IntentProposal(command="PAUSE_LISTENING", target=None, language="en", confidence=1),
            "home",
        )
        self.assertIsInstance(result, AuthorizedCommand)
        self.assertEqual("pause_listening", result.action["type"])

    def test_disable_voice_is_not_confused_with_stopping_speech(self) -> None:
        result = self.registry.route(
            IntentProposal(command="DISABLE_VOICE", target=None, language="en", confidence=1),
            "home",
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
            "home",
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
                choices=["login", "secret_console"],
                question="Which one?",
            ),
            "home",
        )
        self.assertIsInstance(result, RejectedCommand)


if __name__ == "__main__":
    unittest.main()
