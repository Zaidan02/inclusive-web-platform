from __future__ import annotations

from uuid import uuid4

from audio.transcription import OpenAITranscriber
from classification.classifier import OpenAIRequestClassifier
from core.schemas import SpecialistUnavailable, VoiceTurnResult
from specialists.navigation.feedback import build_feedback
from specialists.navigation.interpreter import OpenAINavigationInterpreter
from specialists.navigation.registry import NavigationRegistry


class VoiceOrchestrator:
    def __init__(
        self,
        transcriber: OpenAITranscriber,
        classifier: OpenAIRequestClassifier,
        navigation_registry: NavigationRegistry,
        navigation_interpreter: OpenAINavigationInterpreter,
        max_transcript_chars: int,
    ) -> None:
        self._transcriber = transcriber
        self._classifier = classifier
        self._navigation_registry = navigation_registry
        self._navigation_interpreter = navigation_interpreter
        self._max_transcript_chars = max_transcript_chars

    def interpret_text(
        self,
        transcript: str,
        current_context: str,
        recent_history: list[dict] | None = None,
    ) -> VoiceTurnResult:
        normalized = " ".join(transcript.split())
        if not normalized:
            raise ValueError("Transcript is required.")
        if len(normalized) > self._max_transcript_chars:
            raise ValueError(f"Transcript exceeds {self._max_transcript_chars} characters.")

        history = self._sanitize_history(recent_history or [])
        classification = self._classifier.classify(normalized)

        if classification.category != "NAVIGATION":
            label = (
                "Website questions"
                if classification.category == "WEBSITE_QUESTION"
                else "Website actions"
            )
            request_kind = classification.category.lower().replace("_", " ")
            article = "an" if request_kind[0] in "aeiou" else "a"
            feedback = (
                f"I understood this as {article} {request_kind}. "
                f"{label} are recognized, but that specialist has not been implemented yet."
            )
            return VoiceTurnResult(
                request_id=str(uuid4()),
                transcript=normalized,
                language=classification.language,
                classification=classification,
                route=SpecialistUnavailable(
                    status="specialist_unavailable",
                    category=classification.category,
                    reason=feedback,
                ),
                feedback=feedback,
            )

        allowed_context = self._navigation_registry.context_for_prompt(current_context)
        proposal = self._navigation_interpreter.interpret(normalized, allowed_context, history)
        route = self._navigation_registry.route(proposal, current_context)
        feedback = build_feedback(proposal, route)
        return VoiceTurnResult(
            request_id=str(uuid4()),
            transcript=normalized,
            language=proposal.language,
            classification=classification,
            proposal=proposal,
            route=route,
            feedback=feedback,
        )

    def process_audio(
        self,
        audio: bytes,
        filename: str,
        current_context: str,
        spoken_language: str | None = None,
        recent_history: list[dict] | None = None,
    ) -> VoiceTurnResult:
        transcript = self._transcriber.transcribe(audio, filename, spoken_language)
        return self.interpret_text(transcript, current_context, recent_history)

    @staticmethod
    def _sanitize_history(history: list[dict]) -> list[dict]:
        safe: list[dict] = []
        for turn in history[-6:]:
            if not isinstance(turn, dict):
                continue
            transcript = " ".join(str(turn.get("transcript", "")).split())[:300]
            command = " ".join(str(turn.get("command", "")).split())[:40]
            target = turn.get("target")
            status = " ".join(str(turn.get("status", "")).split())[:40]
            question = " ".join(str(turn.get("question", "")).split())[:300]
            choices = [
                " ".join(str(choice).split())[:40]
                for choice in (turn.get("choices") or [])[:3]
            ]
            safe.append(
                {
                    "transcript": transcript,
                    "command": command,
                    "target": str(target)[:40] if target is not None else None,
                    "status": status,
                    "question": question or None,
                    "choices": choices,
                }
            )
        return safe
