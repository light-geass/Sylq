import sys
from pypdf import PdfReader

def extract_pdf(pdf_path, out_path):
    reader = PdfReader(pdf_path)
    with open(out_path, "w", encoding="utf-8") as f:
        for i, page in enumerate(reader.pages):
            f.write(f"\n--- Page {i+1} ---\n")
            f.write(page.extract_text() + "\n")
            
extract_pdf(r"e:\GATER\exam details\JEE mains.pdf", "jee_mains_text.txt")
extract_pdf(r"e:\GATER\exam details\JEE advance.pdf", "jee_advance_text.txt")
print("Extraction complete")
