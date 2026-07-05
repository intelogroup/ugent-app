import sys, os, json, time
import fitz
import numpy as np
from sentence_transformers import SentenceTransformer

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT, "data")
EMBED_CACHE = os.path.join(DATA_DIR, "embeddings")
CHROMA_DIR = os.path.join(DATA_DIR, "chroma")
MODEL_NAME = "BAAI/bge-large-en-v1.5"
CHUNK_SIZE = 500
BATCH_SIZE = 32

def process(source_name, pdf_path):
    os.makedirs(EMBED_CACHE, exist_ok=True)
    os.makedirs(CHROMA_DIR, exist_ok=True)

    print(f"ODE: Opening {pdf_path}", flush=True)
    doc = fitz.open(pdf_path)
    print(f"ODE: Pages={len(doc)}", flush=True)

    chunks = []
    for pn in range(len(doc)):
        text = doc[pn].get_text().strip()
        if len(text) < 50:
            continue
        text = text[:CHUNK_SIZE]
        chunks.append({
            "source": source_name,
            "page": pn + 1,
            "chunk_id": f"{source_name}_p{pn+1}",
            "text": text,
        })
    doc.close()
    print(f"ODE: Chunks={len(chunks)}", flush=True)

    print(f"ODE: Loading model...", flush=True)
    model = SentenceTransformer(MODEL_NAME)
    texts = [c["text"] for c in chunks]
    embeddings = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i+BATCH_SIZE]
        emb = model.encode(batch, normalize_embeddings=True)
        embeddings.append(emb)
        if (i + BATCH_SIZE) % 256 == 0 or i + BATCH_SIZE >= len(texts):
            print(f"ODE: {min(i+BATCH_SIZE, len(texts))}/{len(texts)} embedded", flush=True)

    all_embs = np.vstack(embeddings)
    cache_path = os.path.join(EMBED_CACHE, f"{source_name}.npz")
    np.savez_compressed(cache_path, embeddings=all_embs, chunks=chunks)
    print(f"ODE: Cached to {cache_path} ({len(chunks)} vectors)", flush=True)

    import chromadb
    from chromadb.config import Settings
    client = chromadb.PersistentClient(path=CHROMA_DIR, settings=Settings(anonymized_telemetry=False))
    try:
        collection = client.get_collection("books")
    except:
        collection = client.create_collection(name="books", metadata={"hnsw:space": "cosine"})

    collection.add(
        ids=[c["chunk_id"] for c in chunks],
        documents=[c["text"] for c in chunks],
        embeddings=all_embs.tolist(),
        metadatas=[{"source": c["source"], "page": c["page"]} for c in chunks],
    )
    print(f"ODE: Added to Chroma ({collection.count()} total vectors)", flush=True)


if __name__ == "__main__":
    name = sys.argv[1]
    path = sys.argv[2]
    process(name, path)
