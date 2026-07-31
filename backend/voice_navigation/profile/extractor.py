from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from core.schemas import ProfileExtractionResult


class OpenAIProfileExtractor:
    """Extract reviewable suggestions; never persist or score them."""

    def __init__(self, client: OpenAI, model: str) -> None:
        self._client = client
        self._model = model

    def extract(
        self,
        narrative: str,
        language: str,
        existing_profile: dict[str, Any],
        allowed_disabilities: list[dict[str, Any]],
        task_vocabulary: list[dict[str, Any]],
    ) -> ProfileExtractionResult:
        context = self._bounded_context(
            existing_profile,
            allowed_disabilities,
            task_vocabulary,
        )
        response = self._client.responses.parse(
            model=self._model,
            instructions=(
                "You assist a candidate in building a JoIn employment profile. Extract only "
                "reviewable suggestions from the candidate's own narrative. Never diagnose, "
                "infer a disability, infer a medical condition, or infer sensitive information. "
                "Suggest a disability only when the candidate explicitly states it, set "
                "explicit_statement=true, and copy the exact matching name from allowedDisabilities. "
                "Suggest task skills only when the narrative gives evidence that the candidate can "
                "perform that task, and copy task_id, task_name, and job_name exactly from "
                "taskVocabulary. Do not invent catalogue entries. Do not overwrite existing profile "
                "facts unless the narrative explicitly provides a replacement. Put useful statements "
                "that cannot safely map to a controlled field into unmapped_statements. Preserve the "
                "meaning of Arabic, French, or English input. Evidence must be a short paraphrase, "
                "not unsupported reasoning. Return no suggestion when evidence is ambiguous. These "
                "results will be shown to the candidate and remain unsaved until individually accepted."
            ),
            input=(
                f"Declared language: {language}\n"
                f"Controlled context: {json.dumps(context, ensure_ascii=False)}\n"
                f"Candidate narrative: {narrative}"
            ),
            text_format=ProfileExtractionResult,
        )
        if response.output_parsed is None:
            raise ValueError("The profile assistant did not return structured suggestions.")
        return response.output_parsed

    @staticmethod
    def _bounded_context(
        existing_profile: dict[str, Any] | None,
        allowed_disabilities: list[dict[str, Any]] | None,
        task_vocabulary: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        allowed_profile_fields = {
            "firstName",
            "lastName",
            "phone",
            "location",
            "about",
            "educationLevel",
            "selectedDisabilities",
        }
        safe_profile = {
            key: value
            for key, value in (existing_profile or {}).items()
            if key in allowed_profile_fields
        }
        safe_disabilities = []
        for item in (allowed_disabilities or [])[:100]:
            if not isinstance(item, dict):
                continue
            name = " ".join(str(item.get("name", "")).split())[:255]
            if name:
                safe_disabilities.append({"id": item.get("id"), "name": name})

        safe_tasks = []
        for item in (task_vocabulary or [])[:500]:
            if not isinstance(item, dict) or not isinstance(item.get("taskId"), int):
                continue
            task_name = " ".join(str(item.get("taskName", "")).split())[:500]
            job_name = " ".join(str(item.get("jobName", "")).split())[:255]
            if task_name and job_name:
                safe_tasks.append(
                    {
                        "taskId": item["taskId"],
                        "taskName": task_name,
                        "jobName": job_name,
                    }
                )
        return {
            "existingProfile": safe_profile,
            "allowedDisabilities": safe_disabilities,
            "taskVocabulary": safe_tasks,
        }
