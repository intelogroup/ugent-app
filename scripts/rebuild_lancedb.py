import os
import sys
import json
import time
import re
import glob
import numpy as np
import lancedb
import fitz
from sentence_transformers import SentenceTransformer

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT, "data")
DB_PATH = os.path.join(DATA_DIR, "lancedb")
TABLE_NAME = "books"
MODEL_NAME = "BAAI/bge-large-en-v1.5"
CHUNK_SIZE = 600
CHUNK_OVERLAP = 120
BATCH_SIZE = 32

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(DB_PATH, exist_ok=True)

# --- 1. Offsets and configurations ---

FA_OFFSETS = {
    "00_Frontmatter.md": -16,
    "01_Section_I_Guide.md": 1,
    "02_Biochemistry.md": 27,
    "03_Immunology.md": 93,
    "04_Microbiology.md": 121,
    "05_Pathology.md": 201,
    "06_Pharmacology.md": 227,
    "07_Public_Health_Sciences.md": 255,
    "08_Cardiovascular.md": 279,
    "09_Endocrine.md": 329,
    "10_Gastrointestinal.md": 363,
    "11_Hematology_and_Oncology.md": 409,
    "12_Musculoskeletal.md": 449,
    "13_Neurology.md": 499,
    "14_Psychiatry.md": 571,
    "15_Renal.md": 597,
    "16_Reproductive.md": 631,
    "17_Respiratory.md": 679,
    "18_Rapid_Review.md": 741,
    "19_Appendix.md": 749,
    "20_Image_Acknowledgments.md": 757,
    "21_Index.md": 775,
}

PATHOMA_OFFSETS = {
    "Chapter_02_Inflammation_Inflammatory_Disorders_and_Wound_Healing.md": 13,
    "Chapter_03_Principles_of_Neoplasia.md": 23,
    "Chapter_04_Hemostasis_and_Related_Disorders.md": 33,
    "Chapter_05_Red_Blood_Cell_Disorders.md": 41,
    "Chapter_06_White_Blood_Cell_Disorders.md": 55,
    "Chapter_07_Vascular_Pathology.md": 65,
    "Chapter_08_Cardiac_Pathology.md": 73,
    "Chapter_09_Respiratory_Tract_Pathology.md": 87, # PART 0 is page 87
    "Chapter_10_Gastrointestinal_Pathology.md": 103,
    "Chapter_11_Exocrine_Pancreas_Gallbladder_and_Liver_Pathology.md": 117,
    "Chapter_12_Kidney_and_Urinary_Tract_Pathology.md": 127,
    "Chapter_13_Female_Genital_System_and_Gestational_Pathology.md": 139,
    "Chapter_14_Male_Genital_System_Pathology.md": 153,
    "Chapter_15_Endocrine_Pathology.md": 159,
    "Chapter_16_Breast_Pathology.md": 175,
    "Chapter_17_Central_Nervous_System_Pathology.md": 183,
    "Chapter_18_Musculoskeletal_Pathology.md": 197,
    "Chapter_19_Skin_Pathology.md": 205,
    "Chapter_20_Index.md": 207,
}

CH1_EXPLICIT_PAGES = {
    1: 1,
    2: 1,
    4: 2,
    5: 3,
    6: 4,
    7: 5,
    8: 6,
    9: 7,
    10: 8,
    11: 9,
    12: 11,
    13: 12,
}

# --- 2. Caesar cipher ungarbler ---

def shift_text(text, shift=-1):
    res = []
    for c in text:
        o = ord(c)
        if 65 <= o <= 90: # A-Z
            res.append(chr((o - 65 + shift) % 26 + 65))
        elif 97 <= o <= 122: # a-z
            res.append(chr((o - 97 + shift) % 26 + 97))
        else:
            res.append(c)
    return "".join(res)

