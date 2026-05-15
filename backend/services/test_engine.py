"""
services/test_engine.py — The core of the entire platform.

This is where questions get selected for a test. Getting this right
is what makes the platform feel like a real GATE test.

THE SELECTION PROBLEM:
  Given a pool of filtered questions, pick N questions such that:
    - Type ratio is 2 MCQ : 1 NAT : 1 MSQ
    - Mark ratio is 7 two-mark : 6 one-mark (per 13 questions)
    - Questions are shuffled so the order isn't predictable

  Example for 28 questions:
    MCQ = 14, NAT = 7, MSQ = 7
    2-mark = 15, 1-mark = 13  (≈ 7:6 ratio scaled up)

HOW WEIGHTED RANDOM SAMPLING WORKS:
  random.sample(pool, k) picks k items from pool WITHOUT replacement.
  This means no duplicate questions in a test.
  We apply it per bucket (MCQ pool, NAT pool, MSQ pool) separately.

GRACEFUL DEGRADATION:
  If the DB doesn't have enough NAT questions for a strict 2:1:1 ratio,
  we backfill from MCQ (the most abundant type). This prevents empty tests.
"""

import random
from dataclasses import dataclass
from database import supabase
from schemas import TestCreateRequest, QuestionOut, ContentBlock


@dataclass
class QuestionBuckets:
    """Holds questions split by type after fetching from DB."""
    mcq: list[dict]
    nat: list[dict]
    msq: list[dict]

    @property
    def total(self):
        return len(self.mcq) + len(self.nat) + len(self.msq)


def fetch_question_pool(request: TestCreateRequest) -> QuestionBuckets:
    """
    Fetch ALL questions matching the user's filters from Supabase.
    Returns them split into MCQ / NAT / MSQ buckets.

    Why fetch all, not just N?
      We need the full pool to do random sampling. If we only fetched N,
      we'd always get the same N questions (DB default ordering).

    Supabase query building:
      We chain .eq(), .in_(), .contains() calls — each one adds a
      WHERE clause. Supabase's PostgREST translates these to SQL.
    """
    # Start with base query — join subjects + topics for name resolution
    # Supabase select syntax: "table(column)" = JOIN
    query = supabase.table("questions").select(
        "id, question_blocks, question_type, options, marks, "
        "difficulty, is_theory, is_pyq, "
        "subjects(name), topics(name)"
    )

    # ── Apply filters ──────────────────────────────────────────────────────

    # Exam filter: scope questions to the user's exam
    if request.exam_id:
        query = query.contains("exam_ids", [str(request.exam_id)])

    # Branch filter: only for branch-based exams (GATE)
    # branch_ids is an int[] column
    # .contains() → PostgreSQL @> operator: "array contains value"
    if request.branch_code:
        from database import get_branch_id
        branch_id = get_branch_id(request.branch_code)
        if branch_id:
            query = query.contains("branch_ids", [str(branch_id)])

    # Subject filter
    if request.subject_ids:
        query = query.in_("subject_id", request.subject_ids)

    # Topic filter
    if request.topic_ids:
        query = query.in_("topic_id", request.topic_ids)

    # Difficulty filter
    if request.difficulty:
        query = query.eq("difficulty", request.difficulty.value)

    # PYQ filter — premium gate is checked in the router, not here
    if request.pyq_only:
        query = query.eq("is_pyq", True)

    # Question Type filter
    if request.question_types:
        query = query.in_("question_type", request.question_types)

    # Execute
    print(f"[DEBUG] Executing Supabase query for question pool...")
    result = query.execute()
    print(f"[DEBUG] Query complete. Found {len(result.data or [])} questions.")
    all_questions = result.data or []

    # ── Split into buckets ─────────────────────────────────────────────────
    mcq, nat, msq = [], [], []
    for q in all_questions:
        qt = q.get("question_type", "")
        if qt == "MCQ":
            mcq.append(q)
        elif qt == "NAT":
            nat.append(q)
        elif qt == "MSQ":
            msq.append(q)

    return QuestionBuckets(mcq=mcq, nat=nat, msq=msq)

from services.exam_rules import get_exam_type_counts, apply_mark_distribution

