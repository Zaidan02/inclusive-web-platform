from __future__ import annotations

import unittest

from core.schemas import ProfileExtractionResult
from profile.extractor import OpenAIProfileExtractor
from profile.practical_abilities import add_explicit_practical_abilities


class ProfileExtractorTest(unittest.TestCase):
    def test_context_is_bounded_and_allowlisted(self) -> None:
        context = OpenAIProfileExtractor._bounded_context(
            {"firstName": "A", "ignored": "secret"},
            [{"id": 1, "name": "  Visual   disability  "}] * 150,
            [
                {"taskId": 4, "taskName": "  Prepare   dough ", "jobName": " Bakery "},
                {"taskId": "invalid", "taskName": "Ignore", "jobName": "Bakery"},
            ],
        )

        self.assertNotIn("ignored", context["existingProfile"])
        self.assertEqual(100, len(context["allowedDisabilities"]))
        self.assertEqual("Visual disability", context["allowedDisabilities"][0]["name"])
        self.assertEqual(
            [{"taskId": 4, "taskName": "Prepare dough", "jobName": "Bakery"}],
            context["taskVocabulary"],
        )

    def test_missing_context_becomes_empty_catalogues(self) -> None:
        context = OpenAIProfileExtractor._bounded_context(None, None, None)
        self.assertEqual({}, context["existingProfile"])
        self.assertEqual([], context["allowedDisabilities"])
        self.assertEqual([], context["taskVocabulary"])

    def test_context_includes_every_ai_fillable_profile_control(self) -> None:
        context = OpenAIProfileExtractor._bounded_context(
            {
                "firstName": "Maya",
                "readingAbility": "independent",
                "writingAbility": "with_support",
                "numeracyAbility": "not_yet",
                "opportunityPreference": "both",
                "positionInterests": [{"jobDefinitionId": 6, "knowledgeLevel": "independent"}],
            },
            [],
            [{
                "taskId": 14,
                "jobDefinitionId": 6,
                "taskName": "Process a cash payment",
                "jobName": "Cashier",
            }],
        )

        self.assertEqual("independent", context["existingProfile"]["readingAbility"])
        self.assertEqual("both", context["existingProfile"]["opportunityPreference"])
        self.assertEqual(6, context["taskVocabulary"][0]["jobDefinitionId"])

    def test_complete_multilingual_profile_contract_accepts_labelled_abilities(self) -> None:
        result = ProfileExtractionResult.model_validate({
            "language": "ar",
            "profile_fields": [
                {"field": "firstName", "value": "مايا", "confidence": 0.99, "evidence": "اسمي مايا"},
                {"field": "location", "value": "بيروت", "confidence": 0.99, "evidence": "أسكن في بيروت"},
            ],
            "education_level": {"value": "high_school", "confidence": 0.95, "evidence": "أنهيت الثانوية"},
            "practical_abilities": [
                {"field": "readingAbility", "value": "independent", "confidence": 0.95, "evidence": "بعرف اقرأ"},
                {"field": "writingAbility", "value": "independent", "confidence": 0.95, "evidence": "بعرف اكتب"},
                {"field": "numeracyAbility", "value": "independent", "confidence": 0.95, "evidence": "بعرف عد"},
            ],
            "opportunity_preference": {"value": "both", "confidence": 0.95, "evidence": "أريد عملاً وتدريباً"},
            "position_interests": [{
                "job_definition_id": 6,
                "job_name": "Cashier",
                "knowledge_level": "independent",
                "confidence": 0.9,
                "evidence": "عملت كأمين صندوق",
            }],
            "disabilities": [],
            "task_skills": [],
            "unmapped_statements": [],
        })

        self.assertEqual(3, len(result.practical_abilities))
        self.assertEqual("independent", result.practical_abilities[2].value)
        self.assertEqual("both", result.opportunity_preference.value)
        self.assertEqual(6, result.position_interests[0].job_definition_id)

    def test_arabic_imperfect_transcript_fills_read_write_and_count(self) -> None:
        result = add_explicit_practical_abilities(
            ProfileExtractionResult(language="ar"),
            "انا بعرف اقرا واكتب وعد لحالي",
            "ar",
        )

        self.assertEqual(
            {
                "readingAbility": "independent",
                "writingAbility": "independent",
                "numeracyAbility": "independent",
            },
            {item.field: item.value for item in result.practical_abilities},
        )

    def test_english_and_french_explicit_abilities_are_supported(self) -> None:
        english = add_explicit_practical_abilities(
            ProfileExtractionResult(language="en"),
            "I know how to read, write, and count independently.",
            "en",
        )
        french = add_explicit_practical_abilities(
            ProfileExtractionResult(language="fr"),
            "Je sais lire, écrire et compter sans aide.",
            "fr",
        )

        self.assertEqual(3, len(english.practical_abilities))
        self.assertEqual(3, len(french.practical_abilities))

    def test_negative_arabic_statement_is_not_mistaken_for_independent(self) -> None:
        result = add_explicit_practical_abilities(
            ProfileExtractionResult(language="ar"),
            "انا لا استطيع القراءة بعد",
            "ar",
        )

        self.assertEqual("not_yet", result.practical_abilities[0].value)


if __name__ == "__main__":
    unittest.main()
