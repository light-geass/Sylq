"""
routers/tests.py — Test lifecycle: create → submit → result.

3 endpoints:
  POST /test               — generate a test from filters, return questions (no answers)
  POST /test/{id}/submit   — accept student answers, score them, store result
  GET  /test/{id}/result   — return full scored breakdown

Flow:
  1. User picks filters on frontend → POST /test
     Backend selects questions, stores test_session in DB (status=active),
     returns questions WITHOUT correct_answer.

  2. Student completes test → POST /test/{id}/submit
     Backend receives {question_id: answer} map,
     fetches correct answers from DB, scores each question,
     stores score + user_answers in test_session (status=submitted).

  3. Results page → GET /test/{id}/result
     Backend fetches the stored test_session + questions with correct answers,
     returns full breakdown including explanations.

Security notes:
  - Correct answers are NEVER sent in step 1 (QuestionOut schema excludes them)
  - Step 2 fetches correct answers server-side only after submission
  - Step 3 is gated: only the test owner can see results
"""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from schemas import (
    TestCreateRequest, TestSession, AnswerMap, TestResult,
    QuestionOut, QuestionResult, QuestionWithAnswer, ContentBlock, UserInfo
)
from routers.auth import get_current_user
from database import supabase
from services.test_engine import select_questions, db_row_to_question_out, calculate_total_marks
from services.scoring import check_answer, build_topic_summary

router = APIRouter(prefix="/test", tags=["Tests"])


# ── POST /test ─────────────────────────────────────────────────────────────────

