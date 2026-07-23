from __future__ import annotations

from io import BytesIO

from openai import OpenAI


class OpenAITranscriber:
    def __init__(self, client: OpenAI, model: str, prompt: str = "") -> None:
        self._client = client
        self._model = model
        self._prompt = prompt

    def transcribe(self, audio: bytes, filename: str, language: str | None = None) -> str:
        audio_file = BytesIO(audio)
        audio_file.name = filename
        request = {
            "model": self._model,
            "file": audio_file,
        }
        if self._prompt:
            request["prompt"] = self._prompt
        if language:
            request["language"] = language
        result = self._client.audio.transcriptions.create(
            **request,
        )
        transcript = result.text.strip()
        if not transcript:
            raise ValueError("No speech was detected in the uploaded audio.")
        return transcript
