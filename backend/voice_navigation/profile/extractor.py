from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from core.schemas import ProfileExtractionResult
from profile.practical_abilities import add_explicit_practical_abilities


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
                "not unsupported reasoning. Use canonical English schema keys, field names, and enum "
                "values, but preserve candidate-provided profile values in their original script. "
                "Map explicit statements about reading, writing, and counting to practical_abilities. "
                "Use independent when the candidate says they can do the ability without help, "
                "with_support when they say they can do it with help, and not_yet only when they "
                "explicitly say they cannot do it yet. Recognize natural and imperfect speech in all "
                "three languages, including Arabic expressions such as بعرف اقرأ واكتب وعد, "
                "أستطيع القراءة والكتابة والحساب, and close transcription variants. Do not treat "
                "formal education as evidence of these practical abilities. Map an explicit desire "
                "for work, hospitality training, or both to opportunity_preference. Suggest a "
                "position interest only by copying jobDefinitionId and jobName from taskVocabulary; "
                "knowledge_level describes claimed current knowledge and may be null. "
                "Write evidence and unmapped statements in the declared language and return that "
                "language code in the language field. Return no suggestion when evidence is ambiguous. These "
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
        return add_explicit_practical_abilities(
            response.output_parsed,
            narrative,
            language,
        )

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
            "readingAbility",
            "writingAbility",
            "numeracyAbility",
            "selectedDisabilities",
            "opportunityPreference",
            "positionInterests",
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
                safe_task = {
                    "taskId": item["taskId"],
                    "taskName": task_name,
                    "jobName": job_name,
                }
                if isinstance(item.get("jobDefinitionId"), int):
                    safe_task["jobDefinitionId"] = item["jobDefinitionId"]
                safe_tasks.append(safe_task)
        return {
            "existingProfile": safe_profile,
            "allowedDisabilities": safe_disabilities,
            "taskVocabulary": safe_tasks,
        }
