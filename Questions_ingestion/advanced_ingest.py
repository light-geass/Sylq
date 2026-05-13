import os
import re
import fitz
import json
import time
from tqdm import tqdm
from core import (
    QuestionIn, QuestionType, Difficulty,
    tag_with_ai, insert_question, upload_to_storage, 
    make_text_block, make_latex_block, groq_client
)

# Expanded math map for higher precision
MATH_MAP = {
    "∑": "\\sum", "∫": "\\int", "∂": "\\partial", "√": "\\sqrt",
    "σ": "\\sigma", "μ": "\\mu", "α": "\\alpha", "β": "\\beta",
    "γ": "\\gamma", "δ": "\\delta", "ε": "\\epsilon", "θ": "\\theta",
    "λ": "\\lambda", "π": "\\pi", "ω": "\\omega", "Ω": "\\Omega",
    "≈": "\\approx", "≠": "\\neq", "≤": "\\le", "≥": "\\ge",
    "∞": "\\infty", "∈": "\\in", "∉": "\\notin", "∩": "\\cap",
    "∪": "\\cup", "⊂": "\\subset", "⊆": "\\subseteq", "⇒": "\\implies",
    "⇔": "\\iff", "→": "\\to", "←": "\\gets", "∀": "\\forall",
    "∃": "\\exists", "¬": "\\neg", "∧": "\\land", "∨": "\\lor"
}

CLEANUP_PROMPT = """
You are a LaTeX and Math cleanup engine.
Fix the following garbled text from a GATE exam PDF into clean, readable LaTeX.
Rules:
1) Preserve the original question meaning exactly.
2) Convert all math, variables, and formulas into proper LaTeX (e.g. $x^2$, $\sigma$).
3) If you see a matrix, format it as a bmatrix.
4) Return ONLY the cleaned text.
5) Do not add preamble or markdown code fences unless requested.

Garbled Text:
{text}
"""

class AdvancedIngester:
    def __init__(self, pdf_path, dry_run=True):
        self.pdf_path = pdf_path
        self.dry_run = dry_run
        self.doc = fitz.open(pdf_path)
        
    def get_clean_page_text(self, page_num):
        page = self.doc[page_num - 1]
        text = page.get_text("text", sort=True)
        for char, repl in MATH_MAP.items():
            text = text.replace(char, repl)
        return text

    def ai_clean_math(self, text):
        """Use LLM to reconstruct math structure from flat text."""
        try:
            resp = groq_client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[{"role": "user", "content": CLEANUP_PROMPT.format(text=text)}],
                temperature=0.1,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"  [AI CLEAN ERROR] {e}")
            return text

    def run(self, year, branch):
        print(f"Starting Advanced Ingestion for {self.pdf_path}...")
        # (This is a simplified loop for demonstration, we'd integrate the full parser here)
        # We will use the existing question splitting logic but run each 
        # extracted question through self.ai_clean_math()
        pass

if __name__ == "__main__":
    # This will be fully implemented in the next step to replace ingest_pdf_v2
    print("Advanced Ingester Engine Initialized.")
