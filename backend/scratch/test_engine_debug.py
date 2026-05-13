
import sys
import os
sys.path.append(os.getcwd())

from schemas import TestCreateRequest, TestLength
from services.test_engine import select_questions
from unittest.mock import MagicMock

# Mock Supabase
import services.test_engine
services.test_engine.supabase = MagicMock()
services.test_engine.supabase.table().select().contains().in_().eq().execute.return_value.data = [
    {"id": 1, "question_blocks": [{"type": "text", "body": "Q1"}], "question_type": "MCQ", "marks": 1, "difficulty": "easy", "subjects": {"name": "S1"}, "topics": {"name": "T1"}},
    {"id": 2, "question_blocks": [{"type": "text", "body": "Q2"}], "question_type": "NAT", "marks": 2, "difficulty": "medium", "subjects": {"name": "S2"}, "topics": {"name": "T2"}},
] * 50

request = TestCreateRequest(
    branch_code="DA",
    total_questions=TestLength.quick, # 10
)

try:
    questions = select_questions(request)
    print(f"Successfully selected {len(questions)} questions")
    for q in questions[:2]:
        print(q)
except Exception as e:
    print(f"CRASHED: {e}")
    import traceback
    traceback.print_exc()