def select_questions(request: TestCreateRequest, exam_name: str | None = None) -> list[dict]:
    """
    MAIN ENTRY POINT for test generation.

    Full selection pipeline:
      1. Fetch filtered question pool from DB
      2. Calculate type counts (2:1:1 MCQ:NAT:MSQ)
      3. Random sample from each type bucket
      4. Gracefully backfill if any bucket is short
      5. Enforce 7:6 mark ratio
      6. Shuffle final list so order isn't predictable
      7. Return

    Returns list of raw DB dicts (not yet converted to QuestionOut).
    The router handles schema conversion.
    """
    try:
        total = request.total_questions  # plain int now (e.g. 75 for JEE, 180 for NEET)
        mcq_need, nat_need, msq_need = get_exam_type_counts(exam_name, total)

        # ── Step 1: Fetch pools ────────────────────────────────────────────────
        buckets = fetch_question_pool(request)
        print(f"[DEBUG] Fetched questions: MCQ={len(buckets.mcq)}, NAT={len(buckets.nat)}, MSQ={len(buckets.msq)}, Total={buckets.total}")
        print(f"[DEBUG] Request filters: branch={request.branch_code}, subjects={request.subject_ids}, topics={request.topic_ids}, types={request.question_types}, difficulty={request.difficulty}")

        if buckets.total == 0:
            return []   # No questions match filters — caller handles this

        # ── Step 2: Sample from each bucket ───────────────────────────────────
        mcq_selected = random.sample(buckets.mcq, min(mcq_need, len(buckets.mcq)))
        nat_selected = random.sample(buckets.nat, min(nat_need, len(buckets.nat)))
        msq_selected = random.sample(buckets.msq, min(msq_need, len(buckets.msq)))

        # ── Step 3: Backfill shortfalls with MCQ ──────────────────────────────
        selected_count = len(mcq_selected) + len(nat_selected) + len(msq_selected)
        shortfall = total - selected_count

        if shortfall > 0:
            remaining_mcq = [q for q in buckets.mcq if q not in mcq_selected]
            backfill = random.sample(remaining_mcq, min(shortfall, len(remaining_mcq)))
            mcq_selected.extend(backfill)

        # ── Step 4: Combine and apply mark ratio ──────────────────────────────
        all_selected = mcq_selected + nat_selected + msq_selected
        all_selected = apply_mark_distribution(exam_name, all_selected, len(all_selected))

        # ── Step 5: Shuffle ────────────────────────────────────────────────────
        random.shuffle(all_selected)
        return all_selected

    except Exception as e:
        print("\n" + "!"*60)
        print(f"CRITICAL ENGINE ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("!"*60 + "\n")
        raise e


# ── Schema conversion helpers ─────────────────────────────────────────────────

def db_row_to_question_out(row: dict) -> QuestionOut:
    """
    Convert a raw Supabase DB row to a QuestionOut schema object.

    Why a separate converter?
      The DB row has nested dicts from JOINs (e.g. row["subjects"]["name"]).
      Pydantic doesn't auto-map these — we do it manually here.
      Keeping this in test_engine.py means the router stays clean.
    """
    # Supabase JOIN returns nested: {"subjects": {"name": "Machine Learning"}}
    subject_name = None
    topic_name   = None  

    if row.get("subjects") and isinstance(row["subjects"], dict):
        subject_name = row["subjects"].get("name")
    if row.get("topics") and isinstance(row["topics"], dict):
        topic_name = row["topics"].get("name")

    # question_blocks is already a list of dicts from JSONB
    blocks = [ContentBlock(**b) for b in (row.get("question_blocks") or [])]

    return QuestionOut(
        id              = str(row["id"]),
        question_blocks = blocks,
        question_type   = row["question_type"].upper(),
        options         = row.get("options"),
        marks           = row["marks"],
        subject_name    = subject_name,
        topic_name      = topic_name,
        difficulty      = row["difficulty"].lower(),
        is_theory       = row.get("is_theory", True),
    )


def calculate_total_marks(questions: list[dict]) -> int:
    """Sum up marks for all selected questions."""
    return sum(q.get("marks", 1) for q in questions)
