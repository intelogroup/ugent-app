import os, sys, json, time
import numpy as np
import lancedb
from sentence_transformers import SentenceTransformer

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT, "data")
DB_PATH = os.path.join(DATA_DIR, "lancedb")
TABLE_NAME = "books"
MODEL_NAME = "BAAI/bge-large-en-v1.5"
CHUNK_SIZE = 600
CHUNK_OVERLAP = 120
BATCH_SIZE = 32

os.makedirs(DB_PATH, exist_ok=True)

model = None
db = None


def get_model():
    global model
    if model is None:
        print("Loading embedder...", flush=True)
        model = SentenceTransformer(MODEL_NAME)
    return model


def get_db():
    global db
    if db is None:
        db = lancedb.connect(DB_PATH)
    return db


def chunk_text(text, source, page):
    chunks = []
    length = len(text)
    if length <= CHUNK_SIZE:
        chunks.append({"source": source, "page": page, "text": text})
    else:
        start = 0
        i = 0
        while start < length:
            end = min(start + CHUNK_SIZE, length)
            chunks.append({"source": source, "page": page, "text": text[start:end]})
            if end == length:
                break
            start = end - CHUNK_OVERLAP
            i += 1
    return chunks


def index_source(source):
    jsonl_path = os.path.join(DATA_DIR, f"{source}_text.jsonl")
    with open(jsonl_path) as f:
        entries = [json.loads(l) for l in f if l.strip()]
    print(f"{source}: {len(entries)} pages", flush=True)

    print(f"{source}: chunking...", flush=True)
    all_chunks = []
    for e in entries:
        all_chunks.extend(chunk_text(e["text"], source, e["page"]))
    print(f"{source}: {len(all_chunks)} chunks", flush=True)

    model = get_model()
    texts = [c["text"] for c in all_chunks]
    metas = [{"source": c["source"], "page": c["page"]} for c in all_chunks]

    t0 = time.time()
    all_embs = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        emb = model.encode(batch, normalize_embeddings=True)
        all_embs.append(emb)
        print(f"  {min(i+BATCH_SIZE, len(texts))}/{len(texts)} ({time.time()-t0:.0f}s)", flush=True)
    vecs = np.vstack(all_embs)

    dim = vecs.shape[1]
    data = []
    for i in range(len(texts)):
        data.append({
            "vector": vecs[i],
            "text": texts[i],
            "source": metas[i]["source"],
            "page": metas[i]["page"],
        })

    t0 = time.time()
    db = get_db()
    if TABLE_NAME in db.table_names():
        table = db.open_table(TABLE_NAME)
        table.add(data)
    else:
        table = db.create_table(TABLE_NAME, data)
    print(f"{source}: {len(data)} rows in LanceDB ({time.time()-t0:.0f}s)", flush=True)
    print(f"TOTAL: {table.count_rows()} vectors", flush=True)


def query_books(query, top_k=5):
    db = get_db()
    table = db.open_table(TABLE_NAME)
    model = get_model()
    emb = model.encode(query, normalize_embeddings=True)
    results = table.search(emb).limit(top_k).to_list()
    out = []
    for r in results:
        src = "Pathoma" if r["source"] == "pathoma" else "First Aid"
        out.append({
            "source": src,
            "page": r["page"],
            "text": r["text"][:500],
            "score": round(float(r["_distance"]), 4),
        })
    return out


if __name__ == "__main__":
    s = sys.argv[1] if len(sys.argv) > 1 else "pathoma"
    if s in ("pathoma", "firstaid"):
        index_source(s)
    else:
        for r in query_books(s):
            print(f"[{r['source']} p.{r['page']}] dist={r['score']}")
            print(f"  {r['text'][:120]}")
            print()
