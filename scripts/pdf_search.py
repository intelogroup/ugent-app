import sys, os, re
import fitz  # PyMuPDF

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATHOMA_PATH = os.path.join(PROJECT, "Pathoma 2021.pdf")
FA_PATH = os.path.join(PROJECT, "First Aid Q&A for the USMLE Step 1 3rd Edition.pdf")


def search_pdf(pdf_path, query, max_chars=800):
    if not os.path.exists(pdf_path):
        return f"[PDF not found: {pdf_path}]"

    doc = fitz.open(pdf_path)
    query_lower = query.lower()

    best_chunk = None
    best_score = float('-inf')

    for page_num, page in enumerate(doc):
        text = page.get_text()
        if query_lower in text.lower():
            idx = text.lower().index(query_lower)
            start = max(0, idx - 200)
            end = min(len(text), idx + len(query) + 400)
            chunk = text[start:end].strip()

            score = -abs(idx - len(text) // 2)
            if score > best_score:
                best_score = score
                best_chunk = (page_num + 1, chunk)

    doc.close()

    if best_chunk:
        page_num, chunk = best_chunk
        # Clean up whitespace
        chunk = re.sub(r'\s+', ' ', chunk).strip()
        if len(chunk) > max_chars:
            chunk = chunk[:max_chars] + "..."
        return f"(Pathoma p.{page_num}) {chunk}"
    return None


def search_pathoma(query, max_chars=800):
    return search_pdf(PATHOMA_PATH, query, max_chars)


def search_fa(query, max_chars=800):
    return search_pdf(FA_PATH, query, max_chars)


def search_both(query, max_chars=600):
    results = []
    pathoma = search_pathoma(query, max_chars)
    if pathoma:
        results.append(f"[Pathoma] {pathoma}")
    fa = search_fa(query, max_chars)
    if fa:
        results.append(f"[FA Q&A] {fa}")
    return results


if __name__ == "__main__":
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Huntington disease"
    results = search_both(query)
    if results:
        for r in results:
            print(r)
            print()
    else:
        print(f"No results for: {query}")
