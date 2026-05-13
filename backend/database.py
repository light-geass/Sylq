"""
database.py — Single shared Supabase client for the entire backend.

Why a shared client?
  The supabase-py client internally manages an HTTP connection pool.
  Creating a new client per request is wasteful (opens/closes connections).
  One client at module load time = one pool, reused by every request.

Your schema (from core.py analysis):
  branches  → id (int), code (text e.g. "DA")
  subjects  → id (int), name (text)
  topics    → id (int), name (text), subject_id (int FK → subjects)
  questions → see full column list below
  test_sessions → created here (new table you need to add in Supabase)

questions table columns:
  id              uuid (default gen_random_uuid())
  question_blocks jsonb
  question_text   text
  question_type   text  ("MCQ" | "NAT" | "MSQ")
  options         jsonb (array of strings, null for NAT)
  correct_answer  jsonb (string for MCQ, float for NAT, array for MSQ)
  difficulty      text  ("easy" | "medium" | "hard")
  marks           int   (1 or 2)
  branch_ids      int[] (array of branch IDs)
  subject_id      int   FK → subjects
  topic_id        int   FK → topics
  is_pyq          bool
  pyq_year        int   nullable
  is_theory       bool
  explanation     text
  isStructured    bool
  created_at      timestamptz (auto)

test_sessions table (NEW — run the SQL below in Supabase SQL editor):

  CREATE TABLE test_sessions (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         TEXT NOT NULL,                    -- Stores Firebase User ID
      question_ids    JSONB NOT NULL,                   -- ordered list: ["uuid1", "uuid2", ...]
      user_answers    JSONB DEFAULT '{}',               -- {"question_id": "A"} filled on submit
      score           FLOAT,                            -- null until submitted
      total_marks     INT,                              -- max possible marks for this test
      status          TEXT DEFAULT 'active',            -- "active" | "submitted"
      filters         JSONB NOT NULL,                   -- what the user selected when creating
      created_at      TIMESTAMPTZ DEFAULT now(),
      submitted_at    TIMESTAMPTZ                       -- null until submitted
  );

  -- NOTE: RLS with auth.uid() only works with Supabase Auth.
  -- Since we use Firebase + Service Role Key, the backend manages access.
"""

from supabase import create_client, Client
from config import settings

# ── Single shared client ───────────────────────────────────────────────────────
# Uses service_role key so it can bypass Row Level Security.
# The service key is ONLY used server-side — never expose it to the frontend.
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)


# ── Lookup cache (subjects & topics) ─────────────────────────────────────────
# Why cache? These tables almost never change. Caching them avoids
# 2 extra DB round-trips on every /questions request.

_subjects_by_name: dict[str, int] = {}   # {"Machine Learning": 3}
_topics_by_id: dict[int, dict[str, int]] = {}  # {3: {"Regression": 12}}
_branches_by_code: dict[str, int] = {}  # {"DA": 1}


def warm_lookup_cache():
    """
    Called once at startup (from main.py lifespan).
    Fetches all subjects, topics, branches into memory.
    """
    global _subjects_by_name, _topics_by_id, _branches_by_code

    subjects = supabase.table("subjects").select("id, name").execute().data
    _subjects_by_name = {row["name"]: row["id"] for row in subjects}

    topics = supabase.table("topics").select("id, name, subject_id").execute().data
    for row in topics:
        sid = row["subject_id"]
        _topics_by_id.setdefault(sid, {})[row["name"]] = row["id"]

    branches = supabase.table("branches").select("id, code").execute().data
    _branches_by_code = {row["code"]: row["id"] for row in branches}

    print(f"[DB] Cache warmed: {len(_subjects_by_name)} subjects, "
          f"{sum(len(v) for v in _topics_by_id.values())} topics, "
          f"{len(_branches_by_code)} branches")


def get_subject_id(name: str) -> int | None:
    return _subjects_by_name.get(name)


def get_topic_id(name: str, subject_id: int) -> int | None:
    return _topics_by_id.get(subject_id, {}).get(name)


def get_branch_id(code: str) -> int | None:
    return _branches_by_code.get(code)


def get_all_subjects() -> list[dict]:
    return [{"id": v, "name": k} for k, v in _subjects_by_name.items()]


def get_topics_for_subject(subject_id: int) -> list[dict]:
    return [
        {"id": v, "name": k}
        for k, v in _topics_by_id.get(subject_id, {}).items()
    ]
