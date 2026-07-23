from __future__ import annotations

from core.schemas import AuthorizedCommand, ClarificationCommand, IntentProposal, RejectedCommand


_MESSAGES = {
    "en": {
        "rejected": "I could not safely perform that request.",
        "NAVIGATE": "Opening {target}.",
        "READ_SECTION": "Reading {target}.",
        "GO_BACK": "Going back.",
        "HELP": "Here are the available voice commands.",
        "REPEAT": "Repeating the last message.",
        "STOP_SPEAKING": "Voice output stopped.",
        "PAUSE_LISTENING": "Listening paused. Use the Resume button when you are ready.",
        "CANCEL": "Cancelled.",
        "DISABLE_VOICE": "Voice navigation turned off.",
    },
    "ar": {
        "rejected": "لم أتمكن من تنفيذ هذا الطلب بأمان.",
        "NAVIGATE": "سأفتح {target}.",
        "READ_SECTION": "سأقرأ قسم {target}.",
        "GO_BACK": "سأعود إلى الصفحة السابقة.",
        "HELP": "هذه هي الأوامر الصوتية المتاحة.",
        "REPEAT": "سأكرر الرسالة الأخيرة.",
        "STOP_SPEAKING": "تم إيقاف الصوت.",
        "PAUSE_LISTENING": "تم إيقاف الاستماع مؤقتًا. استخدم زر المتابعة عندما تكون جاهزًا.",
        "CANCEL": "تم الإلغاء.",
        "DISABLE_VOICE": "تم إيقاف التنقل الصوتي.",
    },
    "fr": {
        "rejected": "Je ne peux pas exécuter cette demande en toute sécurité.",
        "NAVIGATE": "J’ouvre {target}.",
        "READ_SECTION": "Je lis la section {target}.",
        "GO_BACK": "Je reviens à la page précédente.",
        "HELP": "Voici les commandes vocales disponibles.",
        "REPEAT": "Je répète le dernier message.",
        "STOP_SPEAKING": "La sortie vocale est arrêtée.",
        "PAUSE_LISTENING": "L'écoute est en pause. Utilisez le bouton Reprendre.",
        "CANCEL": "Annulé.",
        "DISABLE_VOICE": "Navigation vocale désactivée.",
    },
}


def build_feedback(
    proposal: IntentProposal,
    route: AuthorizedCommand | RejectedCommand | ClarificationCommand,
) -> str:
    language = proposal.language.split("-")[0].lower()
    messages = _MESSAGES.get(language, _MESSAGES["en"])
    if isinstance(route, RejectedCommand):
        return messages["rejected"]
    if isinstance(route, ClarificationCommand):
        return route.question
    template = messages.get(route.command, _MESSAGES["en"].get(route.command, "Done."))
    return template.format(target=(route.target or "").replace("_", " "))
