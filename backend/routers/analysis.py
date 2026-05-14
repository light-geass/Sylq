"""
routers/analysis.py
Phase 5 — AI Post-Test Analysis endpoints.

2 endpoints:

  POST /analysis/{test_id}/generate
    Called by the frontend immediately after the result page loads.
    → Verifies test is submitted and belongs to this user
    → Calls Gemini (once) to generate study plan
    → Calculates sincerity score from timing data
    → Gets curated video links for weak topics
    → Stores everything in test_analyses table
    → Returns the full analysis JSON
    → IDEMPOTENT: if already generated, returns cached version

  GET /analysis/{test_id}
    Called on result page refresh or return visit.
    → Returns stored analysis from test_analyses table
    → 404 if generate was never called (shouldn't happen in normal flow)
"""

import json
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from routers.auth import get_current_user
from schemas import UserInfo
from services.analysis import generate_study_plan, calculate_sincerity
from services.video_map import get_video_recommendations
from services.scoring import build_topic_summary, check_answer

router = APIRouter(prefix="/analysis", tags=["Analysis"])


# ── POST /analysis/{test_id}/generate ─────────────────────────────────────────

@router.post("/{test_id}/generate")
def generate_analysis(
    test_id:      str,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Generate + store AI analysis for a submitted test.
    Safe to call multiple times — cached after first generation.
    """
    # ── Idempotency check ──────────────────────────────────────────────────
    # If analysis already exists for this test, return it immediately.
    existing = (
        supabase.table("test_analyses")
        .select("*")
        .eq("test_id", test_id)
        .execute()
    )
    if existing.data:
        return _deserialise(existing.data[0])

    # ── Fetch and validate test session ────────────────────────────────────
    try:
        session = (
            supabase.table("test_sessions")
            .select("*")
            .eq("id", test_id)
            .single()
            .execute()
            .data
        )
    except Exception:
        raise HTTPException(404, "Test session not found")

    if not session:
        raise HTTPException(404, "Test session not found")

    if str(session["user_id"]) != current_user.user_id:
        raise HTTPException(403, "Access denied")

    if session["status"] != "submitted":
        raise HTTPException(400, "Cannot analyse an unsubmitted test")

    # ── Reconstruct topic summary (same logic as GET /test/{id}/result) ───
    print(f"[DEBUG] Generating analysis for test: {test_id}")
    
    try:
        def _ensure_dict(val):
            if isinstance(val, str):
                return json.loads(val)
            return val or {}

        def _ensure_list(val):
            if isinstance(val, str):
                return json.loads(val)
            return val or []

        question_ids    = _ensure_list(session.get("question_ids"))
        stored_answers  = _ensure_dict(session.get("user_answers"))
        time_per_q      = session.get("time_per_question") or {}
        
        print(f"[DEBUG] Found {len(question_ids)} questions and {len(stored_answers)} answers")
    except Exception as e:
        print(f"[ERROR] Failed to parse session data: {e}")
        raise HTTPException(500, f"Error parsing test data: {e}")

    # Fetch questions with subject/topic joins
    print("[DEBUG] Fetching question details for analysis...")
    questions_full = (
        supabase.table("questions")
        .select("id, question_type, correct_answer, marks, subjects(name), topics(name)")
        .in_("id", question_ids)
        .execute()
        .data or []
    )
    print(f"[DEBUG] Fetched {len(questions_full)} question details")
    q_lookup = {str(q["id"]): q for q in questions_full}

    question_results = []
    for qid in question_ids:
        q = q_lookup.get(qid)
        if not q:
            continue
        user_answer = stored_answers.get(qid)
        is_correct, marks_awarded = check_answer(
            q["question_type"], q["correct_answer"], user_answer, q["marks"]
        )
        question_results.append({
            "topic_name":    (q.get("topics")   or {}).get("name"),
            "subject_name":  (q.get("subjects") or {}).get("name"),
            "is_correct":    is_correct,
            "marks_awarded": marks_awarded,
            "marks_possible": q["marks"],
        })

    topic_summary = build_topic_summary(question_results)
    total_marks   = session["total_marks"] or 1
    score         = session.get("score") or 0
    percentage    = round(score / total_marks * 100, 1)

    # ── 1. AI study plan — ONE Gemini call ──────────────────────────────────
    study_plan = generate_study_plan(topic_summary, percentage)

    # ── 2. Sincerity score — pure math ────────────────────────────────────
    behavioral = calculate_sincerity(time_per_q, total_marks)

    # ── 3. Video recommendations — static dict lookup ─────────────────────
    weak_topics = study_plan.get("key_weaknesses", [])
    videos      = get_video_recommendations(weak_topics)

    # ── 4. Store in DB ────────────────────────────────────────────────────
    row = {
        "test_id":       test_id,
        "user_id":       current_user.user_id,
        "percentage":    percentage,
        "study_plan":    study_plan,     # Supabase accepts dict for JSONB columns
        "behavioral":    behavioral,
        "videos":        videos,
        "topic_summary": topic_summary,
    }
    supabase.table("test_analyses").upsert(row).execute()

    return {
        "test_id":       test_id,
        "study_plan":    study_plan,
        "behavioral":    behavioral,
        "videos":        videos,
        "topic_summary": topic_summary,
        "percentage":    percentage,
    }


# ── GET /analysis/{test_id} ───────────────────────────────────────────────────

@router.get("/{test_id}")
def get_analysis(
    test_id:      str,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Return cached analysis.
    404 if POST /analysis/{test_id}/generate was never called.
    """
    result = (
        supabase.table("test_analyses")
        .select("*")
        .eq("test_id", test_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            404,
            "Analysis not yet generated. The result page should call POST /analysis/{test_id}/generate first."
        )

    row = result.data[0]
    if str(row["user_id"]) != current_user.user_id:
        raise HTTPException(403, "Access denied")

    return _deserialise(row)


# ── Helper ────────────────────────────────────────────────────────────────────

def _deserialise(row: dict) -> dict:
    """
    Supabase returns JSONB columns as dicts already (supabase-py handles it).
    This is a safety wrapper in case they come back as strings.
    """
    def safe(val):
        if isinstance(val, str):
            return json.loads(val)
        return val

    return {
        "test_id":       row["test_id"],
        "study_plan":    safe(row["study_plan"]),
        "behavioral":    safe(row["behavioral"]),
        "videos":        safe(row["videos"]),
        "topic_summary": safe(row["topic_summary"]),
        "percentage":    row["percentage"],
    }
