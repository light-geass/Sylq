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
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from database import supabase
from routers.auth import get_current_user
from schemas import UserInfo
from services.analysis import generate_study_plan, calculate_sincerity, generate_holistic_plan
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
    study_plan = generate_study_plan(topic_summary, percentage, current_user.exam_name)

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


from pydantic import BaseModel

class StudyPlanRequest(BaseModel):
    duration_days: int = 30
    preferences: str = ""

# ── GET /analysis/global-plan ────────────────────────────────────────────────
@router.get("/global-plan")
def get_global_study_plan(current_user: UserInfo = Depends(get_current_user)):
    """
    Fetch the existing 30-day holistic roadmap.
    """
    try:
        # Check usage for TODAY only
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        usage_res = (
            supabase.table("global_study_plans")
            .select("id", count="exact")
            .eq("user_id", current_user.user_id)
            .gte("created_at", today_start)
            .execute()
        )
        count = usage_res.count or 0
        limit = 10 if current_user.plan == "premium" else 1

        existing = (
            supabase.table("global_study_plans")
            .select("*")
            .eq("user_id", current_user.user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if existing.data:
            # Return existing cached plan
            return {
                **existing.data[0]["plan_data"],
                "usage_count": count,
                "usage_limit": limit,
                "is_cached": True
            }
        else:
            # User wants to view, but no plan exists. Do NOT auto-generate.
            return {
                "empty_state": True,
                "usage_count": count,
                "usage_limit": limit,
            }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        if "relation \"public.global_study_plans\" does not exist" in str(e) or "global_study_plans" in str(e):
            raise HTTPException(status_code=500, detail="Database table 'global_study_plans' is missing. Please run the setup SQL.")
        raise


# ── POST /analysis/global-plan ────────────────────────────────────────────────
@router.post("/global-plan")
def generate_global_study_plan(
    req: StudyPlanRequest,
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Generate a holistic roadmap (consumes 1 generation credit).
    """
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        usage_res = (
            supabase.table("global_study_plans")
            .select("id", count="exact")
            .eq("user_id", current_user.user_id)
            .gte("created_at", today_start)
            .execute()
        )
        count = usage_res.count or 0
        limit = 10 if current_user.plan == "premium" else 1

        # 1. Check generation limit
        if count >= limit:
            raise HTTPException(
                status_code=402, 
                detail=f"Study Plan generation limit reached ({count}/{limit}). Upgrade your plan for more generations."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        if "relation \"public.global_study_plans\" does not exist" in str(e) or "global_study_plans" in str(e):
            raise HTTPException(status_code=500, detail="Database table 'global_study_plans' is missing. Please run the setup SQL.")
        raise

    # 2. Fetch last 20 tests for context
    result = (
        supabase.table("test_sessions")
        .select("id, score, total_marks, submitted_at")
        .eq("user_id", current_user.user_id)
        .eq("status", "submitted")
        .order("submitted_at", desc=True)
        .limit(20)
        .execute()
    )
    
    history = result.data or []
    if not history:
        return {
            "executive_summary": "No test history found. Take a few mock tests to generate your personalized roadmap!",
            "phases": [],
            "daily_routine_tip": "Start by attempting your first mini-mock test today.",
            "usage_count": count,
            "usage_limit": limit,
            "duration_label": f"{req.duration_days}-Day Plan"
        }

    # 3. Format performance summary
    perf_lines = []
    for t in history:
        pct = round(t["score"] / t["total_marks"] * 100, 1) if t["total_marks"] else 0
        date = t["submitted_at"][:10] if t["submitted_at"] else "N/A"
        perf_lines.append(f"- Test on {date}: {pct}% score ({t['score']}/{t['total_marks']} marks)")
    
    perf_data = "\n".join(perf_lines)
    
    # 4. Generate New Plan
    plan = generate_holistic_plan(
        performance_data=perf_data, 
        exam_name=current_user.exam_name,
        duration_days=req.duration_days,
        preferences=req.preferences
    )
    
    # 5. Persist the plan
    if "error" not in plan:
        supabase.table("global_study_plans").insert({
            "user_id": current_user.user_id,
            "plan_data": plan
        }).execute()
        count += 1

    return {
        **plan,
        "usage_count": count,
        "usage_limit": limit,
        "is_cached": False
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
