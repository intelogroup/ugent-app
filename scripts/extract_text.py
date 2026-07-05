import os, sys, json, time

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def is_garbled(text):
    alpha = sum(c.isalpha() for c in text)
    return alpha < len(text) * 0.6 or "5BCMF" in text


def extract_to_jsonl(name, pdf_name):
    pdf_path = os.path.join(PROJECT, pdf_name)
    out_path = os.path.join(PROJECT, "data", f"{name}_text.jsonl")
    t0 = time.time()

    import fitz
    doc = fitz.open(pdf_path)
    pages = []
    garbled = []

    for i in range(len(doc)):
        t = doc[i].get_text().strip()
        if len(t) < 50:
            continue
        pages.append({"page": i + 1, "text": t})
        if is_garbled(t):
            garbled.append(i + 1)

    doc.close()
    print(f"  fitz: {len(pages)} pages, {len(garbled)} garbled ({time.time()-t0:.0f}s)", flush=True)

    if garbled:
        print(f"  re-extracting {len(garbled)} garbled pages via pdfminer...", flush=True)
        from pdfminer.high_level import extract_text as pm_extract

        garbled_set = set(garbled)
        for idx, pg in enumerate(garbled):
            t = pm_extract(pdf_path, page_numbers=[pg - 1]).strip()
            for entry in pages:
                if entry["page"] == pg:
                    entry["text"] = t if len(t) >= 50 else entry["text"]
                    break
            if (idx + 1) % 10 == 0:
                print(f"    {idx+1}/{len(garbled)} ({time.time()-t0:.0f}s)", flush=True)

    os.makedirs(os.path.join(PROJECT, "data"), exist_ok=True)
    with open(out_path, "w") as f:
        for entry in pages:
            f.write(json.dumps(entry) + "\n")
    print(f"  saved {len(pages)} pages to {out_path} ({time.time()-t0:.0f}s)", flush=True)


if __name__ == "__main__":
    extract_to_jsonl("pathoma", "Pathoma 2021.pdf")
    extract_to_jsonl("firstaid", "First Aid Q&A for the USMLE Step 1 3rd Edition.pdf")
