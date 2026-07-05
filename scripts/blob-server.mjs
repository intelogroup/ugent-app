import http from 'node:http';
import { appendFileSync } from 'node:fs';

const PORT = 18666;
const DATA_DIR = '/Users/kalinovdameus/Developer/ugent-app/data';
const BLOBS_FILE = `${DATA_DIR}/medicospira-blobs.jsonl`;
const QUESTIONS_FILE = `${DATA_DIR}/medicospira-questions.jsonl`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'POST' && url.pathname === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { blobs, batch } = JSON.parse(body);
        if (!Array.isArray(blobs)) throw new Error('blobs must be array');
        for (const text of blobs) {
          const line = JSON.stringify({ text }) + '\n';
          appendFileSync(BLOBS_FILE, line);
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, saved: blobs.length, batch }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`Blob server on port ${PORT}`);
});
