import csv
import json
import re

def split_text_into_blocks(text):
    pattern = r'(\$\$.*?\$\$|\\\(.*?\\\)|\\\[.*?\\\])'
    parts = re.split(pattern, text)
    
    new_blocks = []
    for part in parts:
        if not part:
            continue
        if (part.startswith('$$') and part.endswith('$$')) or \
           (part.startswith('\\(') and part.endswith('\\)')) or \
           (part.startswith('\\[') and part.endswith('\\]')):
            body = part[2:-2].strip()
            new_blocks.append({"type": "latex", "body": body})
        else:
            new_blocks.append({"type": "text", "body": part})
    return new_blocks

def fix_and_reformat_json(raw_json):
    # 1. First, fix the "double quote" issue if it was improperly serialized
    # and double the backslashes for JSON compatibility
    clean_json = raw_json.replace("\\", "\\\\")
    
    # 2. Try to parse
    try:
        data = json.loads(clean_json)
    except json.JSONDecodeError:
        # If it's like ["{...}"], try to fix it
        # This is common in LLM mess-ups
        if clean_json.startswith('["{') and clean_json.endswith('}"]'):
            try:
                inner = clean_json[2:-2].replace('\\"', '"')
                data = [json.loads(inner)]
            except:
                raise ValueError(f"Irreparable JSON: {clean_json}")
        else:
            raise

    # 3. Process blocks
    final_blocks = []
    for b in data:
        if b.get("type") == "text":
            final_blocks.extend(split_text_into_blocks(b["body"]))
        else:
            final_blocks.append(b)
    
    return final_blocks

def reformat_csv(file_path, output_path):
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for row in rows:
        if row.get("question_blocks"):
            try:
                blocks = fix_and_reformat_json(row["question_blocks"])
                row["question_blocks"] = json.dumps(blocks)
                has_latex = any(b["type"] == "latex" for b in blocks)
                row["isStructured"] = "FALSE" if has_latex else "TRUE"
            except Exception as e:
                print(f"Error in {file_path}: {e}")

        if row.get("explanation"):
            row["explanation"] = row["explanation"].replace("\\", "\\\\")

    with open(output_path, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
        writer.writeheader()
        writer.writerows(rows)

if __name__ == "__main__":
    files = [
        "data/csv/gate_da_msq_nat_regression.csv",
        "data/csv/gate_da_regression_msq_nat2.csv"
    ]
    for f in files:
        out = f.replace(".csv", "_reformatted.csv")
        reformat_csv(f, out)
        print(f"Processed {f} -> {out}")
