"""
ai_ingest_pdf.py — AI-first PDF ingestion (layout + JSON schema)

What this does:
1) Renders each PDF page to image
2) Vision model extracts questions into strict JSON
3) Text model fixes/normalizes JSON format
4) Crops diagram bboxes, uploads to storage, swaps image refs -> URLs
5) Builds QuestionIn objects and inserts into Supabase (or dry-run)

Usage:
  py -3 ai_ingest_pdf.py --pdf "Gate_DA2025.pdf" --year 2025 --branch DA --dry-run
  py -3 ai_ingest_pdf.py --pdf "Gate_DA2025.pdf" --year 2025 --branch DA --no-pyq

Notes:
- Uses Groq multimodal + text models.
- For PYQ mode, if answer_key is missing from extraction, question is skipped.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import time
from dataclasses import dataclass
from typing import Any
from urllib import request
from urllib.error import HTTPError

import fitz
from tqdm import tqdm
from dotenv import load_dotenv

from core import (
    QuestionIn,
    QuestionType,
    groq_client,
    insert_question,
    make_image_block,
    make_latex_block,
    make_text_block,
    solve_and_tag_with_ai,
    tag_with_ai,
    upload_to_storage,
)
from ingest_pdf_v2 import parse_answer_key_pdf


from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(), override=True)


EXTRACT_PROMPT = """
You are an exam-ingestion engine for GATE DA papers.

Goal:
Extract each question from the provided page image into strict JSON.

Rules:
1) Return ONLY valid JSON. No markdown, no explanation.
2) Preserve question order and numbering exactly.
3) Detect question types: MCQ / MSQ / NAT.
4) Build ordered question_blocks:
   - {"type":"text","body":"..."}
   - {"type":"latex","body":"..."}
   - {"type":"image","ref":"img_<id>"}
5) For every detected figure/diagram region, return bbox in image pixel coordinates.
6) Do not drop symbols; emit LaTeX blocks where math is clear.
7) Keep options separate from question stem.
8) If uncertain, still return best output with low_confidence=true.
9) Never hallucinate missing content.

Output schema:
{
  "paper_meta": {
    "exam": "GATE",
    "branch": "DA",
    "year": <int_or_null>,
    "source_pages": [<int>]
  },
  "questions": [
    {
      "question_number": "<string>",
      "question_type": "MCQ|MSQ|NAT",
      "marks": 1|2|null,
      "question_blocks": [
        {"type":"text","body":"..."},
        {"type":"latex","body":"..."},
        {"type":"image","ref":"img_q<qn>_<k>"}
      ],
      "options": ["...", "...", "...", "..."] | null,
      "answer_key": "A|B|C|D|number|[A,C]|null",
      "images": [
        {
          "ref": "img_q<qn>_<k>",
          "page": <int>,
          "bbox": {"x1": <float>, "y1": <float>, "x2": <float>, "y2": <float>}
        }
      ],
      "low_confidence": false,
      "confidence_notes": null
    }
  ]
}
""".strip()


FIX_PROMPT = """
You are a strict JSON validator for exam-ingestion output.

Task:
- Repair the JSON to match the schema.
- Keep only valid keys.
- Ensure question_blocks are non-empty and ordered.
- Ensure every image ref used in question_blocks exists in images[].
- Ensure question_type is one of MCQ/MSQ/NAT.
- Return ONLY JSON.

