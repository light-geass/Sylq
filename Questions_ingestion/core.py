"""
core.py — shared logic for all ingestion scripts
Handles: Pydantic schema, Groq AI tagging, Supabase insertion

ARCHITECTURE: Hybrid JSON Block Storage
─────────────────────────────────────────
Instead of a single `question_text` string, every question is stored as a
list of typed content blocks in a PostgreSQL JSONB column:

    question_blocks = [
        {"type": "text",  "body": "Solve the equation:"},
        {"type": "latex", "body": "x^2 + 5x + 6 = 0"},
        {"type": "image", "url":  "https://storage.link/img.png"},
    ]

This keeps math precise (LaTeX), images lightweight (URLs only), and
text searchable — all inside a single queryable column.
"""

import os
import json
import re
import time
import difflib
from functools import lru_cache
from enum import Enum
from typing import Optional, List, Union
from pydantic import BaseModel, Field, root_validator, validator
from groq import Groq
from supabase import create_client
from dotenv import load_dotenv

import os
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(), override=True)


# ── Clients ────────────────────────────────────────────────────────────────────

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]   # use service key for server-side inserts
)

# ── Enums ──────────────────────────────────────────────────────────────────────

class QuestionType(str, Enum):
    MCQ = "MCQ"
    NAT = "NAT"
    MSQ = "MSQ"

class Difficulty(str, Enum):
    easy   = "easy"
    medium = "medium"
    hard   = "hard"

class BlockType(str, Enum):
    TEXT  = "text"
    LATEX = "latex"
    IMAGE = "image"

# ── Content Block Models ───────────────────────────────────────────────────────

class TextBlock(BaseModel):
    type: str = "text"
    body: str

class LatexBlock(BaseModel):
    type: str = "latex"
    body: str    # LaTeX source, e.g. "\\frac{a}{b}"

class ImageBlock(BaseModel):
    type: str = "image"
    url:  str    # Public URL from Supabase Storage

ContentBlock = Union[TextBlock, LatexBlock, ImageBlock]

# ── Pydantic schema ────────────────────────────────────────────────────────────

class QuestionIn(BaseModel):
    """
    Validated question ready to insert into Supabase.

    `question_blocks` is the canonical rich content — a JSON array of
    text / latex / image blocks.  A plain-text version is auto-derived
    for AI tagging and full-text search.
    """
    # ── Rich Content (JSONB in DB) ──────────────────────────────────────────
    question_blocks: List[dict] = Field(default_factory=list)  # [{"type":"text","body":"..."}, ...]
    # Legacy input compatibility: old ingesters can still pass question_text/image_url.
    question_text: Optional[str] = None
    image_url: Optional[str] = None

    # ── Metadata ────────────────────────────────────────────────────────────
    question_type:  QuestionType
    options:        Optional[List[str]] = None   # None for NAT
    correct_answer: str | int | float | List[str]
    marks:          int                           # 1 or 2

    # Classification (filled by Groq)
    branch_code:    str = "DA"
    subject_name:   str = ""
    topic_name:     str = ""
    difficulty:     Difficulty = Difficulty.medium
    is_theory:      bool = True
    explanation:    str = ""

    # PYQ metadata
    is_pyq:         bool = False
    pyq_year:       Optional[int] = None
    question_number: Optional[str] = None
    is_structured:  bool = True

    @validator("marks")
    def marks_must_be_1_or_2(cls, v):
        if v not in (1, 2):
            raise ValueError("marks must be 1 or 2")
        return v

    @validator("options")
    def options_required_for_mcq_msq(cls, v, values):
        q_type = values.get("question_type")
        if q_type in (QuestionType.MCQ, QuestionType.MSQ) and not v:
            raise ValueError(f"options are required for {q_type}")
        return v

    @validator("pyq_year")
    def year_range(cls, v):
        if v is not None and not (2014 <= v <= 2030):
            raise ValueError("pyq_year must be between 2014 and 2030")
        return v

    @validator("question_blocks")
    def blocks_not_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError("question_blocks cannot be empty")
        # Validate each block has a type
        for i, block in enumerate(v):
            if "type" not in block:
                raise ValueError(f"Block {i} missing 'type' field")
            btype = block["type"]
            if btype not in ("text", "latex", "image"):
                raise ValueError(f"Block {i} has invalid type '{btype}'. Must be text/latex/image")
            if btype in ("text", "latex") and "body" not in block:
                raise ValueError(f"Block {i} (type={btype}) missing 'body' field")
            if btype == "image" and "url" not in block:
                raise ValueError(f"Block {i} (type=image) missing 'url' field")
        return v

    @root_validator(pre=True)
    def backfill_blocks_from_legacy_fields(cls, values):
        blocks = values.get("question_blocks") or []
        if blocks:
            return values

        text = values.get("question_text")
        image_url = values.get("image_url")
        values["question_blocks"] = blocks_from_plain_text(text or "", image_url=image_url)
        return values

    def get_plain_text(self) -> str:
        """
        Flatten all blocks into a single plain-text string.
        Used for AI tagging prompts and full-text search indexing.
        """
        parts = []
        for block in self.question_blocks:
            btype = block.get("type")
            if btype == "text":
                parts.append(block.get("body", ""))
            elif btype == "latex":
                parts.append(f"$${block.get('body', '')}$$")
            elif btype == "image":
                parts.append("[IMAGE]")
        return " ".join(parts).strip()

    def add_image_url(self, url: str) -> None:
        """Append an image block to this question."""
        if url and url.strip():
            self.question_blocks.append(make_image_block(url))


