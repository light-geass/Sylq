from fastapi import APIRouter, Depends, HTTPException
from database import supabase
from routers.auth import get_current_user
from schemas import UserInfo, CourseOut
from typing import List

router = APIRouter(prefix="/courses", tags=["Courses"])

# ── Fallback Mock Data ──
# This is returned if the Supabase 'courses' table doesn't exist yet.
MOCK_COURSES = [
    {
        "id": "c0010000-0000-0000-0000-000000000001",
        "title": "GATE DA Complete Preparation",
        "channel": "Knowledge Gate",
        "platform": "YouTube",
        "duration": "42 hours",
        "rating": 4.8,
        "url": "https://youtube.com",
        "tags": ["Data Science", "Statistics", "ML"],
        "is_paid": False
    },
    {
        "id": "c0010000-0000-0000-0000-000000000002",
        "title": "Linear Algebra for GATE",
        "channel": "Neso Academy",
        "platform": "YouTube",
        "duration": "18 hours",
        "rating": 4.7,
        "url": "https://youtube.com",
        "tags": ["Mathematics", "Linear Algebra"],
        "is_paid": False
    },
    {
        "id": "c0010000-0000-0000-0000-000000000003",
        "title": "Probability & Statistics — Full Course",
        "channel": "Gate Smashers",
        "platform": "YouTube",
        "duration": "26 hours",
        "rating": 4.6,
        "url": "https://youtube.com",
        "tags": ["Probability", "Statistics"],
        "is_paid": False
    },
    {
        "id": "c0010000-0000-0000-0000-000000000004",
        "title": "DBMS for GATE — Complete Playlist",
        "channel": "Gate Smashers",
        "platform": "YouTube",
        "duration": "14 hours",
        "rating": 4.5,
        "url": "https://youtube.com",
        "tags": ["DBMS", "SQL"],
        "is_paid": False
    },
    {
        "id": "c0010000-0000-0000-0000-000000000005",
        "title": "Python for Data Analysis",
        "channel": "freeCodeCamp",
        "platform": "YouTube",
        "duration": "12 hours",
        "rating": 4.9,
        "url": "https://youtube.com",
        "tags": ["Python", "Data Analysis"],
        "is_paid": False
    },
    {
        "id": "c0010000-0000-0000-0000-000000000006",
        "title": "Machine Learning A-Z",
        "channel": "Krish Naik",
        "platform": "YouTube",
        "duration": "35 hours",
        "rating": 4.7,
        "url": "https://youtube.com",
        "tags": ["ML", "AI"],
        "is_paid": False
    },
    {
        "id": "c0010000-0000-0000-0000-000000000101",
        "title": "GATE DA 2026 — Complete Course",
        "provider": "Unacademy",
        "platform": "Unacademy",
        "original_price": 1299900,
        "offer_price": 649900,
        "rating": 4.8,
        "url": "https://unacademy.com",
        "tags": ["All Subjects", "Live Classes"],
        "badge": "BESTSELLER",
        "is_paid": True
    },
    {
        "id": "c0010000-0000-0000-0000-000000000102",
        "title": "GATE DA Complete Package",
        "provider": "BYJU'S Exam Prep",
        "platform": "BYJU'S",
        "original_price": 1599900,
        "offer_price": 799900,
        "rating": 4.6,
        "url": "https://byjus.com",
        "tags": ["Mock Tests", "Video Lectures"],
        "badge": "POPULAR",
        "is_paid": True
    },
    {
        "id": "c0010000-0000-0000-0000-000000000103",
        "title": "Data Science & ML for GATE",
        "provider": "GeeksforGeeks",
        "platform": "GFG",
        "original_price": 999900,
        "offer_price": 499900,
        "rating": 4.7,
        "url": "https://geeksforgeeks.org",
        "tags": ["DS", "ML", "Programming"],
        "badge": "NEW",
        "is_paid": True
    },
    {
        "id": "c0010000-0000-0000-0000-000000000104",
        "title": "GATE Statistics Masterclass",
        "provider": "Udemy",
        "platform": "Udemy",
        "original_price": 399900,
        "offer_price": 49900,
        "rating": 4.5,
        "url": "https://udemy.com",
        "tags": ["Statistics", "Probability"],
        "is_paid": True
    }
]

@router.get("/", response_model=List[CourseOut])
async def get_all_courses():
    """Fetch all courses. Falls back to mock data if table is missing or empty."""
    try:
        res = supabase.table("courses").select("*").execute()
        if not res.data:
            return MOCK_COURSES
        return res.data
    except Exception as e:
        # Check if it's the "table not found" error (PGRST205)
        if "PGRST205" in str(e):
            return MOCK_COURSES
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my", response_model=List[CourseOut])
async def get_my_courses(current_user: UserInfo = Depends(get_current_user)):
    """Fetch user's courses. Returns empty list if table is missing."""
    try:
        res = supabase.table("user_courses") \
            .select("courses(*)") \
            .eq("user_id", current_user.user_id) \
            .execute()
        
        return [row["courses"] for row in res.data if row.get("courses")]
    except Exception as e:
        if "PGRST205" in str(e):
            return []
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/seed")
async def seed_courses():
    """Seed the database with initial course data."""
    try:
        # We use upsert to avoid duplicates if run multiple times
        supabase.table("courses").upsert(MOCK_COURSES).execute()
        return {"status": "success", "message": f"Seeded {len(MOCK_COURSES)} courses."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{course_id}/enroll")
async def enroll_course(course_id: str, current_user: UserInfo = Depends(get_current_user)):
    """Enroll the user. Errors if table is missing."""
    try:
        # Check if course exists
        course = supabase.table("courses").select("id").eq("id", course_id).execute()
        if not course.data:
            # Check if it's in our mock data for demo purposes
            if any(c["id"] == course_id for c in MOCK_COURSES):
                # We can't actually persist this without the table, so we tell the user to run SQL
                raise HTTPException(
                    status_code=400, 
                    detail="Database table 'user_courses' not found. Please run the SQL migration provided in the chat."
                )
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Check if already enrolled
        existing = supabase.table("user_courses") \
            .select("id") \
            .eq("user_id", current_user.user_id) \
            .eq("course_id", course_id) \
            .execute()
        
        if existing.data:
            return {"message": "Already enrolled"}

        # Enroll
        supabase.table("user_courses").insert({
            "user_id": current_user.user_id,
            "course_id": course_id
        }).execute()

        return {"status": "success", "message": "Enrolled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        if "PGRST205" in str(e):
            raise HTTPException(
                status_code=400, 
                detail="Database setup required. Please run the SQL migration provided in the chat."
            )
        raise HTTPException(status_code=500, detail=str(e))
