from __future__ import annotations

import unittest

from core.schemas import (
    ActionProposal,
    ActionRejected,
    AuthorizedAction,
    IntentProposal,
    RequestClassification,
    WebsiteQuestionAnswer,
)
from specialists.actions.registry import ActionRegistry
from orchestration.orchestrator import VoiceOrchestrator
from specialists.navigation.registry import NavigationRegistry


class FakeClassifier:
    def __init__(self, category: str) -> None:
        self.category = category

    def classify(self, transcript: str, current_context: dict | None = None) -> RequestClassification:
        return RequestClassification(category=self.category, confidence=1, language="en")


class FakeNavigationInterpreter:
    def __init__(self) -> None:
        self.calls = 0

    def interpret(self, transcript: str, allowed_context: dict, history: list[dict]) -> IntentProposal:
        self.calls += 1
        return IntentProposal(
            command="NAVIGATE",
            target="login",
            language="en",
            confidence=1,
        )


class FakeActionInterpreter:
    def __init__(self) -> None:
        self.calls = 0

    def interpret(self, transcript: str, context: dict, history: list[dict]) -> ActionProposal:
        self.calls += 1
        if transcript.casefold() == "yes":
            return ActionProposal(command="CONFIRM", language="en", confidence=1)
        return ActionProposal(command="SET_FIELD", target="email", value="person@example.com", language="en", confidence=1)


class FakeQuestionAnswerer:
    def __init__(self) -> None:
        self.calls = 0
        self.context = None

    def answer(self, question: str, page_context: dict | None, history: list[dict]) -> WebsiteQuestionAnswer:
        self.calls += 1
        self.context = page_context
        return WebsiteQuestionAnswer(answer="The current page says matching uses your saved profile.", grounded=True)


class OrchestratorDispatchTest(unittest.TestCase):
    def build(self, category: str):
        navigator = FakeNavigationInterpreter()
        actor = FakeActionInterpreter()
        questioner = FakeQuestionAnswerer()
        orchestrator = VoiceOrchestrator(
            transcriber=None,
            classifier=FakeClassifier(category),
            navigation_registry=NavigationRegistry(),
            navigation_interpreter=navigator,
            action_registry=ActionRegistry(),
            action_interpreter=actor,
            max_transcript_chars=500,
            question_answerer=questioner,
        )
        return orchestrator, navigator, actor, questioner

    def test_navigation_dispatches_to_navigation_specialist(self) -> None:
        orchestrator, navigator, actor, questioner = self.build("NAVIGATION")
        result = orchestrator.interpret_text("take me to login", "home")
        self.assertEqual(1, navigator.calls)
        self.assertEqual("authorized", result.route.status)
        self.assertEqual("/signin", result.route.action["value"])
        self.assertEqual(0, actor.calls)
        self.assertEqual(0, questioner.calls)

    def test_question_reaches_only_question_master(self) -> None:
        orchestrator, navigator, actor, questioner = self.build("WEBSITE_QUESTION")
        page_context = {"text": "Matching uses your saved profile.", "path": "/candidate"}
        result = orchestrator.interpret_text(
            "how does matching work",
            "candidate",
            page_context=page_context,
        )
        self.assertEqual(0, navigator.calls)
        self.assertEqual("answered", result.route.status)
        self.assertTrue(result.route.grounded)
        self.assertEqual(1, questioner.calls)
        self.assertEqual(page_context, questioner.context)
        self.assertIsNone(result.proposal)
        self.assertEqual(0, actor.calls)

    def test_action_does_not_reach_navigation_specialist(self) -> None:
        orchestrator, navigator, actor, questioner = self.build("ACTION")
        result = orchestrator.interpret_text("set email", "login")
        self.assertEqual(0, navigator.calls)
        self.assertEqual(1, actor.calls)
        self.assertEqual("authorized", result.route.status)
        self.assertEqual("person@example.com", result.route.action["value"])
        self.assertEqual(0, questioner.calls)

    def test_short_yes_after_pending_confirmation_is_an_action(self) -> None:
        orchestrator, navigator, actor, questioner = self.build("NAVIGATION")
        result = orchestrator.interpret_text(
            "yes",
            "login",
            [{"transcript": "sign in", "command": "PRESS", "target": "sign_in", "status": "needs_confirmation"}],
        )
        self.assertEqual("ACTION", result.classification.category)
        self.assertEqual("CONFIRM", result.route.command)
        self.assertEqual(0, navigator.calls)

    def test_french_confirmation_reply_is_recognized_and_language_tagged(self) -> None:
        history = [
            {
                "transcript": "envoyer",
                "command": "PRESS",
                "target": "submit",
                "status": "needs_confirmation",
            }
        ]
        self.assertTrue(VoiceOrchestrator._is_pending_action_reply("oui", history))
        self.assertEqual("fr", VoiceOrchestrator._reply_language("oui"))

    def test_action_confirmation_feedback_uses_french(self) -> None:
        route = ActionRejected(
            status="needs_confirmation",
            command="PRESS",
            target="sign_in",
            reason="English registry reason",
            action={"type": "press", "target": "sign_in", "label": "sign in"},
        )
        self.assertEqual(
            "Veuillez confirmer l’action demandée.",
            VoiceOrchestrator._action_feedback(route, "fr"),
        )

    def test_authorized_action_feedback_uses_arabic(self) -> None:
        route = AuthorizedAction(
            status="authorized",
            command="PRESS",
            target="sign_in",
            risk=1,
            action={"type": "press", "target": "sign_in", "label": "sign in"},
        )
        self.assertEqual(
            "جارٍ تنفيذ العملية المطلوبة.",
            VoiceOrchestrator._action_feedback(route, "ar"),
        )


if __name__ == "__main__":
    unittest.main()
