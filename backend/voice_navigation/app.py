from __future__ import annotations

import json

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from openai import OpenAI
from pydantic import ValidationError

from config import Settings
from interpretation import OpenAIIntentInterpreter
from registry import CommandRegistry
from service import VoiceNavigationService
from speech import OpenAISpeechGenerator
from transcription import OpenAITranscriber


def create_app(settings: Settings | None = None) -> Flask:
    active_settings = settings or Settings()
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = active_settings.max_audio_bytes
    CORS(app, origins=[active_settings.allowed_origin])

    registry = CommandRegistry()
    client = OpenAI(api_key=active_settings.openai_api_key) if active_settings.openai_configured else None

    def require_client() -> OpenAI:
        if client is None:
            raise RuntimeError("OPENAI_API_KEY is not configured.")
        return client

    @app.get("/health")
    def health() -> tuple[Response, int]:
        return jsonify(
            {
                "status": "ok",
                "service": "voice-navigation",
                "registryVersion": registry.version,
                "openaiConfigured": active_settings.openai_configured,
            }
        ), 200

    @app.post("/api/voice/interpret")
    def interpret() -> tuple[Response, int]:
        data = request.get_json(silent=True) or {}
        history = data.get("history", [])
        if not isinstance(history, list):
            raise ValueError("History must be a list.")
        service = _service(require_client(), active_settings, registry)
        result = service.interpret_text(
            str(data.get("transcript", "")),
            str(data.get("currentContext", "landing")),
            history,
        )
        _trace_result(result, str(data.get("currentContext", "landing")))
        return jsonify(result.model_dump()), 200

    @app.post("/api/voice/process")
    def process() -> tuple[Response, int]:
        uploaded = request.files.get("audio")
        if uploaded is None or not uploaded.filename:
            return jsonify({"error": "audio_required", "message": "An audio file is required."}), 400
        audio = uploaded.read()
        if not audio:
            return jsonify({"error": "empty_audio", "message": "The uploaded audio is empty."}), 400
        spoken_language = request.form.get("spokenLanguage", "en").lower()
        if spoken_language not in {"en", "ar"}:
            return jsonify(
                {
                    "error": "unsupported_language",
                    "message": "Spoken language must be 'en' or 'ar'.",
                }
            ), 400
        try:
            history = json.loads(request.form.get("history", "[]"))
        except json.JSONDecodeError as error:
            raise ValueError("History must be valid JSON.") from error
        if not isinstance(history, list):
            raise ValueError("History must be a list.")
        service = _service(require_client(), active_settings, registry)
        result = service.process_audio(
            audio,
            uploaded.filename,
            request.form.get("currentContext", "landing"),
            spoken_language,
            history,
        )
        _trace_result(result, request.form.get("currentContext", "landing"))
        return jsonify(result.model_dump()), 200

    @app.post("/api/voice/speech")
    def speech() -> Response:
        data = request.get_json(silent=True) or {}
        text = " ".join(str(data.get("text", "")).split())
        language = str(data.get("language", "en"))
        if not text:
            return jsonify({"error": "text_required", "message": "Speech text is required."}), 400
        if len(text) > 1000:
            return jsonify({"error": "text_too_long", "message": "Speech text exceeds 1000 characters."}), 400
        generator = OpenAISpeechGenerator(
            require_client(),
            active_settings.speech_model,
            active_settings.speech_voice,
        )
        return Response(generator.generate(text, language), mimetype="audio/mpeg")

    @app.errorhandler(ValueError)
    @app.errorhandler(ValidationError)
    def bad_request(error: Exception) -> tuple[Response, int]:
        return jsonify({"error": "invalid_request", "message": str(error)}), 400

    @app.errorhandler(RuntimeError)
    def unavailable(error: RuntimeError) -> tuple[Response, int]:
        return jsonify({"error": "service_not_configured", "message": str(error)}), 503

    @app.errorhandler(Exception)
    def internal_error(error: Exception) -> tuple[Response, int]:
        app.logger.exception("Voice navigation request failed", exc_info=error)
        return jsonify({"error": "voice_service_error", "message": "Voice processing failed."}), 502

    return app


def _service(
    client: OpenAI, settings: Settings, registry: CommandRegistry
) -> VoiceNavigationService:
    return VoiceNavigationService(
        registry=registry,
        transcriber=OpenAITranscriber(
            client,
            settings.transcription_model,
            settings.transcription_prompt,
        ),
        interpreter=OpenAIIntentInterpreter(client, settings.intent_model),
        max_transcript_chars=settings.max_transcript_chars,
    )


def _trace_result(result, current_context: str) -> None:
    print(
        "[VOICE PIPELINE] "
        + json.dumps(
            {
                "request_id": result.request_id,
                "context": current_context,
                "transcript": result.transcript,
                "language": result.language,
                "proposal": result.proposal.model_dump(),
                "route": result.route.model_dump(),
                "feedback": result.feedback,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )


if __name__ == "__main__":
    configured_settings = Settings()
    create_app(configured_settings).run(
        host=configured_settings.host,
        port=configured_settings.port,
        debug=False,
    )