# ── Block Builder Helpers ──────────────────────────────────────────────────────

def make_text_block(body: str) -> dict:
    """Create a text content block."""
    return {"type": "text", "body": body.strip()}

def make_latex_block(body: str) -> dict:
    """Create a LaTeX content block."""
    return {"type": "latex", "body": body.strip()}

def make_image_block(url: str) -> dict:
    """Create an image content block from a public URL."""
    return {"type": "image", "url": url.strip()}

def blocks_from_plain_text(text: str, image_url: str | None = None) -> list[dict]:
    """
    Legacy helper: convert a plain-text question string (with optional
    image URL) into the new block format.

    Useful for backward compatibility with old ingest scripts.
    """
    blocks = []
    if text and text.strip():
        blocks.append(make_text_block(text))
    if image_url:
        blocks.append(make_image_block(image_url))
    return blocks


# ── Taxonomy ───────────────────────────────────────────────────────────────────

# Complete mapping of valid subjects to their exact topics.
# This guarantees Groq chooses ONLY from these strings.
SUBJECT_TOPICS_MAP = {
    "Probability and Statistics": [
        "Counting, Axioms, Sample Space & Events",
        "Marginal, Joint & Conditional Probability (Bayes Theorem)",
        "Expectation, Variance, Mean, Median, Mode & SD",
        "Correlation & Covariance",
        "Discrete RVs (Uniform, Bernoulli, Binomial, PMFs)",
        "Continuous RVs (Uniform, Exponential, Poisson, Normal, PDF, CDF)",
        "Standard Normal, t-distribution & Chi-squared distributions",
        "Central Limit Theorem & Confidence Intervals",
        "Hypothesis Testing (z-test, t-test, chi-squared test)"
    ],
    "Linear Algebra": [
        "Vector Spaces, Subspaces & Linear Independence",
        "Matrices (Projection, Orthogonal, Idempotent, Partition)",
        "Systems of Linear Equations (Gaussian Elimination)",
        "Eigenvalues, Eigenvectors & Determinants",
        "Rank, Nullity & Projections",
        "LU Decomposition & Singular Value Decomposition (SVD)",
        "Quadratic Forms"
    ],
    "Calculus and Optimization": [
        "Limits, Continuity & Differentiability (Single Variable)",
        "Taylor Series",
        "Maxima, Minima & Single Variable Optimization"
    ],
    "Programming, Data Structures and Algorithms": [
        "Programming in Python",
        "Data Structures (Stacks, Queues, Linked Lists, Trees, Hash Tables)",
        "Search (Linear & Binary) and Basic Sorting (Selection, Bubble, Insertion)",
        "Divide and Conquer (Mergesort & Quicksort)",
        "Graph Theory & Algorithms (Traversals & Shortest Path)"
    ],
    "Database Management and Warehousing": [
        "ER-model & Relational Model (Algebra, Tuple Calculus, SQL)",
        "Integrity Constraints & Normal Forms",
        "File Organization & Indexing",
        "Data Transformation (Normalization, Discretization, Sampling, Compression)",
        "Warehouse Modelling (Schema, Hierarchies, Measures, Computations)"
    ],
    "Machine Learning": [
        "Regression (Simple, Multiple, Ridge, Logistic)",
        "Classification (K-NN, Naive Bayes, LDA, SVM, Decision Trees)",
        "Neural Networks (MLP & Feed-forward)",
        "Clustering (K-means/medoid, Hierarchical, Single/Multiple Linkage)",
        "Dimensionality Reduction & PCA",
        "Bias-Variance Trade-off & Cross-Validation (K-fold, LOO)"
    ],
    "Artificial Intelligence": [
        "Search (Informed, Uninformed, Adversarial)",
        "Logic (Propositional & Predicate)",
        "Reasoning: Conditional Independence & Variable Elimination",
        "Approximate Inference through Sampling"
    ],
    "General Aptitude": [
        "Verbal Aptitude (Grammar, Vocabulary, Reading Comprehension)",
        "Quantitative Aptitude (Data Interpretation, Mensuration, Geometry)",
        "Quantitative Aptitude (Arithmetic, Algebra, Number Systems)",
        "Analytical Aptitude (Logic, Induction, Deduction)",
        "Spatial Aptitude (Transformation, Rotation, Paper Folding)"
    ]
}

