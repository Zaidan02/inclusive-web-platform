from __future__ import annotations

import unittest

from core.schemas import IntentProposal, RequestClassification
from orchestration.orchestrator import VoiceOrchestrator
from specialists.navigation.registry import NavigationRegistry


class FakeClassifier:
    def __init__(self, category: str) -> None:
        self.category = category

    def classify(self, transcript: str) -> RequestClassification:
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


class OrchestratorDispatchTest(unittest.TestCase):
    def build(self, category: str) -> tuple[VoiceOrchestrator, FakeNavigationInterpreter]:
        navigator = FakeNavigationInterpreter()
        orchestrator = VoiceOrchestrator(
            transcriber=None,
            classifier=FakeClassifier(category),
            navigation_registry=NavigationRegistry(),
            navigation_interpreter=navigator,
            max_transcript_chars=500,
        )
        return orchestrator, navigator

    def test_navigation_dispatches_to_navigation_specialist(self) -> None:
        orchestrator, navigator = self.build("NAVIGATION")
        result = orchestrator.interpret_text("take me to login", "home")
        self.assertEqual(1, navigator.calls)
        self.assertEqual("authorized", result.route.status)
        self.assertEqual("/signin", result.route.action["value"])

    def test_question_does_not_reach_navigation_specialist(self) -> None:
        orchestrator, navigator = self.build("WEBSITE_QUESTION")
        result = orchestrator.interpret_text("how does matching work", "home")
        self.assertEqual(0, navigator.calls)
        self.assertEqual("specialist_unavailable", result.route.status)
        self.assertIsNone(result.proposal)

    def test_action_does_not_reach_navigation_specialist(self) -> None:
        orchestrator, navigator = self.build("ACTION")
        result = orchestrator.interpret_text("save my profile", "candidate")
        self.assertEqual(0, navigator.calls)
        self.assertEqual("specialist_unavailable", result.route.status)
        self.assertIn("action", result.feedback)


if __name__ == "__main__":
    unittest.main()
