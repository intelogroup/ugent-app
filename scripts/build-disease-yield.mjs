// Writes data/disease-yield.json: disease -> number of qbank rows about it (how often USMLE tests it).
// Uses the same grouping as the findings extractor so names line up with data/findings.jsonl.
//   node scripts/build-disease-yield.mjs
import fs from 'fs';
import path from 'path';
import { loadGroups } from './extract-findings.mjs';

const groups = loadGroups(null);
const yieldByDisease = Object.fromEntries(groups.map((g) => [g.disease, g.rows.length]));
fs.writeFileSync(path.join(process.cwd(), 'data', 'disease-yield.json'), JSON.stringify(yieldByDisease));
const top = groups.slice(0, 5).map((g) => `${g.disease} ${g.rows.length}`).join(', ');
console.log(`${groups.length} diseases. top: ${top}`);