def get_taxonomy_str():
    lines = []
    for subj, topics in SUBJECT_TOPICS_MAP.items():
        lines.append(f"- {subj}")
        for t in topics:
            lines.append(f"    * {t}")
    return "\n".join(lines)


@lru_cache(maxsize=1)
def get_taxonomy_str_cached() -> str:
    """Cached taxonomy string to avoid rebuilding identical prompt text."""
    return get_taxonomy_str()


# ── AI Tagging ─────────────────────────────────────────────────────────────────

TAGGING_PROMPT = """
You are a GATE exam expert for Data Science & AI (DA) branch.
Analyse the given question and return ONLY a valid JSON object with NO extra text.

You MUST choose the subject and topic EXACTLY from the following taxonomy. 
Do not invent new subjects or topics.

{context_rule}

TAXONOMY:
{taxonomy}

Return this exact JSON schema:
{{
  "subject_name": "<exact match from the taxonomy above>",
  "topic_name": "<exact match from the taxonomy under the chosen subject>",
  "difficulty": "<easy|medium|hard>",
  "is_theory": <true if conceptual, false if calculation needed>,
  "explanation": "<step-by-step solution or theory explanation, 3-6 sentences>"
}}

Question:
{question}

Options (if any):
{options}

Correct answer: {answer}
""".strip()


def _build_context_rule(question_number: str | None) -> str:
    """Force General Aptitude subject for Q1-Q10 when question number is available."""
    if not question_number:
        return ""
    try:
        if 1 <= int(question_number) <= 10:
            return (
                f"IMPORTANT CONTEXT: This is Question {question_number}. In GATE, "
                "Questions 1 to 10 are ALWAYS 'General Aptitude'. You MUST select "
                "'General Aptitude' as the subject_name."
            )
    except ValueError:
        pass
    return ""


def _extract_json_object(raw: str) -> dict:
    """Parse model response into JSON dict, removing markdown code fences when needed."""
    payload = (raw or "").strip()
    if payload.startswith("```"):
        parts = payload.split("```")
        payload = parts[1] if len(parts) > 1 else payload
        if payload.startswith("json"):
            payload = payload[4:]
    return json.loads(payload.strip())


def _apply_taxonomy_and_meta(q: QuestionIn, data: dict) -> QuestionIn:
    """Apply subject/topic/difficulty/theory/explanation with safe taxonomy matching."""
    raw_subject = data.get("subject_name", "")
    raw_topic = data.get("topic_name", "")

    matched_subject = get_closest_match(raw_subject, list(SUBJECT_TOPICS_MAP.keys()))
    matched_topic = get_closest_match(raw_topic, SUBJECT_TOPICS_MAP.get(matched_subject, []))

    q.subject_name = matched_subject
    q.topic_name = matched_topic
    q.difficulty = Difficulty(data.get("difficulty", "medium"))
    q.is_theory = bool(data.get("is_theory", True))
    q.explanation = data.get("explanation", "")
    return q

