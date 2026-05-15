"""
services/analysis.py
Phase 5 — AI Post-Test Analysis engine.

Three responsibilities:
  1. generate_study_plan()    — ONE Gemini API call → 3-day study plan
  2. calculate_sincerity()    — Pure math, no API → behavioral score
  3. get_recommendations()    — Static dict lookup → YouTube videos

IMPORTANT: This is called once per test and the result is stored in DB.
           Never call Gemini again for the same test_id (idempotent endpoint).
"""

import json
import re
from google import genai
from config import settings
from services.video_map import get_video_recommendations   # noqa: F401 (re-exported)

# Initialize Clients
gemini_client = genai.Client(api_key=settings.gemini_api_key)

# ── Study plan prompt ─────────────────────────────────────────────────────────
_PLAN_PROMPT = """\
You are an expert {exam_name} exam coach.
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
  "roadmap": [
    {{"priority": 1, "topic": "Topic name", "action_plan": "Actionable steps to master this topic"}},
    {{"priority": 2, "topic": "Topic name", "action_plan": "Actionable steps to master this topic"}},
    {{"priority": 3, "topic": "Topic name", "action_plan": "Actionable steps to master this topic"}}
  ],
  "key_strengths": ["topic1", "topic2"],
  "key_weaknesses": ["topic1", "topic2"]
}}"""


def generate_study_plan(topic_summary: list[dict], percentage: float, exam_name: str = None) -> dict:
    """
    Calls Gemini API with the topic summary → returns a parsed study plan dict.
    """
    # Format topic lines for the prompt
    lines = []
    for t in topic_summary:
        if t["total"] > 0:
            pct = round(t["score"] / t["total"] * 100)
            lines.append(f"  - {t['topic']}: {t['score']}/{t['total']} marks ({pct}%)")

    topic_lines = "\n".join(lines) if lines else "  - No topic data available"

    prompt = _PLAN_PROMPT.format(
        exam_name   = exam_name or "competitive",
        percentage  = round(percentage, 1),
        topic_lines = topic_lines,
    )

    model_name = "models/gemma-4-31b-it"
    try:
        print(f"[Analysis] Attempting Gemini Study Plan with model: {model_name}")
        
        if not settings.gemini_api_key:
            return _fallback_plan(topic_summary, percentage)

        # Move the context-independent rules to system_instruction for faster processing
        system_instruction = (
            f"You are an expert {exam_name or 'competitive'} exam coach. Analyze test results and return a logical priority sequence of topics to cover. "
            "Rule: Weakest topics (< 50%) MUST be Priority 1 and 2. "
            "Rule: Return ONLY valid JSON. NO markdown. NO preamble."
        )

        response = gemini_client.models.generate_content(
            model=model_name,
            contents=prompt,
            config={
                'system_instruction': system_instruction,
                'response_mime_type': 'application/json',
                'temperature': 0.1,
            }
        )
        
        raw = response.text
        if not raw:
            return _fallback_plan(topic_summary, percentage)

        return json.loads(raw)

    except Exception as e:
        print(f"[Analysis] Gemini API error: {e}")
        # If it's a model not found error, try a standard one?
        if "not found" in str(e).lower():
            print("[Analysis] Attempting recovery with gemini-2.0-flash-lite...")
            try:
                rec_resp = gemini_client.models.generate_content(
                    model="models/gemini-3.1-flash-lite",
                    contents=prompt,
                    config={'response_mime_type': 'application/json'}
                )
                return json.loads(rec_resp.text)
            except Exception: pass
            
        return _fallback_plan(topic_summary, percentage)


def _fallback_plan(topic_summary: list[dict], percentage: float) -> dict:
    """
    Rule-based fallback if Gemini fails.
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

    roadmap = []
    for i, topic in enumerate(weak[:3], 1):
        roadmap.append({
            "priority": i,
            "topic":    topic,
            "action_plan": f"Review core concepts for {topic}, solve 15 practice questions, and analyze mistakes from this test.",
        })

    if not roadmap:
        roadmap = [{
            "priority": 1,
            "topic": "General Review",
            "action_plan": "Review all topic notes, attempt a mixed-topic practice set, and identify new weak areas.",
        }]

    return {
        "overall_verdict":  verdict,
        "roadmap":          roadmap,
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


# ── Holistic Study Plan Prompt ────────────────────────────────────────────────
_HOLISTIC_PLAN_PROMPT = """\
You are a world-class {exam_name} strategist.
Based on the student's aggregate performance across multiple mock tests and their custom preferences, generate a high-performance {duration_label} study roadmap.

Aggregate Performance Data:
{performance_data}

Student's Custom Preferences / Instructions:
{preferences}

Rules for the Roadmap:
1. Divide the plan into 3 to 4 logical "phases". 
   - If it's a 1-day plan, phases could be Morning, Afternoon, Evening.
   - If it's a 7-day plan, phases could be Day 1-2, Day 3-4, Day 5-6, Day 7.
   - If it's a 30-day plan, phases should be Weeks 1 to 4.
2. Ensure the plan heavily focuses on their weak topics from the performance data.
3. Incorporate any custom preferences requested by the student (e.g., specific subjects, daily hours). If preferences are empty, just optimize based on data.
4. For each phase, provide 3-4 specific, high-impact goals.
5. Return ONLY valid JSON. No preamble.

Required JSON format:
{{
  "executive_summary": "A high-level view of their preparation status and strategy (2-3 sentences)",
  "duration_label": "{duration_label}",
  "phases": [
    {{
      "title": "Name of the phase (e.g., 'Phase 1: Critical Recovery (Week 1)' or 'Morning Session')",
      "focus": "Phase theme or main objective",
      "goals": [
        "Goal 1 with specific sub-tasks",
        "Goal 2 with specific sub-tasks",
        "Goal 3 with specific sub-tasks"
      ]
    }}
  ],
  "daily_routine_tip": "One specific habit change or daily routine tip"
}}"""

def generate_holistic_plan(
    performance_data: str, 
    exam_name: str = "competitive",
    duration_days: int = 30,
    preferences: str = ""
) -> dict:
    """
    Generates a custom roadmap based on aggregate test history and user preferences.
    """
    duration_label = f"{duration_days}-Day" if duration_days > 1 else "1-Day"
    pref_text = preferences if preferences.strip() else "None provided. Rely purely on performance data."

    prompt = _HOLISTIC_PLAN_PROMPT.format(
        exam_name=exam_name,
        performance_data=performance_data,
        duration_label=duration_label,
        preferences=pref_text
    )

    model_name = "models/gemma-4-31b-it"
    try:
        print(f"[Analysis] Generating Holistic 30-Day Plan with model: {model_name}")
        
        if not settings.gemini_api_key:
            return {"error": "API key missing"}

        response = gemini_client.models.generate_content(
            model=model_name,
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'temperature': 0.2,
            }
        )
        
        return json.loads(response.text)
    except Exception as e:
        print(f"[Analysis] Holistic plan error: {e}")
        return {"error": str(e)}

