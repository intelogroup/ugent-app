import fs from 'fs';
import path from 'path';

const cache = new Map<string, string>();

// ponytail: prod reads jsonl from Vercel Blob (data/ is excluded from the
// upload, see .vercelignore — too big), local dev reads straight off disk.
export async function readDataFile(filename: string): Promise<string> {
  const cached = cache.get(filename);
  if (cached) return cached;

  const content = process.env.VERCEL
    ? await fetch(`${process.env.BLOB_DATA_BASE_URL}/${filename}`).then((r) => {
        if (!r.ok) throw new Error(`blob fetch failed for ${filename}: ${r.status}`);
        return r.text();
      })
    : fs.readFileSync(path.join(process.cwd(), 'data', filename), 'utf8');

  cache.set(filename, content);
  return content;
}