def tag_with_ai(q: QuestionIn, retries: int = 3) -> QuestionIn:
    """
    Call Groq API to fill in subject, topic, difficulty, is_theory, explanation.
    Uses the plain-text representation of question_blocks for the prompt.
    Retries up to `retries` times on failure.
    """
    options_str = "\n".join(q.options) if q.options else "N/A (numerical answer)"
    question_text = q.get_plain_text()

    context_rule = _build_context_rule(q.question_number)

    prompt = TAGGING_PROMPT.format(
        taxonomy=get_taxonomy_str_cached(),
        context_rule=context_rule,
        question=question_text,
        options=options_str,
        answer=q.correct_answer,
    )

    for attempt in range(retries):
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=600,
            )
            data = _extract_json_object(response.choices[0].message.content)
            return _apply_taxonomy_and_meta(q, data)

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            print(f"  [AI tag attempt {attempt+1}] Parse error: {e}")
            time.sleep(1)
        except Exception as e:
            print(f"  [AI tag attempt {attempt+1}] API error: {e}")
            time.sleep(2)

    print("  [WARNING] AI tagging failed after retries — question will be inserted with empty tags.")
    return q

# ── Supabase Lookup Helpers ────────────────────────────────────────────────────

_branch_cache:  dict = {}
_valid_subjects: dict = {}  # name -> id
_valid_topics: dict = {}    # subject_id -> {name -> id}

def init_lookups():
    # Fetch all subjects
    res = supabase.table("subjects").select("id, name").execute()
    for row in res.data:
        _valid_subjects[row["name"]] = row["id"]
        
    # Fetch all topics
    res = supabase.table("topics").select("id, name, subject_id").execute()
    for row in res.data:
        sid = row["subject_id"]
        if sid not in _valid_topics:
            _valid_topics[sid] = {}
        _valid_topics[sid][row["name"]] = row["id"]

def get_closest_match(name: str, valid_names: list[str]) -> str:
    name_lower = name.lower()
    
    # 1. Exact or Substring match (case insensitive)
    for valid in valid_names:
        if name_lower == valid.lower() or name_lower in valid.lower() or valid.lower() in name_lower:
            return valid

    # 2. Fuzzy match
    matches = difflib.get_close_matches(name, valid_names, n=1, cutoff=0.15)
    if matches:
        return matches[0]
    return valid_names[0] if valid_names else name

def get_branch_id(code: str) -> int:
    if code not in _branch_cache:
        res = supabase.table("branches").select("id").eq("code", code).single().execute()
        _branch_cache[code] = res.data["id"]
    return _branch_cache[code]

def get_subject_id(name: str) -> int:
    if not _valid_subjects:
        init_lookups()
    
    valid_names = list(_valid_subjects.keys())
    closest = get_closest_match(name, valid_names)
    return _valid_subjects[closest]

def get_topic_id(name: str, subject_id: int) -> int:
    if not _valid_topics:
        init_lookups()
        
    valid_names = list(_valid_topics.get(subject_id, {}).keys())
    if not valid_names:
        raise ValueError(f"No topics found for subject_id {subject_id} in seed data.")
        
    closest = get_closest_match(name, valid_names)
    return _valid_topics[subject_id][closest]

# ── Supabase Inserter ──────────────────────────────────────────────────────────

def insert_question(q: QuestionIn) -> dict | None:
    """
    Resolves branch/subject/topic IDs, then inserts the question.

    DB Schema expected:
        question_blocks  JSONB        — the rich content blocks
        question_text    TEXT          — auto-derived plain text for search
        (all other columns unchanged)

    Returns the inserted row dict, or None on failure.
    """
    try:
        branch_id  = get_branch_id(q.branch_code)
        subject_id = get_subject_id(q.subject_name)
        topic_id   = get_topic_id(q.topic_name, subject_id)

        # Normalize correct_answer by type
        if q.question_type == QuestionType.MCQ:
            correct_answer = str(q.correct_answer).strip().upper()  # "A"
        elif q.question_type == QuestionType.NAT:
            correct_answer = float(q.correct_answer)    # 6.0
        else:  # MSQ
            if isinstance(q.correct_answer, list):
                correct_answer = [str(x).strip().upper() for x in q.correct_answer]
            else:
                correct_answer = [
                    c.strip().upper()
                    for c in re.split(r"[;,]", str(q.correct_answer))
                    if c.strip()
                ]

        row = {
            "question_blocks": q.question_blocks,       # JSONB — the rich content
            "question_text":   q.get_plain_text(),       # TEXT  — plain text for search / backward compat
            "question_type":   q.question_type.value,
            "options":         q.options,
            "correct_answer":  correct_answer,
            "difficulty":      q.difficulty.value,
            "marks":           q.marks,
            "branch_ids":      [branch_id],
            "subject_id":      subject_id,
            "topic_id":        topic_id,
            "is_pyq":          q.is_pyq,
            "pyq_year":        q.pyq_year,
            "is_theory":       q.is_theory,
            "explanation":     q.explanation,
            "isStructured":    q.is_structured,
        }

        res = supabase.table("questions").insert(row).execute()
        return res.data[0]

    except Exception as e:
        print(f"  [DB INSERT ERROR] {e}")
        return None