def get_english_word_count(text):
    common_words = {"the", "of", "and", "to", "a", "in", "is", "that", "it", "he", "was", "for", "on", "are", "as", "with", "his", "they", "i", "at", "be", "this", "have", "from"}
    words = re.findall(r'\b[a-z]+\b', text.lower())
    if not words:
        return 0
    return sum(1 for w in words if w in common_words)

def ungarble_if_needed(text):
    c0 = get_english_word_count(text)
    shifted = shift_text(text, -1)
    c1 = get_english_word_count(shifted)
    if c1 > c0 * 2 and c1 > 3:
        return shifted
    return text

# --- 3. Parsing logic ---

def clean_extracted_text(text, page):
    # Remove header/footer noise
    lines = text.split("\n")
    cleaned = []
    for line in lines:
        s = line.strip()
        if s == str(page):
            continue
        if s in ["SEC TION II", "FUNDAMENTALS OF PATHOLOGY"]:
            continue
        cleaned.append(line)
    return "\n".join(cleaned).strip()

def process_first_aid():
    print("Processing First Aid Markdown files...", flush=True)
    pages = {}
    md_files = glob.glob(os.path.join(PROJECT, "scraped_first_aid_final", "*.md"))
    for filepath in md_files:
        filename = os.path.basename(filepath)
        if filename not in FA_OFFSETS:
            continue
        offset = FA_OFFSETS[filename]
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        parts = content.split("---\n")
        for idx, part in enumerate(parts):
            text = part.strip()
            if not text:
                continue
            page = offset + idx
            cleaned = clean_extracted_text(text, page)
            if cleaned:
                pages[page] = cleaned
    
    # Save to JSONL
    out_path = os.path.join(DATA_DIR, "firstaid_text.jsonl")
    with open(out_path, "w", encoding="utf-8") as f:
        for p in sorted(pages.keys()):
            f.write(json.dumps({"page": p, "text": pages[p]}) + "\n")
    print(f"Saved {len(pages)} clean pages to {out_path}", flush=True)

def process_pathoma():
    print("Processing Pathoma Markdown files...", flush=True)
    pages = {}
    
    # Process individual files
    md_files = glob.glob(os.path.join(PROJECT, "scraped_pathoma", "*.md"))
    for filepath in md_files:
        filename = os.path.basename(filepath)
        if "Chapter_01" in filename:
            continue
        if filename not in PATHOMA_OFFSETS:
            continue
        offset = PATHOMA_OFFSETS[filename]
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        parts = content.split("---\n")
        
        # Exception for Chapter 9 Respiratory jump
        if filename == "Chapter_09_Respiratory_Tract_Pathology.md":
            for idx, part in enumerate(parts):
                text = part.strip()
                if not text:
                    continue
                # Gap: parts 0-2 are pages 87-89, parts 3-10 are pages 95-102
                page = 87 + idx if idx <= 2 else 95 + (idx - 3)
                cleaned = clean_extracted_text(text, page)
                if cleaned:
                    pages[page] = cleaned
        else:
            for idx, part in enumerate(parts):
                text = part.strip()
                if not text:
                    continue
                page = offset + idx
                cleaned = clean_extracted_text(text, page)
                if cleaned:
                    pages[page] = cleaned
                    
    # Process Chapter 1 markdown explicit parts
    ch1_path = os.path.join(PROJECT, "scraped_pathoma", "Chapter_01_Growth_Adaptations_Cellular_Injury_and_Cell_Death.md")
    with open(ch1_path, "r", encoding="utf-8") as f:
        ch1_content = f.read()
    ch1_parts = ch1_content.split("---\n")
    for idx, page in CH1_EXPLICIT_PAGES.items():
        if idx < len(ch1_parts):
            text = ch1_parts[idx].strip()
            cleaned = clean_extracted_text(text, page)
            if cleaned:
                if page not in pages or len(cleaned) > len(pages[page]):
                    pages[page] = cleaned

    # Fallback to PDF extraction for missing pages
    pdf_path = os.path.join(PROJECT, "Pathoma 2021.pdf")
    if os.path.exists(pdf_path):
        print("Extracting missing pages from Pathoma PDF...", flush=True)
        doc = fitz.open(pdf_path)
        # We check all pages 1 to 218
        for p in range(1, 219):
            # Pages we missed or that aren't in the page map
            if p not in pages or len(pages[p]) < 100:
                # PDF index is page_num + 8
                pdf_idx = p + 8
                if 0 <= pdf_idx < len(doc):
                    pdf_text = doc[pdf_idx].get_text().strip()
                    if len(pdf_text) >= 50:
                        # Ungarble if needed
                        clean_text = ungarble_if_needed(pdf_text)
                        # Clean up formatting
                        clean_text = clean_extracted_text(clean_text, p)
                        if clean_text:
                            pages[p] = clean_text
        doc.close()
    
    # Save to JSONL
    out_path = os.path.join(DATA_DIR, "pathoma_text.jsonl")
    with open(out_path, "w", encoding="utf-8") as f:
        for p in sorted(pages.keys()):
            f.write(json.dumps({"page": p, "text": pages[p]}) + "\n")
    print(f"Saved {len(pages)} clean pages to {out_path}", flush=True)

