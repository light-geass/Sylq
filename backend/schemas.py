"""
schemas.py — All Pydantic models for request validation & response shaping.

What Pydantic does here:
  - REQUEST schemas: FastAPI auto-validates incoming JSON against these.
    If the client sends wrong types or missing fields, FastAPI returns
    a 422 error automatically — you write zero validation code.
  - RESPONSE schemas: Shape what gets sent back to the client.
    `response_model=QuestionOut` on an endpoint strips any extra DB fields
    (like correct_answer) that you don't want to leak to the frontend.

Two categories:
  1. Question schemas  — for GET /questions
  2. Test schemas      — for POST /test, POST /test/{id}/submit, GET /test/{id}/result
"""

from __future__ import annotations
from typing import Any, Optional, Union
from pydantic import BaseModel, Field, field_validator
from enum import Enum
import uuid


# ── Enums (mirrors your ingestion enums) ──────────────────────────────────────

class QuestionType(str, Enum):
    MCQ = "MCQ"
    NAT = "NAT"
    MSQ = "MSQ"

class Difficulty(str, Enum):
    easy   = "easy"
    medium = "medium"
    hard   = "hard"

class TestLength(int, Enum):
    quick        = 10
    medium       = 25
    intermediate = 45
    full         = 65


# ── Content Block (mirrors core.py structure) ─────────────────────────────────

class ContentBlock(BaseModel):
    """
    One unit of question content. A question is a LIST of these.
    Why blocks instead of plain text?
      - LaTeX blocks render with KaTeX on the frontend (math notation)
      - Image blocks are just URLs — no base64 blobs in the DB
      - Text blocks are plain searchable strings
    """
    type: str           # "text" | "latex" | "image"
    body: Optional[str] = None   # for text/latex
    url:  Optional[str] = None   # for image


# ── Question Schemas ───────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    """
    What the frontend receives for each question.
    NOTE: correct_answer is intentionally EXCLUDED here.
    We never send the answer to the client before submission.
    """
    id:              str
    question_blocks: list[ContentBlock]
    question_type:   QuestionType
    options:         Optional[list[str]] = None
    marks:           int
    subject_name:    Optional[str] = None   # joined from subjects table
    topic_name:      Optional[str] = None   # joined from topics table
    difficulty:      Difficulty
    is_theory:       bool

class QuestionWithAnswer(QuestionOut):
    """
    Extended version sent only on the RESULTS page.
    Includes correct_answer + explanation so the student can review.
    """
    correct_answer: Any
    explanation:    str = ""


class QuestionFilter(BaseModel):
    """
    Query params for GET /questions.
    All fields are optional — omitting a filter means 'no restriction'.
    """
    branch_code:  str = "DA"
    subject_id:   Optional[int] = None
    topic_id:     Optional[int] = None
    difficulty:   Optional[Difficulty] = None
    question_type: Optional[QuestionType] = None
    is_pyq:       Optional[bool] = None
    marks:        Optional[int] = None
    limit:        int = Field(default=50, le=200)   # cap at 200 to prevent heavy pulls
    offset:       int = 0


# ── Test Schemas ───────────────────────────────────────────────────────────────

class TestCreateRequest(BaseModel):
    """
    What the frontend sends to POST /test.
    The user picks their filters on the customization screen,
    this gets sent as JSON, and the engine builds the test.
    """
    branch_code:   str = "DA"
    subject_ids:   list[int] = []       # empty = all subjects
    topic_ids:     list[int] = []       # empty = all topics
    difficulty:    Optional[Difficulty] = None   # None = mixed
    question_types: list[str] = []      # empty = all types
    total_questions: TestLength = TestLength.medium   # 10 / 25 / 45 / 65
    pyq_only:      bool = False         # True only for premium users

    @field_validator("branch_code")
    @classmethod
    def branch_must_be_valid(cls, v):
        allowed = {"DA", "CS", "EE", "EC", "ME", "CE"}
        if v.upper() not in allowed:
            raise ValueError(f"branch_code must be one of {allowed}")
        return v.upper()


class TestSession(BaseModel):
    """
    Returned by POST /test.
    Frontend stores test_id and uses it for submit + result calls.
    """
    test_id:       str
    questions:     list[QuestionOut]    # NO answers — just the questions
    total_marks:   int                  # sum of marks for all selected questions
    duration_mins: int                  # suggested time (1 min per mark)
    filters_used:  dict                 # echo back what was applied


class AnswerMap(BaseModel):
    """
    What the frontend sends to POST /test/{id}/submit.
    Maps question UUID → student's answer.

    Answer format by type:
      MCQ → "A" (single letter)
      NAT → 6.5 (number as string or float)
      MSQ → ["A", "C"] (list of letters)
    """
    answers:           dict[str, Any]       # {question_id: answer}
    time_per_question: dict[str, int] = {}  # {question_id: seconds} — Phase 5

    @field_validator("answers")
    @classmethod
    def answers_not_empty(cls, v):
        if not v:
            raise ValueError("answers map cannot be empty")
        return v


class QuestionResult(BaseModel):
    """
    Per-question result breakdown in the final report.
    """
    question_id:    str
    question_blocks: list[ContentBlock]
    question_type:  QuestionType
    options:        Optional[list[str]]
    correct_answer: Any
    user_answer:    Any                 # None if skipped
    is_correct:     bool
    marks_awarded:  float               # 0, partial (for MSQ), or full
    marks_possible: int
    explanation:    str
    subject_name:   Optional[str]
    topic_name:     Optional[str]


class TestResult(BaseModel):
    """
    Full result object from GET /test/{id}/result.
    """
    test_id:         str
    score:           float              # marks scored
    total_marks:     int                # max marks possible
    percentage:      float              # score/total_marks * 100
    correct_count:   int
    incorrect_count: int
    skipped_count:   int

    # Topic-wise breakdown for the AI analysis engine (Phase 5)
    topic_summary: list[dict]          # [{"topic": "Regression", "score": 3, "total": 6}]

    # Per-question detail
    questions: list[QuestionResult]


# ── Auth Schemas ───────────────────────────────────────────────────────────────

class UserInfo(BaseModel):
    """
    Decoded from Supabase JWT. Injected by the auth dependency.
    Every protected route receives this as `current_user`.
    """
    user_id:      str
    phone_number: Optional[str] = None      # Optional now
    email:        str                       # Primary auth identifier
    first_name:   Optional[str] = None
    last_name:    Optional[str] = None
    age:          Optional[int] = None
    gender:       Optional[str] = None
    plan:         str = "free"              # "free" | "premium"

class ProfileRegister(BaseModel):
    firstName: str
    lastName:  str
    age:       int
    gender:    str
    email:     str

class RecaptchaVerifyRequest(BaseModel):
    """Request body for reCAPTCHA Enterprise verification."""
    token:  str
    action: str = "LOGIN"
