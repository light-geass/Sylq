"""
services/analysis.py
Phase 5 — AI Post-Test Analysis engine.

Three responsibilities:
  1. generate_study_plan()    — ONE Groq API call → 3-day study plan
  2. calculate_sincerity()    — Pure math, no API → behavioral score
  3. get_recommendations()    — Static dict lookup → YouTube videos

IMPORTANT: This is called once per test and the result is stored in DB.
           Never call Groq again for the same test_id (idempotent endpoint).
"""

import json
import re
from groq import Groq
from config import settings
from services.video_map import get_video_recommendations   # noqa: F401 (re-exported)

# Initialize Groq Client
client = Groq(api_key=settings.groq_api_key)

# ── Study plan prompt ─────────────────────────────────────────────────────────
_PLAN_PROMPT = """\
You are an expert GATE DA (Data Science & AI) exam coach.
A student just completed a mock test. Analyze their results and generate a precise 3-day study plan.

Student performance:
- Overall score: {percentage}%
- Topic-wise breakdown:
{topic_lines}

Rules:
1. Focus on weak topics (< 50%) first, then average topics (50-70%).
2. Each day = 2-3 specific, actionable tasks (not generic advice).
3. Reference the ACTUAL topic names from the breakdown.
4. key_strengths = topics where score >= 70%.
5. key_weaknesses = topics where score < 50%.
6. Return ONLY valid JSON — no markdown, no explanation, no preamble.

Required JSON format:
{{
  "overall_verdict": "One honest sentence about overall performance",
  "days": [
    {{"day": 1, "focus": "Topic name", "tasks": ["Task 1", "Task 2", "Task 3"]}},
    {{"day": 2, "focus": "Topic name", "tasks": ["Task 1", "Task 2", "Task 3"]}},
    {{"day": 3, "focus": "Topic name", "tasks": ["Task 1", "Task 2", "Task 3"]}}
  ],
  "key_strengths": ["topic1", "topic2"],
  "key_weaknesses": ["topic1", "topic2"]
}}"""


def generate_study_plan(topic_summary: list[dict], percentage: float) -> dict:
    """
    Calls Groq API with the topic summary → returns a parsed study plan dict.
    """
    # Format topic lines for the prompt
    lines = []
    for t in topic_summary:
        if t["total"] > 0:
            pct = round(t["score"] / t["total"] * 100)
            lines.append(f"  - {t['topic']}: {t['score']}/{t['total']} marks ({pct}%)")

    topic_lines = "\n".join(lines) if lines else "  - No topic data available"

    prompt = _PLAN_PROMPT.format(
        percentage  = round(percentage, 1),
        topic_lines = topic_lines,
    )

    model_name = "llama-3.1-8b-instant"
    try:
        print(f"[DEBUG] Sending prompt to Groq ({model_name})...")
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=model_name,
            response_format={"type": "json_object"}
        )
        
        raw = chat_completion.choices[0].message.content
        print(f"[DEBUG] Groq raw response received: {raw[:100]}...")

        return json.loads(raw)

    except Exception as e:
        print(f"[Analysis] Groq API error: {e}")
        return _fallback_plan(topic_summary, percentage)


def _fallback_plan(topic_summary: list[dict], percentage: float) -> dict:
    """
    Rule-based fallback if Groq fails.
    No AI — just sorted by score to find weak/strong topics.
    """
    scored = [
        {**t, "pct": round(t["score"] / t["total"] * 100) if t["total"] > 0 else 0}
        for t in topic_summary if t["total"] > 0
    ]
    weak   = [t["topic"] for t in scored if t["pct"] < 50]
    strong = [t["topic"] for t in scored if t["pct"] >= 70]

    verdict = (
        "Excellent performance — focus on maintaining consistency and attempting full-length tests."
        if percentage >= 70
        else "Good effort — targeted practice on your weak topics will push your score above 70%."
        if percentage >= 50
        else "Foundation needs work — revise core concepts before attempting more timed practice."
    )

    days = []
    for i, topic in enumerate(weak[:3], 1):
        days.append({
            "day":   i,
            "focus": topic,
            "tasks": [
                f"Revise the core theory and formulas for {topic}",
                f"Solve 15 focused practice questions on {topic}",
                f"Re-attempt the questions you got wrong on {topic} in this test",
            ]
        })

    if not days:
        days = [{
            "day":   1,
            "focus": "Full revision",
            "tasks": [
                "Review all topic notes",
                "Attempt a 28-question mixed test",
                "Identify new weak areas from the result",
            ]
        }]

    return {
        "overall_verdict":  verdict,
        "days":             days,
        "key_strengths":    strong[:3],
        "key_weaknesses":   weak[:3],
    }


def calculate_sincerity(time_per_question: dict, total_marks: int) -> dict:
    """
    Calculate behavioral insights from time spent per question.
    Pure math — no API call.
    """
    if not time_per_question:
        return {
            "sincerity_score": None,
            "message": "No timing data — test was taken on an older version.",
        }

    times = list(time_per_question.values())
    n     = len(times)
    total = sum(times)

    fast_count     = sum(1 for t in times if t < 15)      # < 15s = likely guess
    overtime_count = sum(1 for t in times if t > 300)     # > 5 min = stuck
    avg_time       = total / n if n > 0 else 0

    # Penalty components
    guess_penalty    = (fast_count / n) * 40              # up to 40 pts
    overtime_penalty = (overtime_count / n) * 20          # up to 20 pts

    # Distribution bonus
    if n > 1:
        mean = avg_time
        variance = sum((t - mean) ** 2 for t in times) / n
        std = variance ** 0.5
        cv  = std / mean if mean > 0 else 1.0             # lower = more consistent
        distribution_bonus = max(0.0, 10.0 * (1 - min(cv, 1.0)))
    else:
        distribution_bonus = 5.0

    score = max(0.0, min(100.0, 100 - guess_penalty - overtime_penalty + distribution_bonus))

    verdict = (
        "Excellent focus — consistent, thoughtful engagement throughout the test."
        if score >= 80
        else "Good effort — a few questions show rushed or prolonged responses."
        if score >= 60
        else "Low sincerity detected — many questions appear randomly guessed. Try timed mock tests to build exam habits."
    )

    return {
        "sincerity_score":            round(score),
        "total_time_mins":            round(total / 60, 1),
        "avg_time_per_question_secs": round(avg_time),
        "fast_guesses":               fast_count,
        "overtime_questions":         overtime_count,
        "verdict":                    verdict,
    }
