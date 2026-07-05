import os, sys
import chromadb
from sentence_transformers import SentenceTransformer
from chromadb.config import Settings

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_DIR = os.path.join(PROJECT, "data", "chroma")
MODEL_NAME = "BAAI/bge-large-en-v1.5"
_model = None
_collection = None


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def _get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR, settings=Settings(anonymized_telemetry=False))
        _collection = client.get_collection("books")
    return _collection


def query_books(query: str, top_k: int = 5):
    model = _get_model()
    collection = _get_collection()
    emb = model.encode(query, normalize_embeddings=True).tolist()
    results = collection.query(
        query_embeddings=[emb],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )
    out = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        src = "Pathoma" if meta["source"] == "pathoma" else "First Aid"
        sim = 1 - dist
        out.append({
            "source": src,
            "page": meta["page"],
            "text": doc.strip(),
            "score": round(sim, 4),
        })
    return out


if __name__ == "__main__":
    q = " ".join(sys.argv[1:]) or "Huntington disease"
    for r in query_books(q):
        print(f"[{r['source']} p.{r['page']}] score={r['score']:.3f}")
        print(f"  {r['text'][:200]}")
        print()
