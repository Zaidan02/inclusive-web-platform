from __future__ import annotations

from uuid import uuid4

from audio.transcription import OpenAITranscriber
from classification.classifier import OpenAIRequestClassifier
from core.schemas import AnsweredQuestion, RequestClassification, SpecialistUnavailable, VoiceTurnResult
from specialists.actions.interpreter import OpenAIActionInterpreter
from specialists.actions.registry import ActionRegistry
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
        action_registry: ActionRegistry,
        action_interpreter: OpenAIActionInterpreter,
        max_transcript_chars: int,
        question_answerer=None,
    ) -> None:
        self._transcriber = transcriber
        self._classifier = classifier
        self._navigation_registry = navigation_registry
        self._navigation_interpreter = navigation_interpreter
        self._action_registry = action_registry
        self._action_interpreter = action_interpreter
        self._max_transcript_chars = max_transcript_chars
        self._question_answerer = question_answerer

    def interpret_text(
        self,
        transcript: str,
        current_context: str,
        recent_history: list[dict] | None = None,
        current_view: str | None = None,
        page_context: dict | None = None,
    ) -> VoiceTurnResult:
        normalized = " ".join(transcript.split())
        if not normalized:
            raise ValueError("Transcript is required.")
        if len(normalized) > self._max_transcript_chars:
            raise ValueError(f"Transcript exceeds {self._max_transcript_chars} characters.")

        history = self._sanitize_history(recent_history or [])
        if self._is_pending_action_reply(normalized, history):
            classification = RequestClassification(
                category="ACTION", confidence=1, language=self._reply_language(normalized)
            )
        else:
            classification = self._classifier.classify(
                normalized,
                self._action_registry.context_for_prompt(current_context),
            )

        if classification.category == "WEBSITE_QUESTION":
            if self._question_answerer is not None:
                answer = self._question_answerer.answer(normalized, page_context, history)
                return VoiceTurnResult(
                    request_id=str(uuid4()),
                    transcript=normalized,
                    language=classification.language,
                    classification=classification,
                    route=AnsweredQuestion(
                        status="answered",
                        category="WEBSITE_QUESTION",
                        grounded=answer.grounded,
                        answer=answer.answer,
                    ),
                    feedback=answer.answer,
                )
            label = "Website questions"
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

        if classification.category == "ACTION":
            action_context = self._action_registry.context_for_prompt(current_context)
            action_context["currentView"] = current_view
            proposal = self._action_interpreter.interpret(normalized, action_context, history)
            route = self._action_registry.route(proposal, current_context)
            feedback = self._action_feedback(route, proposal.language)
            return VoiceTurnResult(
                request_id=str(uuid4()),
                transcript=normalized,
                language=proposal.language,
                classification=classification,
                proposal=proposal,
                route=route,
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

    @staticmethod
    def _action_feedback(route, language: str = "en") -> str:
        locale = language.split("-")[0].lower()
        messages = {
            "en": {
                "confirmation": "Please confirm the requested action.",
                "rejected": "I could not safely perform that action.",
                "confirmed": "Confirmed.",
                "cancelled": "The pending action was cancelled.",
                "executing": "Executing the requested action.",
                "file": "The file control is focused. Use the file picker to choose a local file.",
                "changed": "I changed the requested selection. Is that correct?",
                "cleared": "I cleared the requested field. Is that correct?",
                "sensitive": "I updated the sensitive field without reading it aloud. Is that correct?",
                "updated": "I updated the requested field. Is that correct?",
            },
            "fr": {
                "confirmation": "Veuillez confirmer l’action demandée.",
                "rejected": "Je n’ai pas pu exécuter cette action en toute sécurité.",
                "confirmed": "Confirmé.",
                "cancelled": "L’action en attente a été annulée.",
                "executing": "Exécution de l’action demandée.",
                "file": "Le contrôle de fichier est sélectionné. Utilisez le sélecteur pour choisir un fichier local.",
                "changed": "J’ai modifié la sélection demandée. Est-ce correct ?",
                "cleared": "J’ai effacé le champ demandé. Est-ce correct ?",
                "sensitive": "J’ai mis à jour le champ sensible sans le lire à voix haute. Est-ce correct ?",
                "updated": "J’ai mis à jour le champ demandé. Est-ce correct ?",
            },
            "ar": {
                "confirmation": "يرجى تأكيد العملية المطلوبة.",
                "rejected": "لم أتمكن من تنفيذ هذه العملية بأمان.",
                "confirmed": "تم التأكيد.",
                "cancelled": "تم إلغاء العملية المعلقة.",
                "executing": "جارٍ تنفيذ العملية المطلوبة.",
                "file": "تم تحديد عنصر الملف. استخدم منتقي الملفات لاختيار ملف من جهازك.",
                "changed": "غيّرت الخيار المطلوب. هل هذا صحيح؟",
                "cleared": "مسحت الحقل المطلوب. هل هذا صحيح؟",
                "sensitive": "حدّثت الحقل الحساس من دون قراءته بصوت عالٍ. هل هذا صحيح؟",
                "updated": "حدّثت الحقل المطلوب. هل هذا صحيح؟",
            },
        }.get(locale)
        messages = messages or {
            "confirmation": "Please confirm the requested action.",
            "rejected": "I could not safely perform that action.",
            "confirmed": "Confirmed.",
            "cancelled": "The pending action was cancelled.",
            "executing": "Executing the requested action.",
            "file": "The file control is focused. Use the file picker to choose a local file.",
            "changed": "I changed the requested selection. Is that correct?",
            "cleared": "I cleared the requested field. Is that correct?",
            "sensitive": "I updated the sensitive field without reading it aloud. Is that correct?",
            "updated": "I updated the requested field. Is that correct?",
        }
        if route.status == "needs_confirmation":
            return messages["confirmation"]
        if route.status != "authorized":
            return messages["rejected"]
        if route.command == "CONFIRM":
            return messages["confirmed"]
        if route.command == "CANCEL_ACTION":
            return messages["cancelled"]
        action = route.action
        if route.command == "PRESS":
            return messages["executing"]
        if route.command == "OPEN_ITEM":
            return messages["executing"]
        if route.command == "FOCUS_FIELD":
            return messages["file"]
        if route.command == "TOGGLE_OPTION":
            return messages["changed"]
        if route.command == "CLEAR_FIELD":
            return messages["cleared"]
        if route.sensitive:
            return messages["sensitive"]
        return messages["updated"]

    def process_audio(
        self,
        audio: bytes,
        filename: str,
        current_context: str,
        spoken_language: str | None = None,
        recent_history: list[dict] | None = None,
        current_view: str | None = None,
        page_context: dict | None = None,
    ) -> VoiceTurnResult:
        transcript = self._transcriber.transcribe(audio, filename, spoken_language)
        return self.interpret_text(
            transcript,
            current_context,
            recent_history,
            current_view,
            page_context,
        )

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

    @staticmethod
    def _is_pending_action_reply(transcript: str, history: list[dict]) -> bool:
        if not history or history[-1].get("status") != "needs_confirmation":
            return False
        normalized = transcript.strip().casefold().rstrip(".!?")
        return normalized in {
            "yes",
            "confirm",
            "proceed",
            "do it",
            "نعم",
            "أجل",
            "اكد",
            "أكد",
            "تابع",
            "oui",
            "confirmer",
            "confirme",
            "continuer",
            "continue",
            "no",
            "cancel",
            "never mind",
            "don't",
            "do not",
            "لا",
            "الغاء",
            "إلغاء",
            "non",
            "annuler",
            "annule",
            "laisse tomber",
        }

    @staticmethod
    def _contains_arabic(text: str) -> bool:
        return any("\u0600" <= character <= "\u06ff" for character in text)

    @classmethod
    def _reply_language(cls, text: str) -> str:
        if cls._contains_arabic(text):
            return "ar"
        normalized = text.strip().casefold().rstrip(".!?")
        if normalized in {
            "oui",
            "confirmer",
            "confirme",
            "continuer",
            "continue",
            "non",
            "annuler",
            "annule",
            "laisse tomber",
        }:
            return "fr"
        return "en"
