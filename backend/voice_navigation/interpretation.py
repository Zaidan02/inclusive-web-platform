from __future__ import annotations

import json

from openai import OpenAI

from schemas import IntentProposal


class OpenAIIntentInterpreter:
    def __init__(self, client: OpenAI, model: str) -> None:
        self._client = client
        self._model = model

    def interpret(
        self, transcript: str, allowed_context: dict, recent_history: list[dict] | None = None
    ) -> IntentProposal:
        history = (recent_history or [])[-6:]
        response = self._client.responses.parse(
            model=self._model,
            instructions=(
                "You translate multilingual website-navigation requests into one canonical command. "
                "Use only the commands and targets in the supplied context. Never invent a target, "
                "route, selector, URL, or action. Return UNKNOWN with target null when ambiguous or "
                "unsupported. Understand ordinary synonyms: home, homepage, main page, landing page, "
                "start page, and front page all mean the canonical home target. Sign in and log in mean "
                "login; register and create an account mean signup. You may freely understand linguistic "
                "variation, but may output only canonical values supplied in the allowed context. "
                "When a request is a valid navigation request but two or three allowed targets remain "
                "plausible, return CLARIFY with target null, a short natural question, and only those "
                "canonical targets in choices. Do not clarify unsupported actions. Use recent history "
                "only to resolve the latest pending clarification. Replies such as yes, no, first, second, "
                "the login one, neither, or cancel refer only to that pending question. A bare yes without "
                "a pending question is UNKNOWN. Return the language of the transcript as a short BCP 47 tag. "
                "Map 'stop talking', 'be quiet', 'silence', or plain 'stop' to STOP_SPEAKING. "
                "Map 'pause listening', 'hold on', 'wait', or 'give me a moment' to PAUSE_LISTENING. "
                "Map 'cancel that', 'never mind', or 'forget that' to CANCEL. "
                "Map 'turn off voice navigation', 'disable voice mode', or 'goodbye' to DISABLE_VOICE. "
                "Commands GO_BACK, HELP, REPEAT, STOP_SPEAKING, PAUSE_LISTENING, CANCEL, "
                "DISABLE_VOICE, CLARIFY, and UNKNOWN always use target null. Only CLARIFY may contain "
                "choices or question; every other command must return choices [] and question null."
            ),
            input=(
                f"Allowed context:\n{json.dumps(allowed_context, ensure_ascii=False)}\n\n"
                f"Recent structured turns (oldest to newest):\n"
                f"{json.dumps(history, ensure_ascii=False)}\n\n"
                f"Transcript:\n{transcript}"
            ),
            text_format=IntentProposal,
        )
        if response.output_parsed is None:
            raise ValueError("The intent model did not return a command proposal.")
        return response.output_parsed
