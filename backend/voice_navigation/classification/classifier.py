from __future__ import annotations

from openai import OpenAI

from core.schemas import RequestClassification


class OpenAIRequestClassifier:
    """Classify a transcript without deciding whether it is valid or permitted."""

    def __init__(self, client: OpenAI, model: str) -> None:
        self._client = client
        self._model = model

    def classify(self, transcript: str, current_context: dict | None = None) -> RequestClassification:
        response = self._client.responses.parse(
            model=self._model,
            instructions=(
                "Classify one multilingual JoIn website voice request into exactly one category. "
                "NAVIGATION means moving to a page or section, going back, reading a registered "
                "section, requesting navigation help, repeating feedback, or controlling the voice "
                "session with stop, pause, cancel, or disable. WEBSITE_QUESTION means asking for "
                "information or an explanation about JoIn, the website, a page, field, process, job, "
                "score, or account. ACTION means asking the website to manipulate a form, select an "
                "item, run matching, save, submit, publish, update, upload, download, accept, reject, "
                "archive, restore, or delete. Classify only intent type. Do not judge whether the "
                "request is logical, supported, safe, authorized, or possible. Return the transcript "
                "language as a short BCP 47 tag. Context matters when words overlap: if the user is "
                "already on a page and refers to one of its supplied action controls, classify it as "
                "ACTION. For example, 'sign in' on the login page means pressing the sign-in button, "
                "while 'take me to sign in' from another page means NAVIGATION. Opening, choosing, "
                "selecting, or 'taking me to' a currently rendered dynamic item such as the first "
                "job, second match, application, or company is ACTION, not NAVIGATION. Scrolling "
                "the current viewport is NAVIGATION."
            ),
            input=f"Current page controls: {current_context or {}}\nTranscript: {transcript}",
            text_format=RequestClassification,
        )
        if response.output_parsed is None:
            raise ValueError("The request classifier did not return a classification.")
        return response.output_parsed
