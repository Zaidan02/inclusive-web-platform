from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


CommandName = Literal[
    "NAVIGATE",
    "READ_SECTION",
    "GO_BACK",
    "HELP",
    "REPEAT",
    "STOP_SPEAKING",
    "PAUSE_LISTENING",
    "CANCEL",
    "DISABLE_VOICE",
    "CLARIFY",
    "UNKNOWN",
]


class IntentProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    command: CommandName
    target: str | None = None
    language: str = Field(default="und", min_length=2, max_length=16)
    confidence: float = Field(ge=0, le=1)
    choices: list[str] = Field(default_factory=list, max_length=3)
    question: str | None = Field(default=None, max_length=300)


class AuthorizedCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["authorized"]
    command: CommandName
    target: str | None
    risk: int = Field(ge=0, le=5)
    action: dict[str, str | None]


class RejectedCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["rejected"]
    command: CommandName
    target: str | None
    reason: str


class ClarificationCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["needs_clarification"]
    command: Literal["CLARIFY"]
    target: None = None
    choices: list[str] = Field(min_length=1, max_length=3)
    question: str = Field(min_length=1, max_length=300)
    action: dict[str, Any]


class VoiceTurnResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request_id: str
    transcript: str
    language: str
    proposal: IntentProposal
    route: AuthorizedCommand | RejectedCommand | ClarificationCommand
    feedback: str
