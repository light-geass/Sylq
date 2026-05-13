import fitz
import json
import os
import re
from typing import List, Dict, Any

def extract_vector_diagrams(pdf_path: str, page_num: int):
    """
    Uses PyMuPDF's get_drawings() to find vector graphic clusters 
    (trees, graphs, plots) that are often missed by raster extractors.
    """
    doc = fitz.open(pdf_path)
    page = doc[page_num - 1]
    paths = page.get_drawings()
    
    # Group paths into clusters based on proximity
    clusters = []
    for path in paths:
        bbox = path["rect"]
        if bbox.width < 5 or bbox.height < 5: continue # skip noise
        
        assigned = False
        for cluster in clusters:
            # If path is close to an existing cluster, merge it
            if bbox.intersects(cluster.irect + 20): # 20px padding
                cluster.include_rect(bbox)
                assigned = True
                break
        if not assigned:
            clusters.append(fitz.Rect(bbox))
            
    # Filter out clusters that are likely just text underlines or boxes
    real_diagrams = []
    for c in clusters:
        if c.width > 20 and c.height > 20:
            real_diagrams.append(c)
            
    return real_diagrams

def refine_latex_expression(raw_text: str) -> str:
    """
    Placeholder for a specialized LLM call that fixes common 
    extraction errors in math (e.g., 'x2' -> 'x^2', 'sig' -> '\sigma').
    """
    # This would eventually call Groq/Gemini with a specific Math-Fixer prompt
    # For now, we use a more aggressive normalization
    text = raw_text.replace("transpose", "^T")
    text = re.sub(r"([a-zA-Z])(\d)", r"\1^\2", text) # guess subscripts/superscripts
    return text

if __name__ == "__main__":
    # Example usage for debugging
    import sys
    if len(sys.argv) > 1:
        pdf = sys.argv[1]
        page = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        print(f"Scanning page {page} of {pdf} for vector diagrams...")
        rects = extract_vector_diagrams(pdf, page)
        for i, r in enumerate(rects):
            print(f"Diagram {i+1} found at: {r}")
