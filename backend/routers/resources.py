from fastapi import APIRouter, Depends, HTTPException
from database import supabase
from schemas import ResourceOut
from typing import List

router = APIRouter(prefix="/resources", tags=["Resources"])

# ── Fallback Mock Data ──
# Mirrors the frontend data but with exam scoping.
# exam_ids: [1=GATE, 2=JEE Main, 3=JEE Adv, 4=NEET, 5=MHT CET PCM, 6=MHT CET PCB]
MOCK_RESOURCES = [
    # GATE Mindmaps (exam_ids: [1])
    {"id": 1, "title": "Linear Algebra — Complete Mindmap", "category": "mindmaps", "subtitle": "Linear Algebra", "is_free": True, "pages": 8, "exam_ids": [1]},
    {"id": 2, "title": "Probability & Statistics", "category": "mindmaps", "subtitle": "Probability", "is_free": True, "pages": 12, "exam_ids": [1]},
    
    # MHT CET Mindmaps (exam_ids: [5, 6])
    {"id": 101, "title": "MHT CET Physics — Thermodynamics", "category": "mindmaps", "subtitle": "Physics", "is_free": True, "pages": 5, "exam_ids": [5, 6]},
    {"id": 102, "title": "MHT CET Chemistry — Organic Basics", "category": "mindmaps", "subtitle": "Chemistry", "is_free": True, "pages": 7, "exam_ids": [5, 6]},
]

@router.get("/", response_model=List[ResourceOut])
async def get_resources(exam_id: int = None, category: str = None):
    """Fetch resources filtered by exam and category."""
    try:
        query = supabase.table("resources").select("*")
        
        if exam_id is not None:
            query = query.contains("exam_ids", [str(exam_id)])
        if category:
            query = query.eq("category", category)
            
        res = query.execute()
        
        if not res.data:
            # Fallback to mock data
            data = MOCK_RESOURCES
            if exam_id is not None:
                data = [r for r in data if exam_id in (r.get("exam_ids") or [])]
            if category:
                data = [r for r in data if r.get("category") == category]
            return data
            
        return res.data
    except Exception as e:
        # Fallback for table not found
        if "PGRST205" in str(e):
            data = MOCK_RESOURCES
            if exam_id is not None:
                data = [r for r in data if exam_id in (r.get("exam_ids") or [])]
            if category:
                data = [r for r in data if r.get("category") == category]
            return data
        raise HTTPException(status_code=500, detail=str(e))
