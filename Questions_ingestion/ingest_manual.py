"""
ingest_manual.py — Ingest questions from Word (.docx) files or a CSV template

Usage:
    python ingest_manual.py --docx "my_questions.docx"
    python ingest_manual.py --csv  "my_questions.csv"
    python ingest_manual.py --csv  "my_questions.csv" --dry-run

─────────────────────────────────────────────────────────────
WORD DOC FORMAT (.docx)
─────────────────────────────────────────────────────────────
Write questions in this exact format (one block per question):

Q: What is the rank of the identity matrix of order 3?
TYPE: MCQ
A: 1
B: 2
C: 3
D: 4
ANSWER: C
MARKS: 1
PYQ: NO

Q: The trace of a matrix is defined as _____.
TYPE: NAT
ANSWER: 6
MARKS: 2
PYQ: YES
YEAR: 2021

─────────────────────────────────────────────────────────────
CSV FORMAT
─────────────────────────────────────────────────────────────
Headers: question_text,question_type,option_a,option_b,option_c,option_d,correct_answer,marks,is_pyq,pyq_year

Example row (MCQ):
"What is the rank of I_3?",MCQ,1,2,3,4,C,1,FALSE,

Example row (NAT - leave options empty):
"The trace of A is _____.",NAT,,,,,,6,2,FALSE,

Example row (MSQ - answer as "A,C"):
"Which are properties of eigenvalues?",MSQ,det=product,trace=sum,always real,always positive,"A,B",2,TRUE,2020
"""

import os
import csv
import re
import time
import argparse
from docx import Document
from tqdm import tqdm
from core import QuestionIn, QuestionType, tag_with_ai, insert_question


# ── Word doc parser ────────────────────────────────────────────────────────────

def parse_docx(docx_path: str) -> list[dict]:
    """Parse questions from a Word document using the Q:/TYPE:/ANSWER: format."""
    doc = Document(docx_path)
    full_text = "\n".join(p.text for p in doc.paragraphs)
    return parse_question_blocks(full_text)


def parse_question_blocks(text: str) -> list[dict]:
    """
    Split text into question blocks at 'Q:' markers and parse each.
    Returns list of raw question dicts.
    """
    blocks = re.split(r'\nQ:', text, flags=re.IGNORECASE)
    questions = []

    for block in blocks:
        block = ("Q:" + block).strip() if not block.startswith("Q:") else block.strip()
        if not block.lower().startswith("q:"):
            continue

        lines = [l.strip() for l in block.splitlines() if l.strip()]
        q = {}

        for line in lines:
            if line.lower().startswith("q:"):
                q["text"] = line[2:].strip()
            elif line.upper().startswith("TYPE:"):
                q["type"] = line.split(":", 1)[1].strip().upper()
            elif line.upper().startswith("A:"):
                q["option_a"] = line[2:].strip()
            elif line.upper().startswith("B:"):
                q["option_b"] = line[2:].strip()
            elif line.upper().startswith("C:"):
                q["option_c"] = line[2:].strip()
            elif line.upper().startswith("D:"):
                q["option_d"] = line[2:].strip()
            elif line.upper().startswith("ANSWER:"):
                q["answer"] = line.split(":", 1)[1].strip()
            elif line.upper().startswith("MARKS:"):
                q["marks"] = int(line.split(":", 1)[1].strip())
            elif line.upper().startswith("PYQ:"):
                q["is_pyq"] = line.split(":", 1)[1].strip().upper() == "YES"
            elif line.upper().startswith("YEAR:"):
                q["pyq_year"] = int(line.split(":", 1)[1].strip())

        if "text" in q and "answer" in q and "type" in q:
            questions.append(q)

    return questions


