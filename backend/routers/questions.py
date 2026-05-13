"""
routers/questions.py — GET /questions and taxonomy endpoints.

Endpoints:
  GET /questions         — filtered question list (for browsing/admin)
  GET /questions/subjects — list all subjects (for the filter dropdowns)
  GET /questions/topics   — list topics for a subject

Why expose subjects/topics endpoints?
  The frontend test customization screen needs to populate dropdowns.
  Subject list → Topic list → User selects → POST /test
  These are lightweight reads from the in-memory cache (no DB hit).
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from schemas import QuestionOut, QuestionFilter, UserInfo, Difficulty, QuestionType
from routers.auth import get_current_user
from database import supabase, get_all_subjects, get_topics_for_subject, get_branch_id
from services.test_engine import db_row_to_question_out

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.get("/subjects")
def list_subjects():
    """
    Returns all subjects in the taxonomy.
    Used by frontend to populate the 'Subject' filter dropdown.
    No auth required — public endpoint.
    """
    return {"subjects": get_all_subjects()}


@router.get("/topics")
def list_topics(subject_id: int = Query(..., description="Subject ID from /subjects")):
    """
    Returns all topics under a given subject.
    Used by frontend to populate the 'Topic' filter dropdown
    after a subject is selected.
    No auth required — public endpoint.
    """
    topics = get_topics_for_subject(subject_id)
    if not topics:
        raise HTTPException(status_code=404, detail=f"No topics found for subject_id={subject_id}")
    return {"topics": topics}


@router.get("", response_model=list[QuestionOut])
def get_questions(
    branch_code:   str            = Query(default="DA"),
    subject_id:    int | None     = Query(default=None),
    topic_id:      int | None     = Query(default=None),
    difficulty:    Difficulty | None = Query(default=None),
    question_type: QuestionType | None = Query(default=None),
    is_pyq:        bool | None    = Query(default=None),
    marks:         int | None     = Query(default=None),
    limit:         int            = Query(default=20, le=100),
    offset:        int            = Query(default=0),
    current_user:  UserInfo       = Depends(get_current_user),
):
    """
    Filtered question listing. Used by:
      - Admin panel (review questions)
      - Future: student 'practice' mode (browse by topic)

    response_model=list[QuestionOut] means FastAPI will:
      1. Take whatever we return
      2. Validate it against QuestionOut
      3. Strip any fields NOT in QuestionOut (like correct_answer!)
      4. Return clean JSON

    Query params become URL params automatically:
      GET /questions?subject_id=3&difficulty=hard&limit=10
    """
    # Build Supabase query with JOINs for subject/topic names
    query = supabase.table("questions").select(
        "id, question_blocks, question_type, options, marks, "
        "difficulty, is_theory, is_pyq, "
        "subjects(name), topics(name)"
    )

    # Branch filter
    branch_id = get_branch_id(branch_code)
    if branch_id:
        query = query.contains("branch_ids", [branch_id])

    # Optional filters — only applied if the param was provided
    if subject_id is not None:
        query = query.eq("subject_id", subject_id)
    if topic_id is not None:
        query = query.eq("topic_id", topic_id)
    if difficulty is not None:
        query = query.eq("difficulty", difficulty.value)
    if question_type is not None:
        query = query.eq("question_type", question_type.value)
    if is_pyq is not None:
        # Free users can only see non-PYQ unless they specifically filter
        if is_pyq and current_user.plan != "premium":
            raise HTTPException(
                status_code=403,
                detail="PYQ questions are available to premium users only"
            )
        query = query.eq("is_pyq", is_pyq)
    if marks is not None:
        query = query.eq("marks", marks)

    # Pagination
    query = query.range(offset, offset + limit - 1)

    result = query.execute()
    rows = result.data or []

    return [db_row_to_question_out(row) for row in rows]
