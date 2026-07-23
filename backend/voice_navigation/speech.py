from __future__ import annotations

from openai import OpenAI


class OpenAISpeechGenerator:
    def __init__(self, client: OpenAI, model: str, voice: str) -> None:
        self._client = client
        self._model = model
        self._voice = voice

    def generate(self, text: str, language: str) -> bytes:
        response = self._client.audio.speech.create(
            model=self._model,
            voice=self._voice,
            input=text,
            instructions=f"Speak clearly in language {language}. This is accessible navigation feedback.",
            response_format="mp3",
        )
        return response.read()
