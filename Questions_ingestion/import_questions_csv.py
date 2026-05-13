"""
import_questions_csv.py

Directly import questions from CSV into Supabase/Postgres `questions` table.
Designed for mixed JSON/text fields produced by AI exports.

Usage:
  py -3 import_questions_csv.py --csv "corrected_questions.csv" --dry-run
  py -3 import_questions_csv.py --csv "corrected_questions.csv"
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from typing import Any

from core import supabase


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    v = str(value).strip().lower()
    if v in {"true", "t", "1", "yes", "y"}:
        return True
    if v in {"false", "f", "0", "no", "n"}:
        return False
    return default


def _as_int(value: str | None, default: int | None = None) -> int | None:
    if value is None:
        return default
    v = str(value).strip()
    if not v:
        return default
    try:
        return int(float(v))
    except ValueError:
        return default


def _as_json(value: str | None, default: Any) -> Any:
    if value is None:
        return default
    v = str(value).strip()
    if not v or v.lower() == "null":
        return default
    return json.loads(v)


def _as_branch_ids(value: str | None) -> list[int]:
    if not value:
        return []
    v = value.strip()
    if not v:
        return []
    # Expected CSV shape like [1] or [1,2]
    try:
        parsed = json.loads(v)
        if isinstance(parsed, list):
            return [int(x) for x in parsed]
    except Exception:
        pass
    # Fallback: comma-separated
    out = []
    for part in v.replace("[", "").replace("]", "").split(","):
        p = part.strip()
        if p:
            try:
                out.append(int(p))
            except ValueError:
                continue
    return out


def _normalize_correct_answer(raw: str | None, qtype: str) -> Any:
    if raw is None:
        return None
    val = str(raw).strip()
    if not val:
        return None

    # JSON list/object
    if val.startswith("[") or val.startswith("{"):
        try:
            parsed = json.loads(val)
            return parsed
        except Exception:
            pass

    if qtype == "NAT":
        try:
            return float(val)
        except ValueError:
            return val

    if qtype == "MSQ":
        # Support single letter or comma/semicolon separated values
        if len(val) == 1 and val.isalpha():
            return [val.upper()]
        parts = [p.strip().upper() for p in val.replace(";", ",").split(",") if p.strip()]
        return parts if parts else [val.upper()]

    # MCQ default
    return val.upper()


def _plain_text_from_blocks(blocks: list[dict]) -> str:
    parts: list[str] = []
    for b in blocks:
        btype = b.get("type")
        if btype in {"text", "latex"}:
            parts.append(str(b.get("body", "")).strip())
        elif btype == "image":
            parts.append("[IMAGE]")
    return " ".join(p for p in parts if p).strip()


def build_row(src: dict[str, str]) -> dict[str, Any]:
    q_blocks = _as_json(src.get("question_blocks"), default=[])
    if not isinstance(q_blocks, list) or not q_blocks:
        raise ValueError("question_blocks missing/invalid")

    q_type = (src.get("question_type") or "").strip().upper()
    if q_type not in {"MCQ", "MSQ", "NAT"}:
        raise ValueError(f"invalid question_type: {q_type!r}")

    options = _as_json(src.get("options"), default=None)
    correct_answer = _normalize_correct_answer(src.get("correct_answer"), q_type)
    if correct_answer is None:
        raise ValueError("correct_answer missing/invalid")

    difficulty = (src.get("difficulty") or "medium").strip().lower()
    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = "medium"

    marks = _as_int(src.get("marks"), default=1)
    marks = marks if marks in (1, 2) else 1

    subject_id = _as_int(src.get("subject_id"), default=None)
    topic_id = _as_int(src.get("topic_id"), default=None)
    if subject_id is None or topic_id is None:
        raise ValueError("subject_id/topic_id missing")

    row = {
        "question_blocks": q_blocks,
        "question_text": _plain_text_from_blocks(q_blocks),
        "question_type": q_type,
        "options": options,
        "correct_answer": correct_answer,
        "difficulty": difficulty,
        "marks": marks,
        "branch_ids": _as_branch_ids(src.get("branch_ids")),
        "subject_id": subject_id,
        "topic_id": topic_id,
        "is_pyq": _as_bool(src.get("is_pyq"), default=False),
        "pyq_year": _as_int(src.get("pyq_year"), default=None),
        "is_theory": _as_bool(src.get("is_theory"), default=True),
        "explanation": (src.get("explanation") or "").strip(),
        "isStructured": _as_bool(src.get("isStructured"), default=_as_bool(src.get("is_structured"), default=True)),
    }

    created_at = (src.get("created_at") or "").strip()
    if created_at:
        row["created_at"] = created_at
    return row


def _open_csv_with_fallback(csv_path: str):
    encodings = ["utf-8-sig", "cp1252", "latin-1"]
    last_err = None
    for enc in encodings:
        f = None
        try:
            f = open(csv_path, "r", encoding=enc, newline="")
            # Probe header decode quickly; if this fails, try next encoding.
            _ = f.readline()
            f.seek(0)
            return f, enc
        except Exception as e:
            last_err = e
            try:
                if f is not None:
                    f.close()
            except Exception:
                pass
    raise RuntimeError(f"Could not open CSV with supported encodings {encodings}: {last_err}")


def import_csv(csv_path: str, dry_run: bool) -> None:
    inserted = 0
    failed = 0
    unsupported_columns: set[str] = set()

    f, encoding = _open_csv_with_fallback(csv_path)
    print(f"Using CSV encoding: {encoding}")
    with f:
        reader = csv.DictReader(f)
        for idx, src in enumerate(reader, start=2):
            try:
                row = build_row(src)
                if unsupported_columns:
                    row = {k: v for k, v in row.items() if k not in unsupported_columns}
                if dry_run:
                    inserted += 1
                    continue
                try:
                    supabase.table("questions").insert(row).execute()
                except Exception as e:
                    # Auto-learn missing columns from PostgREST schema errors.
                    msg = str(e)
                    m = re.search(r"Could not find the '([^']+)' column", msg)
                    if m:
                        missing = m.group(1)
                        unsupported_columns.add(missing)
                        row_retry = {k: v for k, v in row.items() if k not in unsupported_columns}
                        supabase.table("questions").insert(row_retry).execute()
                    else:
                        raise
                inserted += 1
            except Exception as e:
                failed += 1
                print(f"[ROW {idx}] failed: {e}")

    print("\n" + "=" * 60)
    print("CSV import finished")
    print(f"Inserted: {inserted}")
    print(f"Failed  : {failed}")
    if unsupported_columns:
        print(f"Dropped unknown DB columns automatically: {sorted(unsupported_columns)}")
    print(f"Mode    : {'DRY-RUN' if dry_run else 'WRITE'}")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import questions CSV into Supabase questions table")
    parser.add_argument("--csv", required=True, help="Path to CSV file")
    parser.add_argument("--dry-run", action="store_true", help="Parse/validate only, do not insert")
    args = parser.parse_args()

    import_csv(csv_path=args.csv, dry_run=args.dry_run)