def build_question_from_dict(row: dict, branch: str) -> QuestionIn | None:
    """Convert a parsed dict (from docx or CSV) into a validated QuestionIn."""
    try:
        q_type = QuestionType(row.get("type", row.get("question_type", "MCQ")).upper())
        marks  = int(row.get("marks", 1))
        answer = row.get("answer", row.get("correct_answer", ""))
        is_pyq = str(row.get("is_pyq", "false")).lower() in ("true", "yes", "1")
        pyq_year_raw = row.get("pyq_year", "")
        pyq_year = int(pyq_year_raw) if str(pyq_year_raw).strip() else None

        # Build options
        options = None
        if q_type in (QuestionType.MCQ, QuestionType.MSQ):
            opts = [
                row.get("option_a", ""), row.get("option_b", ""),
                row.get("option_c", ""), row.get("option_d", ""),
            ]
            options = [o for o in opts if o]
            if not options:
                print(f"  [SKIP] MCQ/MSQ question has no options: {str(row.get('text',''))[:50]}")
                return None

        # MSQ: answer stored as "A,C"
        if "," in str(answer):
            answer = [a.strip() for a in str(answer).split(",")]

        return QuestionIn(
            question_text=row.get("text", row.get("question_text", "")),
            question_type=q_type,
            options=options,
            correct_answer=answer,
            marks=marks,
            branch_code=branch,
            is_pyq=is_pyq,
            pyq_year=pyq_year,
        )
    except Exception as e:
        print(f"  [SKIP] Build error: {e}")
        return None


# ── Ingest functions ───────────────────────────────────────────────────────────

def ingest_docx(docx_path: str, branch: str = "DA", dry_run: bool = False):
    print(f"\n  Parsing Word doc: {docx_path}")
    raw_questions = parse_docx(docx_path)
    print(f"  Found {len(raw_questions)} questions\n")
    process_questions(raw_questions, branch, dry_run)


def ingest_csv(csv_path: str, branch: str = "DA", dry_run: bool = False):
    print(f"\n  Reading CSV: {csv_path}")
    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"  Found {len(rows)} rows\n")
    process_questions(rows, branch, dry_run)


def process_questions(raw_list: list[dict], branch: str, dry_run: bool):
    inserted = failed = skipped = 0

    for row in tqdm(raw_list, desc="Processing"):
        q = build_question_from_dict(row, branch)
        if not q:
            skipped += 1
            continue

        # AI tagging
        q = tag_with_ai(q)
        print(f"\n  [{q.question_type.value}] {q.subject_name} / {q.topic_name} / {q.difficulty.value}")
        print(f"    {q.question_text[:80]}...")

        if dry_run:
            print("    [DRY RUN]")
            inserted += 1
            continue

        result = insert_question(q)
        if result:
            inserted += 1
        else:
            failed += 1

        time.sleep(2)

    print(f"\n  Done — Inserted: {inserted} | Failed: {failed} | Skipped: {skipped}")


# ── CSV template generator ─────────────────────────────────────────────────────

def generate_csv_template(output_path: str = "questions_template.csv"):
    """Generate a blank CSV template to fill in manually."""
    headers = [
        "question_text", "question_type", "option_a", "option_b",
        "option_c", "option_d", "correct_answer", "marks", "is_pyq", "pyq_year"
    ]
    examples = [
        [
            "What is the determinant of a 3x3 identity matrix?",
            "MCQ", "0", "1", "3", "-1", "B", "1", "FALSE", ""
        ],
        [
            "The rank of a 4x4 all-ones matrix is _____.",
            "NAT", "", "", "", "", "1", "2", "FALSE", ""
        ],
        [
            "Which of the following are properties of a symmetric matrix?",
            "MSQ", "All eigenvalues are real", "Eigenvectors are orthogonal",
            "det is always positive", "Trace equals determinant", "A,B", "2", "TRUE", "2022"
        ],
    ]

    import csv
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(examples)

    print(f"  CSV template created: {output_path}")
    print(f"  Fill it in and run: python ingest_manual.py --csv {output_path}")


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest questions from Word doc or CSV")
    parser.add_argument("--docx",     help="Path to .docx file")
    parser.add_argument("--csv",      help="Path to .csv file")
    parser.add_argument("--template", action="store_true", help="Generate blank CSV template")
    parser.add_argument("--branch",   default="DA")
    parser.add_argument("--dry-run",  action="store_true")
    args = parser.parse_args()

    if args.template:
        generate_csv_template()
    elif args.docx:
        ingest_docx(args.docx, args.branch, args.dry_run)
    elif args.csv:
        ingest_csv(args.csv, args.branch, args.dry_run)
    else:
        print("Usage:")
        print("  Word doc : python ingest_manual.py --docx questions.docx")
        print("  CSV      : python ingest_manual.py --csv  questions.csv")
        print("  Template : python ingest_manual.py --template")
