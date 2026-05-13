"""
services/scoring.py — Answer checking and score calculation.

GATE marking scheme:
  MCQ:
    correct   → +marks (1 or 2)
    wrong     → -1/3 for 1-mark, -2/3 for 2-mark  (negative marking)
    skipped   → 0

  NAT (Numerical Answer Type):
    correct   → +marks
    wrong     → 0  (NO negative marking for NAT)
    skipped   → 0

  MSQ (Multiple Select Question):
    all correct  → +marks
    partial      → 0  (no partial credit in GATE)
    any wrong    → 0  (no negative marking for MSQ)
    skipped      → 0

NAT tolerance:
  Numeric answers have a small accepted range (±x%).
  We use ±2% tolerance here to handle floating point input.
"""

from typing import Any


def check_answer(
    question_type: str,
    correct_answer: Any,
    user_answer: Any,
    marks: int,
) -> tuple[bool, float]:
    """
    Returns (is_correct, marks_awarded).
    marks_awarded can be negative (MCQ penalty), 0, or positive.
    """
    if user_answer is None:
        return False, 0.0   # skipped

    if question_type == "MCQ":
        return _check_mcq(correct_answer, user_answer, marks)
    elif question_type == "NAT":
        return _check_nat(correct_answer, user_answer, marks)
    elif question_type == "MSQ":
        return _check_msq(correct_answer, user_answer, marks)
    return False, 0.0


def _check_mcq(correct: Any, user: Any, marks: int) -> tuple[bool, float]:
    # Normalize to string for comparison (handles "A" vs "a")
    if str(correct).strip().upper() == str(user).strip().upper():
        return True, float(marks)
    # Negative marking: -1/3 of marks
    penalty = -round(marks / 3, 4)
    return False, penalty


def _check_nat(correct: Any, user: Any, marks: int) -> tuple[bool, float]:
    try:
        correct_f = float(correct)
        user_f    = float(user)
    except (TypeError, ValueError):
        return False, 0.0

    # 2% tolerance — handles cases like 6.66 vs 6.667
    tolerance = abs(correct_f) * 0.02
    if abs(correct_f - user_f) <= max(tolerance, 0.001):
        return True, float(marks)
    return False, 0.0   # No negative marking for NAT


def _check_msq(correct: Any, user: Any, marks: int) -> tuple[bool, float]:
    # correct and user should both be lists like ["A", "C"]
    try:
        correct_set = {str(x).strip().upper() for x in correct}
        user_set    = {str(x).strip().upper() for x in user}
    except TypeError:
        return False, 0.0

    if correct_set == user_set:
        return True, float(marks)
    return False, 0.0   # No partial credit, no penalty


def build_topic_summary(question_results: list[dict]) -> list[dict]:
    """
    Aggregate per-topic scores for the Phase 5 AI analysis engine.

    Returns:
      [
        {"topic": "Regression", "score": 4.0, "total": 6, "pct": 66.7},
        {"topic": "Eigen Values", "score": 0.0, "total": 4, "pct": 0.0},
        ...
      ]
    Sorted by percentage ascending (weakest topics first — useful for AI).
    """
    topic_data: dict[str, dict] = {}

    for r in question_results:
        topic = r.get("topic_name") or "Unknown"
        if topic not in topic_data:
            topic_data[topic] = {"score": 0.0, "total": 0}
        topic_data[topic]["score"] += max(r["marks_awarded"], 0)  # don't subtract penalties in summary
        topic_data[topic]["total"] += r["marks_possible"]

    summary = []
    for topic, data in topic_data.items():
        pct = round(data["score"] / data["total"] * 100, 1) if data["total"] else 0.0
        summary.append({
            "topic": topic,
            "score": data["score"],
            "total": data["total"],
            "pct":   pct,
        })

    return sorted(summary, key=lambda x: x["pct"])  # weakest first
