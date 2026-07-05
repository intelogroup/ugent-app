import os, sys, json, time
import numpy as np
from sentence_transformers import SentenceTransformer

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT, "data")
EMBED_DIR = os.path.join(DATA_DIR, "embeddings")
CHROMA_DIR = os.path.join(DATA_DIR, "chroma")
MODEL_NAME = "BAAI/bge-large-en-v1.5"
CHUNK_SIZE = 600
CHUNK_OVERLAP = 120
BATCH_SIZE = 16

os.makedirs(EMBED_DIR, exist_ok=True)
os.makedirs(CHROMA_DIR, exist_ok=True)


def chunk_text(text, source, page):
    chunks = []
    length = len(text)
    if length <= CHUNK_SIZE:
        chunks.append({"source": source, "page": page, "chunk_id": f"{source}_p{page}", "text": text})
    else:
        start = 0
        i = 0
        while start < length:
            end = min(start + CHUNK_SIZE, length)
            chunks.append({"source": source, "page": page, "chunk_id": f"{source}_p{page}_c{i}", "text": text[start:end]})
            if end == length:
                break
            start = end - CHUNK_OVERLAP
            i += 1
    return chunks


def index_source(source):
    jsonl_path = os.path.join(DATA_DIR, f"{source}_text.jsonl")
    npz_path = os.path.join(EMBED_DIR, f"{source}.npz")

    with open(jsonl_path) as f:
        entries = [json.loads(l) for l in f if l.strip()]

    print(f"{source}: {len(entries)} pages, chunking...", flush=True)
    all_chunks = []
    for e in entries:
        all_chunks.extend(chunk_text(e["text"], source, e["page"]))
    print(f"{source}: {len(all_chunks)} chunks", flush=True)

    print(f"{source}: loading model...", flush=True)
    model = SentenceTransformer(MODEL_NAME)

    import chromadb
    from chromadb.config import Settings
    client = chromadb.PersistentClient(path=CHROMA_DIR, settings=Settings(anonymized_telemetry=False))

    if source == "pathoma":
        for c in client.list_collections():
            client.delete_collection(c.name)
        collection = client.create_collection(name="books", metadata={"hnsw:space": "cosine"})
    else:
        collection = client.get_collection("books")

    texts = [c["text"] for c in all_chunks]
    metas = [{"source": source, "page": c["page"], "chunk_id": c["chunk_id"]} for c in all_chunks]

    t0 = time.time()
    all_embs = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        emb = model.encode(batch, normalize_embeddings=True)
        all_embs.append(emb)
        print(f"  {source}: {min(i+BATCH_SIZE, len(texts))}/{len(texts)} ({time.time()-t0:.0f}s)", flush=True)

    embeddings = np.vstack(all_embs)
    np.savez_compressed(npz_path, embeddings=embeddings, chunk_ids=[m["chunk_id"] for m in metas])

    CHROMA_BATCH = 5000
    for bi in range(0, len(texts), CHROMA_BATCH):
        collection.add(
            ids=[m["chunk_id"] for m in metas[bi:bi + CHROMA_BATCH]],
            documents=texts[bi:bi + CHROMA_BATCH],
            embeddings=embeddings[bi:bi + CHROMA_BATCH].tolist(),
            metadatas=[{"source": source, "page": m["page"]} for m in metas[bi:bi + CHROMA_BATCH]],
        )
        print(f"  chroma add: {min(bi+CHROMA_BATCH, len(texts))}/{len(texts)}", flush=True)

    print(f"{source}: {len(texts)} vecs in Chroma ({time.time()-t0:.0f}s)", flush=True)
    print(f"TOTAL: {collection.count()} vectors", flush=True)


if __name__ == "__main__":
    s = sys.argv[1] if len(sys.argv) > 1 else "pathoma"
    index_source(s)
