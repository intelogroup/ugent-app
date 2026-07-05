'use client';

import { Fragment, useState } from 'react';
import { ChromosomalMode } from './types';

interface Props {
  chromosomalMode: ChromosomalMode;
  setChromosomalMode: (m: ChromosomalMode) => void;
  robertsonStep: number;
  setRobertsonStep: (s: number) => void;
  mosaicReveal: boolean;
  setMosaicReveal: (v: boolean | ((prev: boolean) => boolean)) => void;
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function ChromosomalErrorsPanel({
  chromosomalMode,
  robertsonStep,
  setRobertsonStep,
  mosaicReveal,
  setMosaicReveal,
}: Omit<Props, 'setChromosomalMode'>) {
  // Local states for Inversions, Isochromosomes, and Ring Chromosomes
  const [inversionType, setInversionType] = useState<'pericentric' | 'paracentric'>('pericentric');
  const [inversionStep, setInversionStep] = useState(0); // 0: Normal, 1: Loop, 2: Flipped
  const [isochromosomeStep, setIsochromosomeStep] = useState(0); // 0: Normal, 1: Split, 2: Products
  const [ringFused, setRingFused] = useState(false);

  // Inversion labels and positions
  // Segment sequence: A (30), B (80), C (130), D (180), E (230), F (280)
  const segments = [
    { id: 'A', normalX: 35, flippedX: 35, color: 'fill-red-100 stroke-red-650 text-red-800' },
    { id: 'B', normalX: 85, flippedX: 85, color: 'fill-orange-100 stroke-orange-650 text-orange-800' },
    { id: 'C', normalX: 135, flippedX: 235, color: 'fill-yellow-100 stroke-yellow-650 text-yellow-800' },
    { id: 'D', normalX: 185, flippedX: 185, color: 'fill-emerald-100 stroke-emerald-650 text-emerald-800' },
    { id: 'E', normalX: 235, flippedX: 135, color: 'fill-blue-100 stroke-blue-650 text-blue-800' },
    { id: 'F', normalX: 285, flippedX: 285, color: 'fill-purple-100 stroke-purple-650 text-purple-800' },
  ];

  return (
    <div className="w-full flex flex-col items-center space-y-4">

      {/* ── ROBERTSONIAN ─────────────────────────────────────────────── */}
      {chromosomalMode === 'robertsonian' && (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-['Fredoka']">Robertsonian Translocation — Step-by-Step</span>

          <div className="w-full bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-4 flex flex-col items-center gap-3">
            <svg viewBox="0 0 560 170" className="w-full max-w-lg" role="img" aria-label="Robertsonian Translocation diagram">
              <defs>
                <marker id="arrowRed" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#ef4444"/></marker>
                <marker id="arrowViolet" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#7c3aed"/></marker>
                <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#16a34a"/></marker>
              </defs>

              {/* Step 0: Two acrocentric chromosomes */}
              <g opacity={robertsonStep >= 0 ? 1 : 0} style={{ transition: 'opacity 0.4s' }}>
                <text x="40" y="14" fontSize="10" fontWeight="700" fill="#4b5563" textAnchor="middle" fontFamily="Fredoka, sans-serif">Chr 14</text>
                <rect x="30" y="18" width="20" height="18" rx="4" fill="#bfdbfe" stroke="#1e40af" strokeWidth="2"/>
                <ellipse cx="40" cy="40" rx="10" ry="6" fill="#1e40af" stroke="#1e3a8a" strokeWidth="1.5"/>
                <rect x="28" y="44" width="24" height="55" rx="6" fill="#3b82f6" stroke="#1e40af" strokeWidth="2"/>
                <text x="40" y="76" fontSize="8" fill="white" textAnchor="middle" fontWeight="700">q</text>

                <text x="100" y="14" fontSize="10" fontWeight="700" fill="#4b5563" textAnchor="middle" fontFamily="Fredoka, sans-serif">Chr 21</text>
                <rect x="90" y="18" width="20" height="14" rx="4" fill="#fde68a" stroke="#92400e" strokeWidth="2"/>
                <ellipse cx="100" cy="36" rx="10" ry="6" fill="#d97706" stroke="#92400e" strokeWidth="1.5"/>
                <rect x="88" y="40" width="24" height="65" rx="6" fill="#f59e0b" stroke="#d97706" strokeWidth="2"/>
                <text x="100" y="76" fontSize="8" fill="white" textAnchor="middle" fontWeight="700">q</text>
              </g>

              {/* Step 1: Break */}
              <g opacity={robertsonStep >= 1 ? 1 : 0} style={{ transition: 'opacity 0.5s' }}>
                <line x1="135" y1="70" x2="170" y2="70" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5,3" markerEnd="url(#arrowRed)"/>
                <text x="152" y="64" fontSize="9" fill="#ef4444" textAnchor="middle" fontWeight="700">Break!</text>
                <line x1="33" y1="38" x2="47" y2="44" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2"/>
                <line x1="93" y1="34" x2="107" y2="40" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2"/>
              </g>

              {/* Step 2: Fusion */}
              <g opacity={robertsonStep >= 2 ? 1 : 0} style={{ transition: 'opacity 0.5s' }}>
                <line x1="175" y1="70" x2="230" y2="70" stroke="#7c3aed" strokeWidth="2.5" markerEnd="url(#arrowViolet)"/>
                <text x="202" y="64" fontSize="9" fill="#7c3aed" textAnchor="middle" fontWeight="700">Fuse</text>

                <text x="260" y="14" fontSize="10" fontWeight="700" fill="#7c3aed" textAnchor="middle" fontFamily="Fredoka, sans-serif">rob(14;21)</text>
                <rect x="248" y="18" width="24" height="55" rx="6" fill="#3b82f6" stroke="#1e40af" strokeWidth="2"/>
                <text x="260" y="48" fontSize="8" fill="white" textAnchor="middle" fontWeight="700">14q</text>
                <ellipse cx="260" cy="76" rx="12" ry="7" fill="#7c3aed" stroke="#5b21b6" strokeWidth="2"/>
                <rect x="248" y="82" width="24" height="65" rx="6" fill="#f59e0b" stroke="#d97706" strokeWidth="2"/>
                <text x="260" y="118" fontSize="8" fill="white" textAnchor="middle" fontWeight="700">21q</text>

                <text x="330" y="30" fontSize="9" fill="#9ca3af" textAnchor="middle" fontStyle="italic">lost short</text>
                <text x="330" y="41" fontSize="9" fill="#9ca3af" textAnchor="middle" fontStyle="italic">arms (p)</text>
                <rect x="310" y="44" width="12" height="8" rx="2" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
                <rect x="328" y="44" width="12" height="6" rx="2" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
                <line x1="316" y1="48" x2="326" y2="48" stroke="#ef4444" strokeWidth="1.5"/>
                <line x1="314" y1="46" x2="318" y2="50" stroke="#ef4444" strokeWidth="1.5"/>
                <line x1="328" y1="46" x2="340" y2="50" stroke="#ef4444" strokeWidth="1.5"/>
              </g>

              {/* Step 3: Offspring risk */}
              <g opacity={robertsonStep >= 3 ? 1 : 0} style={{ transition: 'opacity 0.5s' }}>
                <line x1="395" y1="75" x2="430" y2="75" stroke="#16a34a" strokeWidth="2.5" markerEnd="url(#arrowGreen)"/>
                <text x="412" y="68" fontSize="9" fill="#16a34a" textAnchor="middle" fontWeight="700">Offspring</text>

                <text x="455" y="14" fontSize="9" fontWeight="700" fill="#4b5563" textAnchor="middle">+chr21</text>
                <rect x="444" y="18" width="20" height="8" rx="3" fill="#fde68a" stroke="#92400e" strokeWidth="1.5"/>
                <ellipse cx="454" cy="30" rx="9" ry="5" fill="#d97706" stroke="#92400e" strokeWidth="1"/>
                <rect x="443" y="34" width="22" height="45" rx="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5"/>

                <text x="510" y="14" fontSize="9" fontWeight="700" fill="#7c3aed" textAnchor="middle">rob(14;21)</text>
                <rect x="498" y="18" width="22" height="45" rx="5" fill="#3b82f6" stroke="#1e40af" strokeWidth="1.5"/>
                <ellipse cx="509" cy="66" rx="10" ry="6" fill="#7c3aed" stroke="#5b21b6" strokeWidth="1.5"/>
                <rect x="497" y="70" width="22" height="55" rx="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5"/>
                <text x="509" y="100" fontSize="7.5" fill="white" textAnchor="middle" fontWeight="700">21q</text>

                <text x="483" y="152" fontSize="10" fill="#dc2626" textAnchor="middle" fontWeight="800" fontFamily="Fredoka, sans-serif">= 3 copies chr21</text>
                <text x="483" y="164" fontSize="9" fill="#dc2626" textAnchor="middle" fontStyle="italic">Trisomy 21 (familial)</text>
              </g>
            </svg>

            <div className="flex gap-2 flex-wrap justify-center">
              {[0, 1, 2, 3].map((step) => (
                <button
                  key={step}
                  onClick={() => setRobertsonStep(step)}
                  className={`text-xs px-3 py-1.5 rounded-xl border-2 font-bold transition-all ${
                    robertsonStep === step
                      ? 'bg-violet-600 border-violet-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:bg-violet-50'
                  }`}
                >
                  {step === 0 ? '1. Two Chromosomes' : step === 1 ? '2. Centromere Break' : step === 2 ? '3. Arms Fuse' : '4. Offspring Risk'}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full grid grid-cols-3 gap-3 text-center">
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3">
              <span className="block text-lg font-black text-blue-700">45</span>
              <span className="text-[10px] text-blue-600 font-bold uppercase">Carrier chromosomes</span>
            </div>
            <div className="bg-violet-50 border-2 border-violet-300 rounded-xl p-3">
              <span className="block text-lg font-black text-violet-700">Normal</span>
              <span className="text-[10px] text-violet-600 font-bold uppercase">Carrier phenotype</span>
            </div>
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3">
              <span className="block text-lg font-black text-red-600">~15%</span>
              <span className="text-[10px] text-red-600 font-bold uppercase">Down risk (mat. carrier)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MOSAICISM ────────────────────────────────────────────────── */}
      {chromosomalMode === 'mosaicism' && (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-['Fredoka']">Mosaicism — Two Cell Populations</span>

          <div className="w-full bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-5">
            {/* Timeline */}
            <div className="flex items-center gap-0 mb-4 overflow-x-auto pb-1">
              {[
                { label: '1', sub: 'Fertilized Egg (normal zygote)', bg: 'bg-emerald-100 border-emerald-600', textColor: 'text-emerald-700' },
                { label: '!', sub: 'Mitotic Nondisjunction (early division)', bg: 'bg-amber-100 border-amber-500', textColor: 'text-amber-700' },
                { label: '2n+1', sub: 'Trisomic daughter cell', bg: 'bg-red-100 border-red-500', textColor: 'text-red-600' },
                { label: '2n', sub: 'Normal daughter cell', bg: 'bg-sky-100 border-sky-500', textColor: 'text-sky-600' },
              ].map((item, i) => (
                <Fragment key={i}>
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-10 h-10 rounded-full ${item.bg} border-3 flex items-center justify-center text-base font-black ${item.textColor}`}>{item.label}</div>
                    <span className={`text-[9px] text-center mt-1 font-bold ${item.textColor} max-w-[60px]`}>{item.sub}</span>
                  </div>
                  {i < 3 && <div className="flex-1 h-1 bg-neutral-300 min-w-[24px]"/>}
                </Fragment>
              ))}
              <div className="flex-1 h-1 bg-neutral-300 min-w-[24px]"/>
              <div className="flex flex-col items-center shrink-0">
                <div className="w-10 h-10 rounded-full bg-violet-100 border-3 border-violet-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                    <circle cx="7" cy="12" r="4" fill="#ef4444"/><circle cx="17" cy="12" r="4" fill="#3b82f6"/>
                    <circle cx="12" cy="7" r="3" fill="#ef4444"/><circle cx="12" cy="17" r="3" fill="#3b82f6"/>
                  </svg>
                </div>
                <span className="text-[9px] text-center mt-1 font-bold text-violet-700 max-w-[60px]">Mosaic embryo: 2 populations</span>
              </div>
            </div>

            {/* Cell grid */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Body Cell Composition</span>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 60 }).map((_, i) => {
                  const isTrisomic = mosaicReveal ? i < 22 : false;
                  return (
                    <div
                      key={i}
                      title={mosaicReveal ? (isTrisomic ? 'Trisomic (47)' : 'Normal (46)') : 'Click Reveal'}
                      className={`w-5 h-5 rounded border transition-all duration-300 ${
                        !mosaicReveal ? 'bg-neutral-200 border-neutral-300'
                        : isTrisomic ? 'bg-red-400 border-red-600 scale-110'
                        : 'bg-sky-300 border-sky-500'
                      }`}
                    />
                  );
                })}
              </div>
              <div className="flex gap-4 text-[10px] font-bold mt-1">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 border border-red-600 inline-block"/> Trisomic cells (47) — 37%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-300 border border-sky-500 inline-block"/> Normal cells (46) — 63%</span>
              </div>
              <button
                onClick={() => setMosaicReveal((v) => !v)}
                className="mt-2 px-5 py-2 rounded-xl border-2 border-neutral-800 bg-violet-600 text-white text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-violet-700 transition-all"
              >
                {mosaicReveal ? 'Reset' : 'Reveal Cell Populations'}
              </button>
            </div>
          </div>

          <div className="w-full grid grid-cols-3 gap-3 text-center">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3">
              <span className="block text-lg font-black text-amber-700">Post-zygotic</span>
              <span className="text-[10px] text-amber-600 font-bold uppercase">When error occurs</span>
            </div>
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3">
              <span className="block text-lg font-black text-red-600">Milder</span>
              <span className="text-[10px] text-red-600 font-bold uppercase">Phenotype vs full trisomy</span>
            </div>
            <div className="bg-sky-50 border-2 border-sky-300 rounded-xl p-3">
              <span className="block text-lg font-black text-sky-600">46 / 47</span>
              <span className="text-[10px] text-sky-600 font-bold uppercase">Mixed karyotype</span>
            </div>
          </div>
        </div>
      )}

      {/* ── INVERSIONS ────────────────────────────────────────────────── */}
      {chromosomalMode === 'inversion' && (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-['Fredoka']">
            Chromosomal Inversions: Pericentric vs. Paracentric
          </span>

          <div className="w-full bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-5 flex flex-col items-center gap-4">
            
            {/* Toggle buttons inside main panel */}
            <div className="flex gap-2">
              <button
                onClick={() => { setInversionType('pericentric'); setInversionStep(0); }}
                className={`text-xs px-4 py-1.5 rounded-xl border-2 font-bold transition-all ${
                  inversionType === 'pericentric'
                    ? 'bg-indigo-600 border-indigo-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-indigo-50'
                }`}
              >
                Pericentric (Includes Centromere)
              </button>
              <button
                onClick={() => { setInversionType('paracentric'); setInversionStep(0); }}
                className={`text-xs px-4 py-1.5 rounded-xl border-2 font-bold transition-all ${
                  inversionType === 'paracentric'
                    ? 'bg-indigo-600 border-indigo-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:bg-indigo-50'
                }`}
              >
                Paracentric (Excludes Centromere)
              </button>
            </div>

            {/* Inversion SVG diagram */}
            <svg viewBox="0 0 400 130" className="w-full max-w-md bg-neutral-50 border border-neutral-200 rounded-xl p-2 select-none">
              {/* Loop overlay */}
              {inversionStep === 1 && (
                <path
                  d={inversionType === 'pericentric' ? 'M 140 30 C 140 -5, 240 -5, 240 30' : 'M 190 30 C 190 -5, 240 -5, 240 30'}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray="4,3"
                />
              )}
              {inversionStep === 1 && (
                <text x="190" y="15" fontSize="8" fontWeight="bold" fill="#ef4444" textAnchor="middle">Inversion Loop</text>
              )}

              {/* Chromatid block rendering */}
              <g className="transition-all duration-500">
                {segments.map((seg) => {
                  let isFlipped = inversionStep === 2;
                  let isSegmentInverted = false;
                  
                  if (inversionType === 'pericentric') {
                    // Pericentric flips C, D, E
                    isSegmentInverted = ['C', 'D', 'E'].includes(seg.id);
                  } else {
                    // Paracentric flips D, E
                    isSegmentInverted = ['D', 'E'].includes(seg.id);
                  }

                  let xPos = seg.normalX;
                  if (isFlipped && isSegmentInverted) {
                    if (inversionType === 'pericentric') {
                      // C (135) -> 235, E (235) -> 135, D (185) -> 185
                      xPos = seg.flippedX;
                    } else {
                      // D (185) -> 235, E (235) -> 185
                      xPos = seg.id === 'D' ? 235 : 185;
                    }
                  }

                  return (
                    <g key={seg.id} transform={`translate(${xPos}, 40)`} style={{ transition: 'transform 0.5s' }}>
                      <rect x="-20" y="-20" width="40" height="40" rx="6" className={`stroke-2 ${seg.color}`} strokeWidth="2" />
                      <text x="0" y="6" fontSize="14" fontWeight="800" textAnchor="middle" className="font-mono">{seg.id}</text>
                    </g>
                  );
                })}

                {/* Centromere (renders as a black bead) */}
                {(() => {
                  let centromereX = 160; // Default between C and D
                  
                  if (inversionType === 'pericentric') {
                    // Normal: between C (135) and D (185) -> x=160
                    // Flipped: sequence is A(35), B(85), E(135), D(185), C(235), F(285)
                    // Centromere remains between C and D, which is now at x=210!
                    centromereX = inversionStep === 2 ? 210 : 160;
                  } else {
                    // Paracentric: centromere is between B (85) and C (135) -> x=110
                    // Flipped: sequence is A(35), B(85), C(135), E(185), D(235), F(285)
                    // Centromere remains between B and C -> x=110 (unmoved!)
                    centromereX = 110;
                  }

                  return (
                    <g transform={`translate(${centromereX}, 40)`} style={{ transition: 'transform 0.5s' }}>
                      <circle cx="0" cy="0" r="10" fill="#1f2937" stroke="#111827" strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="3" fill="#ffffff" />
                      <text x="0" y="-14" fontSize="7" fontWeight="bold" fill="#4b5563" textAnchor="middle">Centromere</text>
                    </g>
                  );
                })()}
              </g>

              {/* Arm labels at the bottom */}
              <text x="85" y="115" fontSize="9" fontWeight="bold" fill="#6b7280" textAnchor="middle">p-arm (Short)</text>
              <text x="235" y="115" fontSize="9" fontWeight="bold" fill="#6b7280" textAnchor="middle">q-arm (Long)</text>
            </svg>

            {/* Step Selector Buttons */}
            <div className="flex gap-2">
              {[0, 1, 2].map((step) => (
                <button
                  key={step}
                  onClick={() => setInversionStep(step)}
                  className={`text-xs px-3 py-1.5 rounded-xl border-2 font-bold transition-all ${
                    inversionStep === step
                      ? 'bg-violet-600 border-violet-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:bg-violet-50'
                  }`}
                >
                  {step === 0 ? '1. Normal' : step === 1 ? '2. Loop' : '3. Flipped'}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 text-center">
            <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-3">
              <span className="block text-md font-black text-indigo-700">
                {inversionType === 'pericentric'
                  ? (inversionStep === 2 ? 'Sub-metacentric (Shifted)' : 'Metacentric (Equal)')
                  : 'Sub-metacentric (Unchanged)'}
              </span>
              <span className="text-[10px] text-indigo-650 font-bold uppercase block mt-1">Arm length ratio</span>
            </div>
            <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3">
              <span className="block text-md font-black text-rose-700">
                {inversionType === 'pericentric' ? 'Normal / Balanced' : 'Dicentric / Acentric risk'}
              </span>
              <span className="text-[10px] text-rose-650 font-bold uppercase block mt-1">Meiotic recombinant hazard</span>
            </div>
          </div>
        </div>
      )}

      {/* ── ISOCHROMOSOMES ────────────────────────────────────────────── */}
      {chromosomalMode === 'isochromosome' && (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-['Fredoka']">
            Isochromosome Formation: Horizontal Cleavage
          </span>

          <div className="w-full bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-5 flex flex-col items-center gap-4">
            
            <svg viewBox="0 0 240 180" className="w-full max-w-xs bg-neutral-50 border border-neutral-200 rounded-xl p-2 select-none">
              {/* Step 0 & 1: Normal vertical chromatids */}
              {isochromosomeStep < 2 && (
                <g className="transition-all duration-300">
                  {/* Left chromatid p-arm (blue) */}
                  <rect x="92" y="25" width="16" height="50" rx="8" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="1.5" />
                  <text x="100" y="55" fontSize="10" fontWeight="bold" fill="#1e3a8a" textAnchor="middle">p</text>

                  {/* Right chromatid p-arm (blue) */}
                  <rect x="112" y="25" width="16" height="50" rx="8" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="1.5" />
                  <text x="120" y="55" fontSize="10" fontWeight="bold" fill="#1e3a8a" textAnchor="middle">p</text>

                  {/* Left chromatid q-arm (emerald) */}
                  <rect x="90" y="86" width="20" height="70" rx="10" fill="#34d399" stroke="#047857" strokeWidth="1.5" />
                  <text x="100" y="125" fontSize="11" fontWeight="bold" fill="#064e3b" textAnchor="middle">q</text>

                  {/* Right chromatid q-arm (emerald) */}
                  <rect x="110" y="86" width="20" height="70" rx="10" fill="#34d399" stroke="#047857" strokeWidth="1.5" />
                  <text x="120" y="125" fontSize="11" fontWeight="bold" fill="#064e3b" textAnchor="middle">q</text>

                  {/* Shared Centromere */}
                  <ellipse cx="110" cy="80" rx="18" ry="8" fill="#6b7280" stroke="#374151" strokeWidth="2" />
                </g>
              )}

              {/* Step 1: Cleavage Line overlay */}
              {isochromosomeStep === 1 && (
                <g className="animate-pulse">
                  <line x1="40" y1="80" x2="180" y2="80" stroke="#dc2626" strokeWidth="3" strokeDasharray="6,4" />
                  <text x="30" y="85" fontSize="14">✂️</text>
                  <text x="185" y="85" fontSize="14">✂️</text>
                  <text x="110" y="96" fontSize="7" fontWeight="bold" fill="#dc2626" textAnchor="middle">TRANSVERSE CLEAVAGE</text>
                </g>
              )}

              {/* Step 2: Isochromosome products */}
              {isochromosomeStep === 2 && (
                <g className="animate-fade-in">
                  {/* i(q) Chromosome (Emerald, dual q arms) */}
                  <g transform="translate(60, 10)">
                    <rect x="-10" y="15" width="20" height="60" rx="10" fill="#34d399" stroke="#047857" strokeWidth="1.5" />
                    <text x="0" y="50" fontSize="10" fontWeight="bold" fill="#064e3b" textAnchor="middle">q</text>
                    
                    <rect x="-10" y="85" width="20" height="60" rx="10" fill="#34d399" stroke="#047857" strokeWidth="1.5" />
                    <text x="0" y="120" fontSize="10" fontWeight="bold" fill="#064e3b" textAnchor="middle">q</text>

                    <circle cx="0" cy="80" r="10" fill="#6b7280" stroke="#374151" strokeWidth="2" />
                    <text x="0" y="5" fontSize="9" fontWeight="bold" fill="#047857" textAnchor="middle">i(q) product</text>
                  </g>

                  {/* i(p) Chromosome (Blue, dual p arms) */}
                  <g transform="translate(160, 20)">
                    <rect x="-8" y="15" width="16" height="40" rx="8" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="1.5" />
                    <text x="0" y="38" fontSize="9" fontWeight="bold" fill="#1e3a8a" textAnchor="middle">p</text>
                    
                    <rect x="-8" y="65" width="16" height="40" rx="8" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="1.5" />
                    <text x="0" y="90" fontSize="9" fontWeight="bold" fill="#1e3a8a" textAnchor="middle">p</text>

                    <circle cx="0" cy="60" r="8" fill="#6b7280" stroke="#374151" strokeWidth="2" />
                    <text x="0" y="5" fontSize="9" fontWeight="bold" fill="#1d4ed8" textAnchor="middle">i(p) product</text>
                  </g>
                </g>
              )}
            </svg>

            {/* Steps buttons */}
            <div className="flex gap-2">
              {[0, 1, 2].map((step) => (
                <button
                  key={step}
                  onClick={() => setIsochromosomeStep(step)}
                  className={`text-xs px-3 py-1.5 rounded-xl border-2 font-bold transition-all ${
                    isochromosomeStep === step
                      ? 'bg-violet-600 border-violet-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:bg-violet-50'
                  }`}
                >
                  {step === 0 ? '1. Metaphase Zygote' : step === 1 ? '2. Horizontal cleavage' : '3. Resulting Isochromosomes'}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 text-center">
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3">
              <span className="block text-md font-black text-emerald-700">i(Xq) Turner Syndrome</span>
              <span className="text-[10px] text-emerald-650 font-bold uppercase block mt-1">Classic clinical correlation</span>
            </div>
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3">
              <span className="block text-md font-black text-amber-700">Unbalanced deletion/duplication</span>
              <span className="text-[10px] text-amber-650 font-bold uppercase block mt-1">Genomic balance</span>
            </div>
          </div>
        </div>
      )}

      {/* ── RING CHROMOSOMES ──────────────────────────────────────────── */}
      {chromosomalMode === 'ring' && (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-['Fredoka']">
            Ring Chromosomes: Telomeric Damage & Circularization
          </span>

          <div className="w-full bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-5 flex flex-col items-center gap-4">
            
            <svg viewBox="0 0 240 180" className="w-full max-w-xs bg-neutral-50 border border-neutral-200 rounded-xl p-2 select-none">
              {!ringFused ? (
                // Normal Linear Chromosome with telomere caps
                <g className="transition-all duration-300">
                  {/* Chromatid body */}
                  <rect x="110" y="30" width="20" height="120" rx="10" fill="#c084fc" stroke="#7e22ce" strokeWidth="1.5" />
                  
                  {/* Top telomere cap (neon green) */}
                  <rect x="110" y="30" width="20" height="15" rx="8" fill="#4ade80" stroke="#15803d" strokeWidth="1.5" />
                  <text x="120" y="41" fontSize="7" fontWeight="bold" fill="#14532d" textAnchor="middle">TEL</text>

                  {/* Bottom telomere cap (neon green) */}
                  <rect x="110" y="135" width="20" height="15" rx="8" fill="#4ade80" stroke="#15803d" strokeWidth="1.5" />
                  <text x="120" y="146" fontSize="7" fontWeight="bold" fill="#14532d" textAnchor="middle">TEL</text>

                  {/* Centromere */}
                  <ellipse cx="120" cy="80" rx="13" ry="7" fill="#6b7280" stroke="#374151" strokeWidth="2" />
                  
                  {/* Break indicators */}
                  <g className="animate-pulse">
                    <line x1="90" y1="48" x2="150" y2="48" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2" />
                    <line x1="90" y1="132" x2="150" y2="132" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2" />
                    <text x="82" y="52" fontSize="10">✂️</text>
                    <text x="82" y="136" fontSize="10">✂️</text>
                  </g>
                </g>
              ) : (
                // Circularized Ring Chromosome (telomeres lost)
                <g className="animate-fade-in">
                  {/* Curved ring path */}
                  <circle cx="120" cy="90" r="45" fill="none" stroke="#c084fc" strokeWidth="16" strokeLinecap="round" />
                  <circle cx="120" cy="90" r="45" fill="none" stroke="#7e22ce" strokeWidth="1" />
                  
                  {/* Centromere on the ring */}
                  <circle cx="120" cy="45" r="9" fill="#6b7280" stroke="#374151" strokeWidth="2" />
                  <circle cx="120" cy="45" r="3" fill="#ffffff" />

                  {/* Lost floating telomeres */}
                  <g opacity="0.4">
                    <rect x="30" y="30" width="16" height="12" rx="4" fill="#4ade80" stroke="#15803d" strokeWidth="1" />
                    <line x1="26" y1="26" x2="50" y2="46" stroke="#ef4444" strokeWidth="1.5" />
                    <text x="38" y="52" fontSize="7" fill="#dc2626" textAnchor="middle">Lost TEL</text>

                    <rect x="190" y="130" width="16" height="12" rx="4" fill="#4ade80" stroke="#15803d" strokeWidth="1" />
                    <line x1="186" y1="126" x2="210" y2="146" stroke="#ef4444" strokeWidth="1.5" />
                    <text x="198" y="152" fontSize="7" fill="#dc2626" textAnchor="middle">Lost TEL</text>
                  </g>

                  <text x="120" y="165" fontSize="9" fontWeight="black" fill="#7e22ce" textAnchor="middle">Ring Chromosome r(X)</text>
                </g>
              )}
            </svg>

            <button
              onClick={() => setRingFused(!ringFused)}
              className={`px-4 py-2 rounded-xl border-2 font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                ringFused
                  ? 'bg-neutral-200 border-neutral-400 text-neutral-700 hover:bg-neutral-300'
                  : 'bg-red-500 border-red-800 text-white hover:bg-red-600'
              }`}
            >
              {ringFused ? 'Reset Chromosome' : 'Trigger Telomere Damage & Ring Fusion'}
            </button>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 text-center">
            <div className="bg-violet-50 border-2 border-violet-300 rounded-xl p-3">
              <span className="block text-md font-black text-violet-700">45,X,r(X) Turner Syndrome</span>
              <span className="text-[10px] text-violet-650 font-bold uppercase block mt-1">Clinical association</span>
            </div>
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3">
              <span className="block text-md font-black text-red-700">Mitotic instability / lost caps</span>
              <span className="text-[10px] text-red-650 font-bold uppercase block mt-1">Etiology</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar Controls ──────────────────────────────────────────────────────

export function ChromosomalErrorsControls({
  chromosomalMode,
  setChromosomalMode,
  setRobertsonStep,
  setMosaicReveal,
}: Pick<Props, 'chromosomalMode' | 'setChromosomalMode' | 'setRobertsonStep' | 'setMosaicReveal'>) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest font-['Fredoka']">Select Concept</h3>
      <div className="flex flex-col gap-2">
        {(
          [
            { mode: 'robertsonian', label: 'Robertsonian Translocation' },
            { mode: 'mosaicism', label: 'Mosaicism' },
            { mode: 'inversion', label: 'Chromosomal Inversions' },
            { mode: 'isochromosome', label: 'Isochromosomes' },
            { mode: 'ring', label: 'Ring Chromosomes' },
          ] as { mode: ChromosomalMode; label: string }[]
        ).map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => {
              setChromosomalMode(mode);
              setRobertsonStep(0);
              setMosaicReveal(false);
            }}
            className={`w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all ${
              chromosomalMode === mode
                ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold'
                : 'border-neutral-200 hover:bg-white/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="border-t border-neutral-300 pt-3 mt-2 space-y-2 text-[10px] text-neutral-500 leading-relaxed">
        {chromosomalMode === 'robertsonian' && (
          <>
            <p className="font-bold text-violet-700 text-xs">Robertsonian Translocation</p>
            <p>Two acrocentric chromosomes (13, 14, 15, 21, 22) break at their centromeres. Long arms fuse; tiny short arms are lost.</p>
            <p className="font-semibold text-neutral-600">Key clue: Parents have 45 chromosomes but are phenotypically NORMAL.</p>
            <ul className="list-disc pl-3 space-y-1">
              <li>Most common: rob(14;21)</li>
              <li>Carrier karyotype: 45,XX,rob(14;21)</li>
              <li>Risk of Down syndrome offspring: ~15% if mother is carrier</li>
            </ul>
          </>
        )}
        {chromosomalMode === 'mosaicism' && (
          <>
            <p className="font-bold text-violet-700 text-xs">Mosaicism</p>
            <p>Nondisjunction occurs AFTER fertilization in an early mitotic division, producing two genetically distinct cell populations.</p>
            <p className="font-semibold text-neutral-600">Key clue: Mosaics have MILDER phenotypes than full trisomics.</p>
            <ul className="list-disc pl-3 space-y-1">
              <li>Mosaic Down syndrome: milder intellectual disability</li>
              <li>Mosaic Turner (45,X / 46,XX): milder than full 45,X</li>
              <li>Mosaic Klinefelter: milder than full 47,XXY</li>
            </ul>
          </>
        )}
        {chromosomalMode === 'inversion' && (
          <>
            <p className="font-bold text-violet-700 text-xs">Chromosomal Inversions</p>
            <p>A chromosome segment flips 180°. Structural rearrangement is balanced, meaning carriers are phenotypically normal but have reduced fertility.</p>
            <ul className="list-disc pl-3 space-y-1">
              <li><strong>Pericentric</strong>: Includes the centromere; flips C-D-E and shifts the centromere position, altering the p/q arm length ratio.</li>
              <li><strong>Paracentric</strong>: Excludes the centromere; flips D-E and leaves centromere position and arm ratio completely unchanged. High risk of dicentric/acentric gametes.</li>
            </ul>
          </>
        )}
        {chromosomalMode === 'isochromosome' && (
          <>
            <p className="font-bold text-violet-700 text-xs">Isochromosomes</p>
            <p>Erronous transverse (horizontal) division of the centromere during meiosis or mitosis, yielding a chromosome with duplicated arms of one type (two p-arms or two q-arms).</p>
            <ul className="list-disc pl-3 space-y-1">
              <li>Most common: <strong>i(Xq)</strong> (isochromosome of the long arm of the X chromosome).</li>
              <li>Causes 15% of all **Turner Syndrome** cases. Short stature is due to the loss of Xp arm genes (e.g. SHOX gene deletion).</li>
            </ul>
          </>
        )}
        {chromosomalMode === 'ring' && (
          <>
            <p className="font-bold text-violet-700 text-xs">Ring Chromosomes</p>
            <p>Double-strand breaks at both telomeric ends of a chromosome chromatid lead to deletion of the caps. The sticky, exposed ends of the remaining fragment circularize into a ring structure.</p>
            <ul className="list-disc pl-3 space-y-1">
              <li>Associated with mitotic instability, radiation, and deletions.</li>
              <li>Common clinical association: <strong>45,X,r(X)</strong> presenting as a milder mosaic variant of **Turner Syndrome**.</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Bottom Metadata ───────────────────────────────────────────────────────

export function ChromosomalErrorsMeta({ chromosomalMode }: { chromosomalMode: ChromosomalMode }) {
  return (
    <>
      <div>
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Concept</span>
        <span className="text-sm font-bold text-neutral-800">
          {chromosomalMode === 'robertsonian' ? 'Robertsonian Translocation'
            : chromosomalMode === 'mosaicism' ? 'Mosaicism'
            : chromosomalMode === 'inversion' ? 'Chromosomal Inversion'
            : chromosomalMode === 'isochromosome' ? 'Isochromosome Division'
            : 'Ring Chromosome Fusion'}
        </span>
      </div>
      <div className="text-left md:text-right">
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Key Board Clue</span>
        <span className="text-xs font-bold text-violet-700 block">
          {chromosomalMode === 'robertsonian' && 'Carrier has 45 chromosomes but is phenotypically NORMAL'}
          {chromosomalMode === 'mosaicism' && 'Error is post-zygotic — milder than full trisomy'}
          {chromosomalMode === 'inversion' && 'Pericentric shifts centromere/changes arm ratio; paracentric does not'}
          {chromosomalMode === 'isochromosome' && 'Transverse cleavage (i(Xq) represents 15% of Turner Syndrome)'}
          {chromosomalMode === 'ring' && 'Exposure of sticky ends after double telomeric deletion leads to ring'}
        </span>
      </div>
    </>
  );
}
