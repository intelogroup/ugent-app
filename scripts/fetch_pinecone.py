import os, sys, json
from sentence_transformers import SentenceTransformer

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load env vars from .env.local manually (avoid dotenv dependency)
def load_env():
    env_path = os.path.join(PROJECT, ".env.local")
    if not os.path.exists(env_path):
        return {}, f"Missing {env_path}"
    env = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            val = val.strip().strip("\"'")
            env[key.strip()] = val
    return env, None

PINECONE_HOST = "ugent-ef7ckej.svc.aped-4627-b74a.pinecone.io"
MODEL_NAME = "BAAI/bge-large-en-v1.5"

_model = None

def get_model():
    global _model
    if _model is None:
        print("Loading embedding model...", file=sys.stderr)
        _model = SentenceTransformer(MODEL_NAME)
    return _model

def embed(text):
    model = get_model()
    emb = model.encode(text, normalize_embeddings=True)
    return emb.tolist()

def query_pinecone(query, namespace="first-aid-2023", top_k=3):
    env, err = load_env()
    if err:
        return None, err

    api_key = env.get("PINECONE_API_KEY")
    if not api_key:
        return None, "PINECONE_API_KEY not found in .env.local"

    vector = embed(query)

    payload = {
        "namespace": namespace,
        "vector": vector,
        "topK": top_k,
        "includeMetadata": True
    }

    import urllib.request, urllib.error

    req = urllib.request.Request(
        f"https://{PINECONE_HOST}/query",
        data=json.dumps(payload).encode(),
        headers={
            "Api-Key": api_key,
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return None, f"Pinecone HTTP {e.code}: {e.read().decode()[:200]}"
    except Exception as e:
        return None, str(e)

    results = []
    for match in data.get("matches", []):
        meta = match.get("metadata", {})
        text = meta.get("text", meta.get("content", ""))[:500]
        results.append({
            "score": match["score"],
            "source": namespace,
            "text": text,
            "page": meta.get("page", ""),
            "title": meta.get("title", "")
        })
    return results, None

def query_both(query, top_k=2):
    all_results = []
    for ns in ["first-aid-2023", "pathoma-2021"]:
        results, err = query_pinecone(query, ns, top_k)
        if err:
            print(f"  [{ns}] Error: {err}", file=sys.stderr)
        elif results:
            all_results.extend(results)
    all_results.sort(key=lambda r: -r["score"])
    return all_results

if __name__ == "__main__":
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Huntington disease CAG repeats caudate atrophy"
    results = query_both(query)
    if results:
        for r in results:
            print(f"[{r['source']}] score={r['score']:.3f} {r['title']}")
            if r.get("page"):
                print(f"  Page: {r['page']}")
            print(f"  {r['text'][:200]}")
            print()
    else:
        print("No results. Check Pinecone credentials and model download.")
