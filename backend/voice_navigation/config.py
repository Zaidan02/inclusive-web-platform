from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True, slots=True)
class Settings:
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "").strip()
    transcription_model: str = os.getenv("OPENAI_TRANSCRIPTION_MODEL", "whisper-1")
    transcription_prompt: str = os.getenv(
        "OPENAI_TRANSCRIPTION_PROMPT",
        "JoIn website. Navigation vocabulary: home page, login page, sign-in page, "
        "sign-up page, candidate, employer, administrator, profile, jobs, applications.",
    )
    intent_model: str = os.getenv("OPENAI_INTENT_MODEL", "gpt-5.6-sol")
    speech_model: str = os.getenv("OPENAI_SPEECH_MODEL", "gpt-4o-mini-tts")
    speech_voice: str = os.getenv("OPENAI_SPEECH_VOICE", "cedar")
    host: str = os.getenv("VOICE_HOST", "127.0.0.1")
    port: int = int(os.getenv("VOICE_PORT", "5002"))
    allowed_origin: str = os.getenv("VOICE_ALLOWED_ORIGIN", "http://localhost:5173")
    max_audio_bytes: int = int(os.getenv("VOICE_MAX_AUDIO_BYTES", str(10 * 1024 * 1024)))
    max_transcript_chars: int = int(os.getenv("VOICE_MAX_TRANSCRIPT_CHARS", "500"))

    @property
    def openai_configured(self) -> bool:
        return bool(self.openai_api_key)
