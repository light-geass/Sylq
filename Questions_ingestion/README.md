# Gate Platform — Phase 2: Question Ingestion Pipeline

## Setup (Windows — run in Command Prompt or PowerShell)

### Step 1: Create virtual environment
```
cd gate_ingestion
python -m venv venv
venv\Scripts\activate
```

### Step 2: Install dependencies
```
pip install -r requirements.txt
```
Note: EasyOCR (~100MB) downloads its model on first use.

### Step 3: Set up your API keys
```
copy .env.example .env
```
Open `.env` in Notepad and fill in:
- `SUPABASE_URL`       → from Supabase project → Settings → API
- `SUPABASE_SERVICE_KEY` → "service_role" key (NOT the anon key — service key bypasses Row Level Security)
- `GROQ_API_KEY`       → from console.groq.com → API Keys → Create key

### Step 4: Test with a dry run (no DB writes)
```
python ingest_pdf.py --pdf "GATE_DA_2023.pdf" --year 2023 --dry-run
```

---

## Usage

### PDF PYQs (primary workflow)
```
python ingest_pdf.py --pdf "GATE_DA_2023.pdf" --year 2023 --branch DA
python ingest_pdf.py --pdf "GATE_DA_2022.pdf" --year 2022 --branch DA
```

### Scanned images (one image)
```
python ingest_image.py --image "q1.jpg" --type MCQ --answer B --marks 1
```

### Folder of images with a CSV answer key
```
python ingest_image.py --folder "./scanned_questions" --answer-csv answers.csv
```

### Word document
```
python ingest_manual.py --docx "my_questions.docx"
```

### CSV (manual entry)
```
python ingest_manual.py --template          # generates a blank template
python ingest_manual.py --csv questions.csv
```

---

## Project structure
```
gate_ingestion/
├── core.py            # Shared: Pydantic schema, Groq tagger, Supabase inserter
├── ingest_pdf.py      # For official GATE PDF papers
├── ingest_image.py    # For scanned images / screenshots
├── ingest_manual.py   # For Word docs and manual CSV entry
├── requirements.txt
├── .env               # Your secrets (DO NOT commit to git)
└── .env.example       # Template (safe to commit)
```

## Important notes

- Always do a `--dry-run` first on a new PDF to check extraction quality.
- If a PDF is scanned (text not selectable in Acrobat), use `ingest_image.py`.
- Groq free tier: ~30 req/min on llama-3.1-8b-instant. The 2s sleep between questions keeps you safe.
- Use the `SUPABASE_SERVICE_KEY` (service role), not the anon key, for server-side inserts.
- Never commit your `.env` file. Add it to `.gitignore`.