@router.post("", response_model=TestSession)
def create_test(
    request: TestCreateRequest,
    current_user: UserInfo = Depends(get_current_user),
):
    print(f"[DEBUG] create_test called with request: {request}")
    print(f"[DEBUG] current_user: {current_user}")

    """
    Generate a test based on the user's filter selections.

    What happens here:
      1. PYQ gate check — free users can't request pyq_only=True
      2. Daily test limit check — free users: 3 tests/day
      3. Call test_engine.select_questions() → get filtered, ratio-balanced list
      4. Store test_session in DB with question_ids (not the full questions)
      5. Return the questions (WITHOUT correct_answer) + test_id to frontend

    Why store only question_ids in DB (not full question data)?
      Questions already live in the questions table. Storing them again
      wastes space. On submission/result, we re-fetch by ID.
      The test_session is just: "user X took these question IDs at this time".
    """
    # ── Gate checks ────────────────────────────────────────────────────────
    if request.pyq_only and current_user.plan != "premium":
        raise HTTPException(
            status_code=403,
            detail="PYQ-only tests are available to premium users only"
        )

    # _check_daily_limit(current_user)  # Temporarily disabled for testing

    # ── Select questions ───────────────────────────────────────────────────
    raw_questions = select_questions(request)

    if not raw_questions:
        raise HTTPException(
            status_code=404,
            detail=f"No questions found matching your filters. Try broader criteria. "
                   f"(Filters: branch={request.branch_code}, subjects={len(request.subject_ids)}, "
                   f"topics={len(request.topic_ids)}, types={request.question_types}, difficulty={request.difficulty})"
        )

    # ── Build QuestionOut list (no answers) ────────────────────────────────
    questions_out = [db_row_to_question_out(q) for q in raw_questions]
    total_marks   = calculate_total_marks(raw_questions)

    # ── Store test_session in Supabase ─────────────────────────────────────
    test_id = str(uuid.uuid4())
    session_row = {
        "id":           test_id,
        "user_id":      current_user.user_id,
        "question_ids": json.dumps([str(q["id"]) for q in raw_questions]),
        "user_answers": json.dumps({}),
        "time_per_question": json.dumps({}),    # Phase 5
        "total_marks":  total_marks,
        "status":       "active",
        "filters":      json.dumps(request.model_dump(mode='json')),
        "created_at":   datetime.now(timezone.utc).isoformat(),
    }

    result = supabase.table("test_sessions").insert(session_row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create test session")

    return TestSession(
        test_id        = test_id,
        questions      = questions_out,
        total_marks    = total_marks,
        duration_mins  = total_marks,   # GATE standard: 1 min per mark
        filters_used   = request.model_dump(),
    )


# ── POST /test/{id}/submit ─────────────────────────────────────────────────────

@router.post("/{test_id}/submit", response_model=dict)
def submit_test(
    test_id: str,
    body: AnswerMap,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Accept student's answers and calculate the score.

    What happens here:
      1. Fetch the test_session — verify it belongs to this user
      2. Check it hasn't already been submitted (no re-submission)
      3. Fetch all questions WITH correct_answer (server-side only)
      4. Score each question using scoring.py rules
      5. Update test_session: user_answers, score, status=submitted
      6. Return just {score, total_marks} — full result via GET /test/{id}/result

    Why separate submit from result?
      Submit is a write operation (scores + saves).
      Result is a read operation (returns full breakdown).
      Separating them: frontend can show a "calculating..." screen,
      then redirect to the result page which does the GET.
    """
    # ── Fetch session ──────────────────────────────────────────────────────
    session = _get_session_or_404(test_id, current_user.user_id)

    if session["status"] == "submitted":
        raise HTTPException(status_code=409, detail="Test already submitted")

    # ── Fetch correct answers for all questions in this test ───────────────
    question_ids = json.loads(session["question_ids"])

    questions_with_answers = supabase.table("questions").select(
        "id, question_type, correct_answer, marks, "
        "subjects(name), topics(name)"
    ).in_("id", question_ids).execute().data or []

    # Build lookup dict for fast access: {question_id: question_row}
    q_lookup = {str(q["id"]): q for q in questions_with_answers}

    # ── Score each question ────────────────────────────────────────────────
    total_score = 0.0
    correct_count   = 0
    incorrect_count = 0
    skipped_count   = 0

    for qid in question_ids:
        q   = q_lookup.get(qid)
        if not q:
            continue

        user_answer = body.answers.get(qid)   # None if student skipped

        is_correct, marks_awarded = check_answer(
            question_type  = q["question_type"],
            correct_answer = q["correct_answer"],
            user_answer    = user_answer,
            marks          = q["marks"],
        )

        total_score += marks_awarded

        if user_answer is None:
            skipped_count += 1
        elif is_correct:
            correct_count += 1
        else:
            incorrect_count += 1

    # Clamp score to 0 minimum (extreme negative marking edge case)
    total_score = max(total_score, 0.0)

    # ── Update test_session ────────────────────────────────────────────────
    supabase.table("test_sessions").update({
        "user_answers":  json.dumps(body.answers),
        "time_per_question": body.time_per_question,   # Phase 5
        "score":         round(total_score, 2),
        "status":        "submitted",
        "submitted_at":  datetime.now(timezone.utc).isoformat(),
    }).eq("id", test_id).execute()

    return {
        "test_id":        test_id,
        "score":          round(total_score, 2),
        "total_marks":    session["total_marks"],
        "percentage":     round(total_score / session["total_marks"] * 100, 1),
        "correct_count":  correct_count,
        "incorrect_count": incorrect_count,
        "skipped_count":  skipped_count,
        "message":        "Test submitted. Fetch full result at GET /test/{id}/result",
    }


# ── GET /test/{id}/result ──────────────────────────────────────────────────────

@router.get("/{test_id}/result", response_model=TestResult)
def get_result(
    test_id: str,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Return the full scored breakdown for a submitted test.
    Includes: per-question correct/wrong, explanations, topic summary.

    This is the data that feeds:
      - The result table on the frontend
      - Phase 5: AI analysis engine (topic_summary)
      - Phase 6: Chatbot context injection (question + explanation)

    Only the test owner can access this (checked in _get_session_or_404).
    """
    session = _get_session_or_404(test_id, current_user.user_id)

    if session["status"] != "submitted":
        raise HTTPException(
            status_code=400,
            detail="Test not yet submitted. Submit first via POST /test/{id}/submit"
        )

    question_ids  = json.loads(session["question_ids"])
    stored_answers = json.loads(session["user_answers"])

    # ── Fetch questions WITH answers + explanations ────────────────────────
    questions_full = supabase.table("questions").select(
        "id, question_blocks, question_type, options, correct_answer, "
        "marks, difficulty, is_theory, explanation, "
        "subjects(name), topics(name)"
    ).in_("id", question_ids).execute().data or []

    q_lookup = {str(q["id"]): q for q in questions_full}

    # ── Build per-question result list ─────────────────────────────────────
    question_results = []
    total_score      = 0.0
    correct_count    = 0
    incorrect_count  = 0
    skipped_count    = 0

    for qid in question_ids:   # preserve original order
        q = q_lookup.get(qid)
        if not q:
            continue

        user_answer = stored_answers.get(qid)
        is_correct, marks_awarded = check_answer(
            question_type  = q["question_type"],
            correct_answer = q["correct_answer"],
            user_answer    = user_answer,
            marks          = q["marks"],
        )

        total_score += marks_awarded

        if user_answer is None:
            skipped_count += 1
        elif is_correct:
            correct_count += 1
        else:
            incorrect_count += 1

        # Resolve JOIN fields
        subject_name = (q.get("subjects") or {}).get("name")
        topic_name   = (q.get("topics")   or {}).get("name")

        blocks = [ContentBlock(**b) for b in (q.get("question_blocks") or [])]

        question_results.append({
            "question_id":    qid,
            "question_blocks": [b.model_dump() for b in blocks],
            "question_type":  q["question_type"],
            "options":        q.get("options"),
            "correct_answer": q["correct_answer"],
            "user_answer":    user_answer,
            "is_correct":     is_correct,
            "marks_awarded":  marks_awarded,
            "marks_possible": q["marks"],
            "explanation":    q.get("explanation") or "",
            "subject_name":   subject_name,
            "topic_name":     topic_name,
        })

    total_score  = max(total_score, 0.0)
    total_marks  = session["total_marks"]
    topic_summary = build_topic_summary(question_results)

    return TestResult(
        test_id         = test_id,
        score           = round(total_score, 2),
        total_marks     = total_marks,
        percentage      = round(total_score / total_marks * 100, 1) if total_marks else 0,
        correct_count   = correct_count,
        incorrect_count = incorrect_count,
        skipped_count   = skipped_count,
        topic_summary   = topic_summary,
        questions       = [QuestionResult(**r) for r in question_results],
    )


# ── GET /test/history ─────────────────────────────────────────────────────────

@router.get("/history", response_model=list[dict])
def get_test_history(
    limit: int = 10,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Returns the user's last N tests (submitted only).
    Used for the dashboard / history page.
    """
    result = (
        supabase.table("test_sessions")
        .select("id, score, total_marks, status, created_at, submitted_at, filters")
        .eq("user_id", current_user.user_id)
        .eq("status", "submitted")
        .order("submitted_at", desc=True)
        .limit(limit)
        .execute()
    )

    sessions = result.data or []
    # Add percentage field for convenience
    for s in sessions:
        if s["total_marks"] and s["score"] is not None:
            s["percentage"] = round(s["score"] / s["total_marks"] * 100, 1)
        else:
            s["percentage"] = None
    return sessions


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_session_or_404(test_id: str, user_id: str) -> dict:
    """Fetch test session and verify ownership."""
    try:
        result = (
            supabase.table("test_sessions")
            .select("*")
            .eq("id", test_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Test session not found")

    session = result.data
    if not session:
        raise HTTPException(status_code=404, detail="Test session not found")

    # Ownership check — prevent users from accessing other users' tests
    if str(session["user_id"]) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    return session


def _check_daily_limit(current_user: UserInfo):
    """
    Free tier: max 5 tests per calendar day.
    Premium: unlimited.
    """
    if current_user.plan == "premium":
        return

    from config import settings
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    result = (
        supabase.table("test_sessions")
        .select("id", count="exact")
        .eq("user_id", current_user.user_id)
        .gte("created_at", today_start)
        .execute()
    )

    count = result.count or 0
    if count >= settings.free_tests_per_day:
        raise HTTPException(
            status_code=429,
            detail=f"Free plan limit: {settings.free_tests_per_day} tests/day. Upgrade to premium for unlimited."
        )
