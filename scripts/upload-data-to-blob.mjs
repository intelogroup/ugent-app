import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

const files = [
  'classified-questions.jsonl',
  'medicospira-enriched.jsonl',
  'genetics-discriminators.json',
];

const dataDir = path.join(process.cwd(), 'data');

for (const file of files) {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`skip ${file}: not found`);
    continue;
  }
  const buf = fs.readFileSync(filePath);
  const { url } = await put(file, buf, { access: 'public', addRandomSuffix: false, allowOverwrite: true });
  console.log(`${file} -> ${url}`);
}
