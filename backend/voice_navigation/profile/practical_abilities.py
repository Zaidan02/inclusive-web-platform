from __future__ import annotations

import re
import unicodedata

from core.schemas import PracticalAbilitySuggestion, ProfileExtractionResult


_TERMS = {
    "en": {
        "readingAbility": (r"\bread(?:ing)?\b",),
        "writingAbility": (r"\bwrit(?:e|ing)\b",),
        "numeracyAbility": (r"\b(?:count|counting|calculate|calculating|do math)\b",),
    },
    "fr": {
        "readingAbility": (r"\b(?:lire|lecture)\b",),
        "writingAbility": (r"\b(?:ecrire|ecriture)\b",),
        "numeracyAbility": (r"\b(?:compter|calculer|calcul)\b",),
    },
    "ar": {
        "readingAbility": (r"(?:اقرا|قراءه|القراءه)",),
        "writingAbility": (r"(?:اكتب|كتابه|الكتابه)",),
        "numeracyAbility": (r"(?:احسب|الحساب|حساب|العد|(?:^|\s|و)(?:اعد|عد)(?=$|\s))",),
    },
}

_CUES = {
    "en": {
        "not_yet": r"(?:cannot|can't|can not|do not know how to|don't know how to|not able to)",
        "independent": r"(?:i can|i know how to|i am able to)",
        "support": r"(?:with (?:help|support|assistance)|need (?:help|support|assistance))",
    },
    "fr": {
        "not_yet": r"(?:je ne sais pas|je ne peux pas|je n'arrive pas|incapable de)",
        "independent": r"(?:je sais|je peux|je suis capable de)",
        "support": r"(?:avec (?:de l'aide|aide|du soutien|assistance)|besoin d'aide)",
    },
    "ar": {
        "not_yet": r"(?:ما بعرف|لا اعرف|لا استطيع|مش قادر|غير قادر|ما بقدر)",
        "independent": r"(?:بعرف|اعرف|استطيع|بقدر|قادر)",
        "support": r"(?:مع مساعده|بمساعده|مع دعم|احتاج مساعده|بحاجه لمساعده)",
    },
}


def _normalise(text: str, language: str) -> str:
    text = unicodedata.normalize("NFKD", text.casefold())
    text = "".join(character for character in text if not unicodedata.combining(character))
    if language == "ar":
        text = re.sub("[إأآٱ]", "ا", text)
        text = text.replace("ى", "ي").replace("ة", "ه").replace("ـ", "")
    return " ".join(text.split())


def _nearest_preceding_cue(text: str, position: int, cues: dict[str, str]) -> tuple[str | None, int]:
    best_level = None
    best_position = -1
    start = max(0, position - 100)
    prefix = text[start:position]
    for level in ("not_yet", "independent"):
        for match in re.finditer(cues[level], prefix):
            absolute_position = start + match.end()
            if absolute_position > best_position:
                best_level = level
                best_position = absolute_position
    return best_level, best_position


def _explicit_level(text: str, language: str, terms: tuple[str, ...]) -> str | None:
    cues = _CUES[language]
    for term in terms:
        for match in re.finditer(term, text):
            nearby = text[max(0, match.start() - 55):match.end() + 55]
            if re.search(cues["support"], nearby):
                return "with_support"
            level, _ = _nearest_preceding_cue(text, match.start(), cues)
            if level:
                return level
    return None


def add_explicit_practical_abilities(
    result: ProfileExtractionResult,
    narrative: str,
    language: str,
) -> ProfileExtractionResult:
    """Fill only explicit labelled abilities that the model omitted.

    This conservative fallback covers common spoken English, French, and Arabic,
    including transcription variants without accents or Arabic diacritics.
    """
    if language not in _TERMS:
        return result
    existing = {item.field for item in result.practical_abilities}
    normalised = _normalise(narrative, language)
    evidence = " ".join(narrative.split())[:500]
    for field, terms in _TERMS[language].items():
        if field in existing:
            continue
        level = _explicit_level(normalised, language, terms)
        if level:
            result.practical_abilities.append(PracticalAbilitySuggestion(
                field=field,
                value=level,
                confidence=0.9,
                evidence=evidence,
            ))
    return result
