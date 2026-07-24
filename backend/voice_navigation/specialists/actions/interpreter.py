from __future__ import annotations

import json

from openai import OpenAI

from core.schemas import ActionProposal


class OpenAIActionInterpreter:
    """Translate language into a proposal; never authorize or execute it."""

    def __init__(self, client: OpenAI, model: str) -> None:
        self._client = client
        self._model = model

    def interpret(
        self, transcript: str, context: dict, history: list[dict]
    ) -> ActionProposal:
        response = self._client.responses.parse(
            model=self._model,
            instructions=(
                "Interpret one multilingual website ACTION into a structured proposal. "
                "Allowed commands: SET_FIELD, CLEAR_FIELD, SELECT_OPTION, TOGGLE_OPTION, "
                "OPEN_ITEM, FOCUS_FIELD, PRESS, CONFIRM, CANCEL_ACTION, UNKNOWN. Use only "
                "control ids from the supplied registry. "
                "Examples: 'my email is a@b.com' => SET_FIELD/email/a@b.com; "
                "'choose employer' => SELECT_OPTION/account_type/employer; "
                "'select wheelchair' => TOGGLE_OPTION/disabilities/Wheelchair; "
                "'open Ice Cream Maker' => OPEN_ITEM/job/Ice Cream Maker; "
                "'take me to the first matched job' => OPEN_ITEM/matched_job/first; "
                "'upload my CV' => FOCUS_FIELD/application_document; "
                "'sign in' => PRESS/sign_in; 'yes' after a confirmation => CONFIRM. "
                "'no', 'cancel', or 'never mind' after a confirmation => CANCEL_ACTION. "
                "A correction such as 'no, my email is x' is another SET_FIELD. "
                "Do not decide safety or permission. Preserve the user's field value exactly "
                "apart from removing surrounding filler. Never invent a value."
                " Use currentView to resolve controls whose labels overlap across internal views; "
                "for example location in POST_JOB means job_location, while location in PROFILE "
                "means company_location. The registry still decides whether the proposal is allowed."
            ),
            input=(
                f"Registry context:\n{json.dumps(context, ensure_ascii=False)}\n"
                f"Recent turns:\n{json.dumps(history[-6:], ensure_ascii=False)}\n"
                f"Transcript:\n{transcript}"
            ),
            text_format=ActionProposal,
        )
        if response.output_parsed is None:
            raise ValueError("The action interpreter did not return a proposal.")
        return response.output_parsed
