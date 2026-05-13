"""
ingest_image.py — Extract & ingest questions from images (JPG/PNG)
Use this for scanned question papers or screenshots of questions.

Usage:
    python ingest_image.py --image "q1.jpg" --type MCQ --answer "B" --marks 1
    python ingest_image.py --folder "questions_folder/" --answer-csv "answers.csv"

For a folder of images + a CSV answer key:
    CSV format (answers.csv):
        filename,question_type,correct_answer,marks
        q1.jpg,MCQ,B,1
        q2.jpg,NAT,6.5,2
        q3.jpg,MSQ,"A,C",2
"""

import os
import csv
import argparse
import time
import easyocr
from PIL import Image
from tqdm import tqdm
from core import QuestionIn, QuestionType, tag_with_ai, insert_question

# EasyOCR reader (download model on first run ~100MB, then cached)
# ['en'] = English only. Add 'hi' for Hindi if needed.
reader = easyocr.Reader(['en'], gpu=False)  # set gpu=True if you have CUDA


def extract_text_from_image(image_path: str) -> str:
    """
    Run EasyOCR on an image and return cleaned extracted text.
    Works best on clear, high-contrast images.
    """
    results = reader.readtext(image_path, detail=0, paragraph=True)
    text = "\n".join(results)
    return text.strip()


def ingest_single_image(
    image_path: str,
    q_type: QuestionType,
    correct_answer,
    marks: int,
    branch: str = "DA",
    is_pyq: bool = False,
    pyq_year: int = None,
    dry_run: bool = False,
) -> bool:
    """Extract text from one image and insert the question."""
    print(f"\n  Processing: {os.path.basename(image_path)}")

    # OCR extraction
    text = extract_text_from_image(image_path)
    if len(text) < 10:
        print(f"  [SKIP] OCR returned too little text: '{text}'")
        return False

    print(f"  Extracted text ({len(text)} chars): {text[:100]}...")

    # Parse options from text if MCQ/MSQ
    options = None
    if q_type in (QuestionType.MCQ, QuestionType.MSQ):
        import re
        option_pattern = re.compile(r'\(([A-D])\)\s*(.*?)(?=\([A-D]\)|\Z)', re.DOTALL)
        matches = option_pattern.findall(text)
        if matches:
            options = [m[1].strip() for m in matches]
            # Remove options from question text
            text = text[:text.find(f"({matches[0][0]})")].strip()

    try:
        q = QuestionIn(
            question_text=text,
            question_type=q_type,
            options=options,
            correct_answer=correct_answer,
            marks=marks,
            branch_code=branch,
            is_pyq=is_pyq,
            pyq_year=pyq_year,
        )
    except Exception as e:
        print(f"  [VALIDATION ERROR] {e}")
        return False

    # AI tagging
    q = tag_with_ai(q)
    print(f"  Tagged → {q.subject_name} / {q.topic_name} / {q.difficulty.value}")

    if dry_run:
        print("  [DRY RUN] Not inserting.")
        return True

    result = insert_question(q)
    if result:
        print(f"  Inserted: {result['id']}")
        return True
    else:
        print("  [FAILED] DB insert failed.")
        return False


def ingest_folder_with_csv(
    folder: str,
    answer_csv: str,
    branch: str = "DA",
    dry_run: bool = False
):
    """Process a folder of images using a CSV answer key."""
    inserted = failed = skipped = 0

    with open(answer_csv, newline="", encoding="utf-8") as f:
        reader_csv = csv.DictReader(f)
        rows = list(reader_csv)

    print(f"\n  Found {len(rows)} entries in CSV")

    for row in tqdm(rows, desc="Processing images"):
        filename = row["filename"].strip()
        image_path = os.path.join(folder, filename)

        if not os.path.exists(image_path):
            print(f"\n  [SKIP] File not found: {image_path}")
            skipped += 1
            continue

        # Parse CSV fields
        q_type = QuestionType(row["question_type"].strip().upper())
        marks  = int(row.get("marks", 1))
        raw_answer = row["correct_answer"].strip()

        # MSQ answers stored as "A,C" in CSV
        if "," in raw_answer:
            correct_answer = [a.strip() for a in raw_answer.split(",")]
        else:
            correct_answer = raw_answer

        is_pyq   = row.get("is_pyq", "false").strip().lower() == "true"
        pyq_year = int(row["pyq_year"]) if row.get("pyq_year", "").strip() else None

        success = ingest_single_image(
            image_path=image_path,
            q_type=q_type,
            correct_answer=correct_answer,
            marks=marks,
            branch=branch,
            is_pyq=is_pyq,
            pyq_year=pyq_year,
            dry_run=dry_run,
        )

        if success:
            inserted += 1
        else:
            failed += 1

        time.sleep(2)  # Groq rate limit buffer

    print(f"\n  Done — Inserted: {inserted} | Failed: {failed} | Skipped: {skipped}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest questions from images")
    parser.add_argument("--image",      help="Single image file path")
    parser.add_argument("--folder",     help="Folder containing multiple images")
    parser.add_argument("--answer-csv", help="CSV file with answers (use with --folder)")
    parser.add_argument("--type",       default="MCQ", help="Question type: MCQ, NAT, MSQ")
    parser.add_argument("--answer",     help="Correct answer (for single image mode)")
    parser.add_argument("--marks",      type=int, default=1, help="1 or 2 marks")
    parser.add_argument("--branch",     default="DA")
    parser.add_argument("--dry-run",    action="store_true")
    args = parser.parse_args()

    if args.folder and args.answer_csv:
        ingest_folder_with_csv(args.folder, args.answer_csv, args.branch, args.dry_run)
    elif args.image and args.answer:
        ingest_single_image(
            image_path=args.image,
            q_type=QuestionType(args.type.upper()),
            correct_answer=args.answer,
            marks=args.marks,
            branch=args.branch,
            dry_run=args.dry_run,
        )
    else:
        print("Usage:")
        print("  Single image : python ingest_image.py --image q1.jpg --type MCQ --answer B --marks 1")
        print("  Folder + CSV : python ingest_image.py --folder ./imgs --answer-csv answers.csv")