# --- 4. Rebuild LanceDB index ---

def chunk_source_text(text, source, page):
    chunks = []
    length = len(text)
    if length <= CHUNK_SIZE:
        chunks.append({"source": source, "page": page, "text": text})
    else:
        start = 0
        while start < length:
            end = min(start + CHUNK_SIZE, length)
            chunks.append({"source": source, "page": page, "text": text[start:end]})
            if end == length:
                break
            start = end - CHUNK_OVERLAP
    return chunks

def index_source(source, model, lancedb_conn):
    jsonl_path = os.path.join(DATA_DIR, f"{source}_text.jsonl")
    with open(jsonl_path, "r", encoding="utf-8") as f:
        entries = [json.loads(line) for line in f if line.strip()]
    
    print(f"Chunking {source}: {len(entries)} pages...", flush=True)
    all_chunks = []
    for e in entries:
        all_chunks.extend(chunk_source_text(e["text"], source, e["page"]))
    print(f"Generated {len(all_chunks)} chunks.", flush=True)
    
    texts = [c["text"] for c in all_chunks]
    metas = [{"source": c["source"], "page": c["page"]} for c in all_chunks]
    
    print(f"Embedding {source}...", flush=True)
    t0 = time.time()
    all_embs = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        emb = model.encode(batch, normalize_embeddings=True)
        all_embs.append(emb)
    vecs = np.vstack(all_embs)
    print(f"Embedded in {time.time()-t0:.1f}s", flush=True)
    
    data = []
    for i in range(len(texts)):
        data.append({
            "vector": vecs[i],
            "text": texts[i],
            "source": metas[i]["source"],
            "page": metas[i]["page"],
        })
        
    if TABLE_NAME in lancedb_conn.table_names():
        table = lancedb_conn.open_table(TABLE_NAME)
        table.add(data)
    else:
        table = lancedb_conn.create_table(TABLE_NAME, data)
        
    print(f"Indexed {len(data)} rows in LanceDB table '{TABLE_NAME}'. Total rows: {table.count_rows()}", flush=True)

def main():
    process_first_aid()
    process_pathoma()
    
    print("Connecting to LanceDB...", flush=True)
    conn = lancedb.connect(DB_PATH)
    if TABLE_NAME in conn.table_names():
        print(f"Dropping existing table '{TABLE_NAME}'...", flush=True)
        conn.drop_table(TABLE_NAME)
        
    print(f"Loading embedding model '{MODEL_NAME}'...", flush=True)
    model = SentenceTransformer(MODEL_NAME)
    
    index_source("firstaid", model, conn)
    index_source("pathoma", model, conn)
    
    print("Database rebuild completed successfully!", flush=True)

if __name__ == "__main__":
    main()
