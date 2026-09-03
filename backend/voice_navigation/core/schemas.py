from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


CommandName = Literal[
    "NAVIGATE",
    "READ_SECTION",
    "GO_BACK",
    "SCROLL_UP",
    "SCROLL_DOWN",
    "HELP",
    "REPEAT",
    "STOP_SPEAKING",
    "PAUSE_LISTENING",
    "CANCEL",
    "DISABLE_VOICE",
    "CLARIFY",
    "UNKNOWN",
]

RequestCategory = Literal["NAVIGATION", "WEBSITE_QUESTION", "ACTION"]

ActionCommandName = Literal[
    "SET_FIELD",
    "CLEAR_FIELD",
    "SELECT_OPTION",
    "TOGGLE_OPTION",
    "OPEN_ITEM",
    "FOCUS_FIELD",
    "PRESS",
    "CONFIRM",
    "CANCEL_ACTION",
    "UNKNOWN",
]


class RequestClassification(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: RequestCategory
    confidence: float = Field(ge=0, le=1)
    language: str = Field(default="und", min_length=2, max_length=16)


class IntentProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    command: CommandName
    target: str | None = None
    language: str = Field(default="und", min_length=2, max_length=16)
    confidence: float = Field(ge=0, le=1)
    choices: list[str] = Field(default_factory=list, max_length=3)
    question: str | None = Field(default=None, max_length=300)


class ActionProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    command: ActionCommandName
    target: str | None = Field(default=None, max_length=80)
    value: str | None = Field(default=None, max_length=500)
    language: str = Field(default="und", min_length=2, max_length=16)
    confidence: float = Field(ge=0, le=1)


class AuthorizedCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["authorized"]
    command: CommandName
    target: str | None
    risk: int = Field(ge=0, le=5)
    action: dict[str, Any]


class RejectedCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["rejected"]
    command: CommandName
    target: str | None
    reason: str


class PermissionDeniedCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["permission_denied"]
    command: Literal["NAVIGATE"]
    target: str
    reason: str
    action: None = None


class ClarificationCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["needs_clarification"]
    command: Literal["CLARIFY"]
    target: None = None
    choices: list[str] = Field(min_length=1, max_length=3)
    question: str = Field(min_length=1, max_length=300)
    action: dict[str, Any]


class SpecialistUnavailable(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["specialist_unavailable"]
    category: Literal["WEBSITE_QUESTION", "ACTION"]
    reason: str
    action: None = None


class WebsiteQuestionAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: str = Field(min_length=1, max_length=1200)
    grounded: bool


class AnsweredQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["answered"]
    category: Literal["WEBSITE_QUESTION"]
    grounded: bool
    answer: str = Field(min_length=1, max_length=1200)
    action: None = None


class AuthorizedAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["authorized"]
    command: ActionCommandName
    target: str | None
    risk: int = Field(ge=0, le=5)
    requires_confirmation: bool = False
    sensitive: bool = False
    action: dict[str, Any]


class ActionRejected(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal[
        "rejected",
        "needs_confirmation",
        "invalid_value",
        "read_only",
        "unavailable",
    ]
    command: ActionCommandName
    target: str | None
    reason: str
    action: dict[str, Any] | None = None


class VoiceTurnResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request_id: str
    transcript: str
    language: str
    classification: RequestClassification
    proposal: IntentProposal | ActionProposal | None = None
    route: (
        AuthorizedCommand
        | RejectedCommand
        | PermissionDeniedCommand
        | ClarificationCommand
        | SpecialistUnavailable
        | AnsweredQuestion
        | AuthorizedAction
        | ActionRejected
    )
    feedback: str


ProfileFieldName = Literal["firstName", "lastName", "phone", "location", "about"]
EducationLevel = Literal[
    "none",
    "primary",
    "middle_school",
    "high_school",
    "vocational",
    "university",
]


class ProfileFieldSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: ProfileFieldName
    value: str = Field(min_length=1, max_length=3000)
    confidence: float = Field(ge=0, le=1)
    evidence: str = Field(min_length=1, max_length=500)


class EducationSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: EducationLevel
    confidence: float = Field(ge=0, le=1)
    evidence: str = Field(min_length=1, max_length=500)


class DisabilitySuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    confidence: float = Field(ge=0, le=1)
    evidence: str = Field(min_length=1, max_length=500)
    explicit_statement: bool


class TaskSkillSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_id: int = Field(gt=0)
    task_name: str = Field(min_length=1, max_length=500)
    job_name: str = Field(min_length=1, max_length=255)
    confidence: float = Field(ge=0, le=1)
    evidence: str = Field(min_length=1, max_length=500)
    note: str | None = Field(default=None, max_length=500)


class ProfileExtractionResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    language: str = Field(min_length=2, max_length=16)
    profile_fields: list[ProfileFieldSuggestion] = Field(default_factory=list, max_length=5)
    education_level: EducationSuggestion | None = None
    disabilities: list[DisabilitySuggestion] = Field(default_factory=list, max_length=10)
    task_skills: list[TaskSkillSuggestion] = Field(default_factory=list, max_length=12)
    unmapped_statements: list[str] = Field(default_factory=list, max_length=10)