# ── AI Solver (for non-PYQ questions — AI finds the answer) ───────────────────

SOLVE_AND_TAG_PROMPT = """
You are a GATE exam expert for Data Science & AI (DA) branch.
You must SOLVE the question AND classify it.
Return ONLY a valid JSON object with NO extra text.

You MUST choose the subject and topic EXACTLY from the following taxonomy. 
Do not invent new subjects or topics.

{context_rule}

TAXONOMY:
{taxonomy}

Rules for correct_answer:
  - MCQ  → single letter: "B"
  - MSQ  → list of letters: ["A", "C"]
  - NAT  → a number: 6.5

Return this exact JSON schema:
{{
  "correct_answer": "<answer per rules above>",
  "subject_name": "<exact match from the taxonomy above>",
  "topic_name": "<exact match from the taxonomy under the chosen subject>",
  "difficulty": "<easy|medium|hard>",
  "is_theory": <true if conceptual, false if calculation needed>,
  "explanation": "<step-by-step solution, 3-6 sentences>"
}}

Question type: {question_type}

Question:
{question}

Options (if any):
{options}
""".strip()


def solve_and_tag_with_ai(q: QuestionIn, retries: int = 3) -> QuestionIn:
    """
    For NON-PYQ questions: AI both SOLVES the question (correct_answer)
    and TAGS it (subject, topic, difficulty, explanation).
    Uses a larger model (70b) for better solving accuracy.
    """
    options_str = "\n".join(
        f"({chr(65+i)}) {opt}" for i, opt in enumerate(q.options)
    ) if q.options else "N/A (numerical answer type)"

    question_text = q.get_plain_text()

    context_rule = _build_context_rule(q.question_number)

    prompt = SOLVE_AND_TAG_PROMPT.format(
        taxonomy=get_taxonomy_str_cached(),
        context_rule=context_rule,
        question_type=q.question_type.value,
        question=question_text,
        options=options_str,
    )

    for attempt in range(retries):
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",   # 70b for solving accuracy
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=800,
            )
            data = _extract_json_object(response.choices[0].message.content)

            # Set correct_answer from AI
            ai_answer = data.get("correct_answer")
            if ai_answer is not None:
                q.correct_answer = ai_answer

            return _apply_taxonomy_and_meta(q, data)

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            print(f"  [AI solve attempt {attempt+1}] Parse error: {e}")
            time.sleep(1)
        except Exception as e:
            print(f"  [AI solve attempt {attempt+1}] API error: {e}")
            time.sleep(2)

    print("  [WARNING] AI solve+tag failed — question inserted with placeholder answer.")
    return q


# ── Supabase Storage Upload ───────────────────────────────────────────────────

def upload_to_storage(
    file_bytes: bytes,
    storage_path: str,
    bucket: str = "question-images",
    content_type: str = "image/png",
) -> str | None:
    """
    Upload image bytes to Supabase Storage bucket.
    Returns public URL on success, None on failure.

    Pre-requisite: Create the bucket in Supabase Dashboard → Storage →
    New Bucket → Name: 'question-images' → Public: ON
    """
    try:
        supabase.storage.from_(bucket).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        public_url = supabase.storage.from_(bucket).get_public_url(storage_path)
        return public_url
    except Exception as e:
        print(f"    [STORAGE ERROR] {e}")
        return None
