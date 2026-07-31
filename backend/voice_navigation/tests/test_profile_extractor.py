from __future__ import annotations

import unittest

from profile.extractor import OpenAIProfileExtractor


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


if __name__ == "__main__":
    unittest.main()
