#!/usr/bin/env node
// Audit drill deck via live /api/strategy or direct file
const url = process.env.AUDIT_URL || 'http://localhost:3000/api/strategy';
const res = await fetch(url);
if (!res.ok) { console.error('fetch failed', res.status, await res.text()); process.exit(1); }
const j = await res.json();
const clues = j.questionBankClues;
console.log('total', clues.length);
const lt3 = clues.filter(c=>c.clues.length<3);
console.log('<3', lt3.length, lt3.map(c=>`${c.diseaseName} (${c.clues.length})`).slice(0,20).join(' | '));
const short = clues.filter(c=>c.clues.some(s=>s.length<15));
console.log('hasShort<15', short.length);
const emptyDisc = clues.filter(c=>!c.discriminatorDetails||c.discriminatorDetails.length===0);
console.log('emptyDisc', emptyDisc.length);
const shortExamples = short.slice(0,10).map(c=> `${c.diseaseName}: ${c.clues.filter(s=>s.length<15).join(' | ')}`).join('\n');
console.log('short examples:\n'+shortExamples);
// generic/reveal check via same logic as qbank-clue-clean: recycled >=6, demographic, nameRestatement, reveal
// For audit, just count clues <15 as proxy
// also check top-3 reveal/generic via simple heuristic
let revealTop3=0, genericTop3=0;
for(const c of clues){
  const top3=c.clues.slice(0,3);
  for(const cl of top3){
    if(cl.length<15) genericTop3++;
    if(c.diseaseName.toLowerCase().includes(cl.toLowerCase().slice(0,20))) revealTop3++;
  }
}
console.log('approx generic/reveal top3 counts (heuristic)', genericTop3, revealTop3);
const dist = {};
for(const c of clues) dist[c.clues.length]=(dist[c.clues.length]||0)+1;
console.log('dist', JSON.stringify(dist));
