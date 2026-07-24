from __future__ import annotations

import unittest

from core.schemas import ActionProposal
from specialists.actions.registry import ActionRegistry


class ActionRegistryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = ActionRegistry()

    def proposal(self, command: str, target=None, value=None) -> ActionProposal:
        return ActionProposal(
            command=command, target=target, value=value, language="en", confidence=1
        )

    def test_login_email_is_authorized_as_draft_update(self) -> None:
        result = self.registry.route(
            self.proposal("SET_FIELD", "email", "person@example.com"), "login"
        )
        self.assertEqual("authorized", result.status)
        self.assertEqual("set_field", result.action["type"])
        self.assertFalse(result.sensitive)

    def test_email_draft_is_not_validated_by_action_master(self) -> None:
        result = self.registry.route(
            self.proposal("SET_FIELD", "email", "not-email"), "login"
        )
        self.assertEqual("authorized", result.status)
        self.assertEqual("not-email", result.action["value"])

    def test_password_is_marked_sensitive(self) -> None:
        result = self.registry.route(
            self.proposal("SET_FIELD", "password", "Pass123!@#"), "login"
        )
        self.assertEqual("authorized", result.status)
        self.assertTrue(result.sensitive)

    def test_submit_requires_confirmation(self) -> None:
        result = self.registry.route(self.proposal("PRESS", "sign_in"), "login")
        self.assertEqual("needs_confirmation", result.status)
        self.assertEqual("sign_in", result.action["target"])

    def test_signup_role_is_limited_to_registered_options(self) -> None:
        result = self.registry.route(
            self.proposal("SELECT_OPTION", "account_type", "admin"), "signup"
        )
        self.assertEqual("invalid_value", result.status)

    def test_control_from_other_page_is_unavailable(self) -> None:
        result = self.registry.route(
            self.proposal("SET_FIELD", "username", "fouad"), "login"
        )
        self.assertEqual("unavailable", result.status)

    def test_candidate_matching_button_is_authorized(self) -> None:
        result = self.registry.route(
            self.proposal("PRESS", "run_job_match"), "candidate"
        )
        self.assertEqual("authorized", result.status)
        self.assertEqual("press", result.action["type"])

    def test_candidate_disability_must_be_a_registered_option(self) -> None:
        accepted = self.registry.route(
            self.proposal("TOGGLE_OPTION", "disabilities", "Wheelchair"), "candidate"
        )
        rejected = self.registry.route(
            self.proposal("TOGGLE_OPTION", "disabilities", "Invented condition"), "candidate"
        )
        self.assertEqual("authorized", accepted.status)
        self.assertEqual("invalid_value", rejected.status)

    def test_candidate_job_resolves_as_bounded_dynamic_action(self) -> None:
        result = self.registry.route(
            self.proposal("OPEN_ITEM", "job", "Ice Cream Maker"), "candidate"
        )
        self.assertEqual("authorized", result.status)
        self.assertEqual("open_item", result.action["type"])

    def test_candidate_application_submit_requires_confirmation(self) -> None:
        result = self.registry.route(
            self.proposal("PRESS", "submit_application"), "candidate"
        )
        self.assertEqual("needs_confirmation", result.status)

    def test_candidate_file_action_only_focuses_registered_picker(self) -> None:
        result = self.registry.route(
            self.proposal("FOCUS_FIELD", "application_document"), "candidate"
        )
        self.assertEqual("authorized", result.status)
        self.assertEqual("focus_field", result.action["type"])

    def test_employer_job_definition_is_dynamic_not_hard_coded(self) -> None:
        result = self.registry.route(
            self.proposal("OPEN_ITEM", "job_definition", "A Future Job Added Later"),
            "employer",
        )
        self.assertEqual("authorized", result.status)
        self.assertEqual("A Future Job Added Later", result.action["value"])

    def test_employer_task_is_dynamic_not_hard_coded(self) -> None:
        result = self.registry.route(
            self.proposal("TOGGLE_OPTION", "job_task", "A newly imported task"),
            "employer",
        )
        self.assertEqual("authorized", result.status)

    def test_employer_delete_job_preserves_dynamic_target_in_confirmation(self) -> None:
        result = self.registry.route(
            self.proposal("OPEN_ITEM", "delete_job", "Night Receptionist"),
            "employer",
        )
        self.assertEqual("needs_confirmation", result.status)
        self.assertEqual("Night Receptionist", result.action["value"])
        self.assertEqual("open_item", result.action["type"])

    def test_employer_application_status_change_requires_confirmation(self) -> None:
        result = self.registry.route(
            self.proposal("OPEN_ITEM", "accept_application", "candidate@example.com"),
            "employer",
        )
        self.assertEqual("needs_confirmation", result.status)

    def test_admin_user_is_dynamic_not_hard_coded(self) -> None:
        result = self.registry.route(
            self.proposal("OPEN_ITEM", "edit_user", "future.user@example.com"),
            "admin",
        )
        self.assertEqual("authorized", result.status)
        self.assertEqual("future.user@example.com", result.action["value"])

    def test_admin_delete_user_requires_high_risk_confirmation(self) -> None:
        result = self.registry.route(
            self.proposal("OPEN_ITEM", "delete_user", "future-user"),
            "admin",
        )
        self.assertEqual("needs_confirmation", result.status)
        self.assertEqual("future-user", result.action["value"])

    def test_employer_control_is_unavailable_in_admin_context(self) -> None:
        result = self.registry.route(
            self.proposal("PRESS", "submit_job"),
            "admin",
        )
        self.assertEqual("unavailable", result.status)


if __name__ == "__main__":
    unittest.main()
