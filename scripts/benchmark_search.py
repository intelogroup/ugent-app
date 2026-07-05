import os
import sys
import time
import lancedb
from sentence_transformers import SentenceTransformer

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT, "data", "lancedb")
TABLE_NAME = "books"
MODEL_NAME = "BAAI/bge-large-en-v1.5"

def test_query(query, top_k=3):
    t0 = time.time()
    
    # 1. Connect to DB
    db = lancedb.connect(DB_PATH)
    table = db.open_table(TABLE_NAME)
    
    # 2. Load model / Embed
    model = SentenceTransformer(MODEL_NAME)
    emb_start = time.time()
    emb = model.encode(query, normalize_embeddings=True)
    emb_time = time.time() - emb_start
    
    # 3. Search table
    search_start = time.time()
    results = table.search(emb).limit(top_k).to_list()
    search_time = time.time() - search_start
    
    total_time = time.time() - t0
    
    print(f"Query: {repr(query)}")
    print(f"  Connection & Model Load: {t0 - t0:.3f}s (if cached)")
    print(f"  Embedding encoding time: {emb_time:.3f}s")
    print(f"  LanceDB Vector search:    {search_time:.3f}s")
    print(f"  Total search time:        {total_time:.3f}s")
    print("\nResults:")
    for idx, r in enumerate(results):
        src = "Pathoma" if r["source"] == "pathoma" else "First Aid"
        print(f"  {idx+1}. [{src} p.{r['page']}] dist={r['_distance']:.4f}")
        print(f"     {r['text'][:250].strip()}")
        print()
    print("=" * 60)

if __name__ == "__main__":
    queries = [
        "pheochromocytoma",
        "cystic fibrosis transmembrane conductance regulator",
        "mitral valve prolapse click and murmur"
    ]
    for q in queries:
        test_query(q)
