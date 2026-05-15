"""
routers/exams.py — Exam taxonomy endpoints.

Provides cascading dropdown data:
  GET /exams              → list all exams
  GET /exams/{id}         → single exam details
  GET /exams/{id}/branches → branches for a branch-based exam (empty for JEE/NEET)
  GET /exams/{id}/subjects → subjects, optionally filtered by branch_id
  GET /exams/{id}/subjects/{sid}/topics → topics for a subject
"""

from fastapi import APIRouter, HTTPException, Query
from database import supabase

router = APIRouter(prefix="/exams", tags=["Exams"])


@router.get("/")
async def list_exams():
    """Return all available exams for the onboarding dropdown."""
    try:
        res = supabase.table("Exam").select("*").order("id").execute()
        return {"exams": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{exam_id}")
async def get_exam(exam_id: int):
    """Return a single exam's details."""
    try:
        res = supabase.table("Exam").select("*").eq("id", exam_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Exam not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{exam_id}/branches")
async def list_branches(exam_id: int):
    """
    Return branches for an exam.
    For exams with has_branches=false (JEE, NEET), returns empty list.
    """
    try:
        # First check if exam has branches
        exam_res = supabase.table("Exam").select("has_branches").eq("id", exam_id).execute()
        if not exam_res.data:
            raise HTTPException(status_code=404, detail="Exam not found")

        if not exam_res.data[0].get("has_branches", False):
            return {"branches": [], "has_branches": False}

        res = supabase.table("branches").select("*").eq("exam_id", exam_id).order("id").execute()
        return {"branches": res.data or [], "has_branches": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{exam_id}/subjects")
async def list_subjects(exam_id: int, branch_id: int = Query(default=None)):
    """
    Return subjects for an exam.
    
    For branch-based exams (GATE): pass ?branch_id=1 to get branch-specific subjects.
    For non-branch exams (JEE): omit branch_id, returns all subjects for that exam.
    """
    try:
        query = supabase.table("subjects").select("*").contains("exam_ids", [str(exam_id)])

        if branch_id is not None:
            query = query.eq("branch_id", branch_id)

        res = query.order("id").execute()
        return {"subjects": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{exam_id}/subjects/{subject_id}/topics")
async def list_topics(exam_id: int, subject_id: int):
    """Return topics for a specific subject within an exam."""
    try:
        res = (
            supabase.table("topics")
            .select("*")
            .contains("exam_ids", [str(exam_id)])
            .eq("subject_id", subject_id)
            .order("id")
            .execute()
        )
        return {"topics": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