JSON input:
{payload}
""".strip()


@dataclass
class PageImage:
    page_num: int
    width: int
    height: int
    png_bytes: bytes


def _strip_code_fence(raw: str) -> str:
    payload = (raw or "").strip()
    if payload.startswith("```"):
        parts = payload.split("```")
        payload = parts[1] if len(parts) > 1 else payload
        if payload.startswith("json"):
            payload = payload[4:]
    return payload.strip()


def _json_load(raw: str) -> dict[str, Any]:
    return json.loads(_strip_code_fence(raw))


def render_pages(pdf_path: str, start_page: int = 1, end_page: int | None = None, dpi: int = 220) -> list[PageImage]:
    doc = fitz.open(pdf_path)
    try:
        start_idx = max(0, start_page - 1)
        end_idx = (len(doc) - 1) if end_page is None else min(len(doc) - 1, end_page - 1)
        out: list[PageImage] = []
        for i in range(start_idx, end_idx + 1):
            page = doc[i]
            pix = page.get_pixmap(dpi=dpi, alpha=False)
            out.append(PageImage(page_num=i + 1, width=pix.width, height=pix.height, png_bytes=pix.tobytes("png")))
        return out
    finally:
        doc.close()


def call_vision_extract(page: PageImage, year: int, branch: str, vision_model: str) -> dict[str, Any]:
    b64 = base64.b64encode(page.png_bytes).decode("utf-8")
    content = [
        {
            "type": "text",
            "text": EXTRACT_PROMPT + f"\n\nPage context: branch={branch}, year={year}, page={page.page_num}",
        },
        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
    ]
    resp = groq_client.chat.completions.create(
        model=vision_model,
        messages=[{"role": "user", "content": content}],
        temperature=0.0,
        max_tokens=6000,
    )
    return _json_load(resp.choices[0].message.content)


def call_gemini_extract(page: PageImage, year: int, branch: str, gemini_model: str) -> dict[str, Any]:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing in environment/.env")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": EXTRACT_PROMPT + f"\n\nPage context: branch={branch}, year={year}, page={page.page_num}",
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": base64.b64encode(page.png_bytes).decode("utf-8"),
                        }
                    },
                ]
            }
        ],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }
    req = request.Request(
        url=url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=300) as res:
            body = json.loads(res.read().decode("utf-8"))

    except HTTPError as e:
        err_text = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini HTTP {e.code}: {err_text}") from e

    candidates = body.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini returned no candidates: {body}")
    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text"))
    if not text:
        raise RuntimeError(f"Gemini returned empty text payload: {body}")
    return _json_load(text)


def call_json_fixer(payload: dict[str, Any], fix_model: str) -> dict[str, Any]:
    resp = groq_client.chat.completions.create(
        model=fix_model,
        messages=[{"role": "user", "content": FIX_PROMPT.format(payload=json.dumps(payload, ensure_ascii=False))}],
        temperature=0.0,
        max_tokens=4000,
    )
    return _json_load(resp.choices[0].message.content)


def normalize_blocks(blocks: list[dict[str, Any]] | None) -> list[dict]:
    out: list[dict] = []
    for b in blocks or []:
        btype = str(b.get("type", "")).strip().lower()
        if btype == "text" and b.get("body"):
            out.append(make_text_block(str(b["body"])))
        elif btype == "latex" and b.get("body"):
            out.append(make_latex_block(str(b["body"])))
        elif btype == "image" and b.get("url"):
            out.append(make_image_block(str(b["url"])))
    if not out:
        out.append(make_text_block("[UNPARSED QUESTION CONTENT]"))
    return out


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def crop_and_upload_image(
    doc: fitz.Document,
    page_num: int,
    bbox: dict[str, Any],
    storage_path: str,
    dry_run: bool,
) -> str | None:
    page = doc[page_num - 1]
    x1 = float(bbox.get("x1", 0))
    y1 = float(bbox.get("y1", 0))
    x2 = float(bbox.get("x2", 0))
    y2 = float(bbox.get("y2", 0))

    # Clamp to page bounds in PDF coordinate space.
    x1 = _clamp(x1, 0, page.rect.width)
    x2 = _clamp(x2, 0, page.rect.width)
    y1 = _clamp(y1, 0, page.rect.height)
    y2 = _clamp(y2, 0, page.rect.height)
    if x2 <= x1 or y2 <= y1:
        return None

    clip = fitz.Rect(x1, y1, x2, y2)
    pix = page.get_pixmap(clip=clip, dpi=300, alpha=False)
    png = pix.tobytes("png")
    if dry_run:
        return f"[DRY-RUN] {storage_path}"
    return upload_to_storage(png, storage_path, content_type="image/png")


def replace_image_refs_with_urls(
    qn: str,
    q_blocks: list[dict[str, Any]],
    images: list[dict[str, Any]],
    doc: fitz.Document,
    year: int,
    branch: str,
    dry_run: bool,
) -> list[dict]:
    ref_to_url: dict[str, str] = {}
    for idx, img in enumerate(images or []):
        ref = str(img.get("ref", "")).strip()
        page = int(img.get("page", 1))
        bbox = img.get("bbox") or {}
        if not ref:
            continue
        path = f"{year}/{branch}/Q{qn}_ai_{idx+1}.png"
        url = crop_and_upload_image(doc, page, bbox, path, dry_run=dry_run)
        if url:
            ref_to_url[ref] = url

    normalized: list[dict] = []
    for block in q_blocks or []:
        btype = str(block.get("type", "")).lower()
        if btype == "image":
            ref = str(block.get("ref", "")).strip()
            url = ref_to_url.get(ref)
            if url:
                normalized.append(make_image_block(url))
        elif btype == "latex" and block.get("body"):
            normalized.append(make_latex_block(str(block["body"])))
        elif btype == "text" and block.get("body"):
            normalized.append(make_text_block(str(block["body"])))
    return normalized


def coerce_question_type(raw: str) -> QuestionType:
    val = str(raw or "").strip().upper()
    if val == "MSQ":
        return QuestionType.MSQ
    if val == "NAT":
        return QuestionType.NAT
    return QuestionType.MCQ


def should_be_structured(blocks: list[dict]) -> bool:
    has_image = any(b.get("type") == "image" for b in blocks)
    has_latex = any(b.get("type") == "latex" for b in blocks)
    return not (has_image or has_latex)


def ingest_with_ai(
    pdf_path: str,
    year: int,
    branch: str,
    is_pyq: bool,
    dry_run: bool,
    start_page: int,
    end_page: int | None,
    extractor: str,
    vision_model: str,
    gemini_model: str,
    fix_model: str,
    answer_pdf: str | None = None,
) -> None:
    # Load answer key if provided
    answer_key = {}
    if is_pyq and answer_pdf:
        print(f"Loading answer key from {answer_pdf}...")
        answer_key = parse_answer_key_pdf(answer_pdf)

    pages = render_pages(pdf_path, start_page=start_page, end_page=end_page, dpi=220)

    print(f"Pages prepared: {len(pages)}")

    all_questions: list[dict[str, Any]] = []
    for page in tqdm(pages, desc="AI extract pages"):
        try:
            time.sleep(10) # 10s sleep as requested by user
            if extractor == "gemini":


                raw = call_gemini_extract(page, year=year, branch=branch, gemini_model=gemini_model)
            else:
                raw = call_vision_extract(page, year=year, branch=branch, vision_model=vision_model)
            fixed = call_json_fixer(raw, fix_model=fix_model)
            all_questions.extend(fixed.get("questions", []))
        except Exception as e:
            print(f"[WARN] Page {page.page_num} extraction failed: {e}")

    # De-duplicate by question_number while preserving first occurrence order.
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for q in all_questions:
        qn = str(q.get("question_number", "")).strip()
        if not qn or qn in seen:
            continue
        seen.add(qn)
        deduped.append(q)

    print(f"Questions extracted by AI: {len(deduped)}")

    inserted = skipped = failed = 0
    with fitz.open(pdf_path) as doc:
        for qd in tqdm(deduped, desc="Normalize + ingest"):
            qn = str(qd.get("question_number", "")).strip()
            qtype = coerce_question_type(qd.get("question_type"))
            marks = int(qd.get("marks") or 1)
            if marks not in (1, 2):
                marks = 1

            raw_blocks = qd.get("question_blocks") or []
            images = qd.get("images") or []
            blocks = replace_image_refs_with_urls(
                qn=qn,
                q_blocks=raw_blocks,
                images=images,
                doc=doc,
                year=year,
                branch=branch,
                dry_run=dry_run,
            )
            blocks = normalize_blocks(blocks)

            options = qd.get("options")
            if options is not None and not isinstance(options, list):
                options = None

            answer = qd.get("answer_key")
            # Override with official answer key if available
            if is_pyq and qn in answer_key:
                answer = answer_key[qn]

            if answer in ("null", "", None):

                if is_pyq:
                    skipped += 1
                    continue
                answer = "PENDING"

            try:
                q = QuestionIn(
                    question_blocks=blocks,
                    question_type=qtype,
                    options=options,
                    correct_answer=answer,
                    marks=marks,
                    branch_code=branch,
                    is_pyq=is_pyq,
                    pyq_year=year if is_pyq else None,
                    question_number=qn or None,
                    is_structured=should_be_structured(blocks),
                )
            except Exception as e:
                print(f"[Q.{qn}] validation failed: {e}")
                failed += 1
                continue

            # AI enrichment
            try:
                if is_pyq:
                    q = tag_with_ai(q)
                else:
                    q = solve_and_tag_with_ai(q)
            except Exception as e:
                print(f"[Q.{qn}] tagging/solve failed: {e}")

            print(f"\nQ.{qn} [{q.question_type.value}] {q.marks}mk")
            print(f"  Subject: {q.subject_name} | Topic: {q.topic_name} | Difficulty: {q.difficulty.value}")
            print(f"  Blocks : {len(q.question_blocks)}")

            if dry_run:
                inserted += 1
                print("  [DRY RUN] skipped insert")
                continue

            row = insert_question(q)
            if row:
                inserted += 1
            else:
                failed += 1

    print("\n" + "=" * 60)
    print("AI ingestion done")
    print(f"Inserted: {inserted}")
    print(f"Skipped : {skipped}")
    print(f"Failed  : {failed}")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI-first ingestion for GATE PDFs")
    parser.add_argument("--pdf", required=True, help="Path to PDF")
    parser.add_argument("--year", required=True, type=int, help="Exam year")
    parser.add_argument("--branch", default="DA", help="Branch code")
    parser.add_argument("--no-pyq", action="store_true", help="Non-PYQ mode (AI solves answers)")
    parser.add_argument("--dry-run", action="store_true", help="Do not insert DB rows")
    parser.add_argument("--start-page", type=int, default=1, help="Start page (1-based)")
    parser.add_argument("--end-page", type=int, default=None, help="End page (1-based)")
    parser.add_argument("--extractor", choices=["gemini", "groq"], default="gemini", help="Primary vision extractor")
    parser.add_argument(
        "--vision-model",
        default="llama-3.2-90b-vision-preview",
        help="Groq multimodal model",
    )
    parser.add_argument("--gemini-model", default="gemini-3-flash-preview", help="Gemini vision model")



    parser.add_argument("--fix-model", default="llama-3.1-8b-instant", help="Groq text model for JSON fixing")
    parser.add_argument("--answer-pdf", help="Path to official answer key PDF")
    args = parser.parse_args()


    ingest_with_ai(
        pdf_path=args.pdf,
        year=args.year,
        branch=args.branch,
        is_pyq=not args.no_pyq,
        dry_run=args.dry_run,
        start_page=args.start_page,
        end_page=args.end_page,
        extractor=args.extractor,
        vision_model=args.vision_model,
        gemini_model=args.gemini_model,
        fix_model=args.fix_model,
        answer_pdf=args.answer_pdf,
    )

