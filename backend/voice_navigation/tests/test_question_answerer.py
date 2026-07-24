from __future__ import annotations

import unittest

from specialists.questions.answerer import OpenAIWebsiteQuestionAnswerer


class QuestionAnswererTest(unittest.TestCase):
    def test_page_context_is_bounded_and_normalized(self) -> None:
        context = OpenAIWebsiteQuestionAnswerer._sanitize_context(
            {
                "title": "  Candidate   Jobs ",
                "path": "/candidate",
                "roleContext": "candidate",
                "currentView": "JOBS",
                "text": "word   " * 5000,
                "ignored": "must not be forwarded",
            }
        )

        self.assertEqual("Candidate Jobs", context["title"])
        self.assertLessEqual(len(context["text"]), 12_000)
        self.assertNotIn("ignored", context)

    def test_missing_context_becomes_empty_bounded_context(self) -> None:
        context = OpenAIWebsiteQuestionAnswerer._sanitize_context(None)
        self.assertEqual("", context["text"])
        self.assertEqual("", context["path"])


if __name__ == "__main__":
    unittest.main()
