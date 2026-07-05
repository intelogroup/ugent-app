'use client';

import React, { useState } from 'react';
import { AcademicCapIcon, TrashIcon } from '@heroicons/react/24/outline';

type LysosomeDisease = 'tay-sachs' | 'niemann-pick' | 'gaucher' | 'fabry' | 'krabbe';

const DISEASE_DETAILS: Record<LysosomeDisease, {
  enzyme: string; substrate: string; inheritance: string; clues: string[]; color: string;
}> = {
  'tay-sachs': {
    enzyme: 'Hexosaminidase A', substrate: 'GM2 Ganglioside', inheritance: 'Autosomal Recessive',
    clues: [
      'Onion-skin rings inside lysosomes under electron microscopy',
      'Cherry-red macula in retina (NO hepatosplenomegaly)',
      'Hyperacusis, hyperreflexia, progressive neurodegeneration',
    ],
    color: '#fbcfe8',
  },
  'niemann-pick': {
    enzyme: 'Sphingomyelinase', substrate: 'Sphingomyelin', inheritance: 'Autosomal Recessive',
    clues: [
      'Foam cells (lipid-laden macrophages with bubble vacuoles)',
      'Cherry-red macula in retina WITH Hepatosplenomegaly',
      'Progressive neurodegeneration & developmental delay',
    ],
    color: '#cbd5e1',
  },
  'gaucher': {
    enzyme: 'Glucocerebrosidase (β-glucosidase)', substrate: 'Glucocerebroside', inheritance: 'Autosomal Recessive',
    clues: [
      'Gaucher cells resembling crumpled tissue paper',
      'Bone crises, aseptic necrosis of femur head, osteoporosis',
      'Hepatosplenomegaly & pancytopenia (marrow infiltration)',
    ],
    color: '#fde047',
  },
  'fabry': {
    enzyme: 'α-galactosidase A', substrate: 'Ceramide trihexoside', inheritance: 'X-linked Recessive (unique exception!)',
    clues: [
      'Triad: peripheral neuropathy, angiokeratomas, hypohidrosis',
      'Late progression: renal failure and cardiovascular disease',
    ],
    color: '#fca5a5',
  },
  'krabbe': {
    enzyme: 'Galactocerebrosidase', substrate: 'Galactocerebroside & Psychosine', inheritance: 'Autosomal Recessive',
    clues: [
      'Globoid cells (multinucleated macrophages in brain)',
      'Destruction of oligodendrocytes causing severe demyelination',
      'Optic nerve atrophy & blindness, developmental delay',
    ],
    color: '#bfdbfe',
  },
};

export default function LysosomeSimulator() {
  const [disease, setDisease] = useState<LysosomeDisease>('tay-sachs');
  const current = DISEASE_DETAILS[disease];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-[#ECF5FF] border-4 border-neutral-800 rounded-[30px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[520px] shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-4 left-4 z-10">
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-teal-100 text-teal-900 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">Textbook Notebook: Lysosome Recycler</span>
        </div>

        <div className="flex-grow flex items-center justify-center my-6 z-10">
          <svg viewBox="0 0 600 340" className="w-full max-w-2xl h-auto select-none" id="lysosomes-svg-canvas">
            <style>{`
              @keyframes conveyor { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -30; } }
              .lys-belt { animation: conveyor 1.8s infinite linear; }
            `}</style>

            <circle cx="280" cy="155" r="115" fill="#fcfbf7" stroke="#374151" strokeWidth="3.5" filter="url(#hand-drawn-wiggle)" />
            <text x="280" y="68" fill="#4b5563" fontSize="10" fontWeight="900" letterSpacing="2" textAnchor="middle" fontFamily="Fredoka">LYSOSOMAL DEGRADATION CHAMBER</text>

            <g transform="translate(30, 140)" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="155" height="20" fill="#e2e8f0" rx="6" stroke="#374151" strokeWidth="2.5" />
              <line x1="5" y1="10" x2="150" y2="10" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6 6" className="lys-belt" />
              <g transform="translate(85, -25)">
                <rect x="0" y="0" width="28" height="24" fill={current.color} rx="6" stroke="#374151" strokeWidth="2.5" />
                <rect x="14" y="-12" width="28" height="24" fill={current.color} rx="6" stroke="#374151" strokeWidth="2.5" opacity="0.8" />
                <rect x="-8" y="-8" width="28" height="24" fill={current.color} rx="6" stroke="#374151" strokeWidth="2.5" opacity="0.9" />
                <text x="14" y="14" fill="#1e293b" fontSize="8" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">TRASH</text>
              </g>
            </g>

            <g transform="translate(250, 115)" filter="url(#hand-drawn-wiggle)">
              <polygon points="30,0 60,50 0,50" fill="#fca5a5" stroke="#374151" strokeWidth="2.5" />
              <text x="30" y="38" fill="#991b1b" fontSize="28" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">!</text>
              <text x="30" y="68" fill="#7f1d1d" fontSize="9" fontWeight="black" textAnchor="middle">BLOCKED ENZYME</text>
            </g>

            <g transform="translate(280, 225)" filter="url(#hand-drawn-wiggle)">
              <text x="0" y="0" fill="#b91c1c" fontSize="12" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">Accumulating: {current.substrate}</text>
              <text x="0" y="16" fill="#475569" fontSize="9" textAnchor="middle" fontWeight="bold">Missing: {current.enzyme}</text>
            </g>

            {/* Histology Polaroid */}
            <g transform="translate(460, 45)" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="120" height="130" fill="#fafafa" stroke="#374151" strokeWidth="2.5" rx="12" />
              <rect x="10" y="10" width="100" height="85" fill="#f8fafc" stroke="#374151" strokeWidth="1.5" />
              <text x="60" y="112" fill="#4b5563" fontSize="9" fontWeight="900" letterSpacing="1" textAnchor="middle" fontFamily="Fredoka">HISTOLOGY</text>

              {disease === 'tay-sachs' && (<g transform="translate(60, 52)">
                <circle cx="0" cy="0" r="30" fill="none" stroke="#93c5fd" strokeWidth="2" opacity="0.3" />
                <circle cx="0" cy="0" r="22" fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0.6" />
                <circle cx="0" cy="0" r="14" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.8" />
                <circle cx="0" cy="0" r="6" fill="#1d4ed8" stroke="#374151" strokeWidth="1.5" />
                <text x="0" y="44" fill="#1e3a8a" fontSize="8" fontWeight="bold" textAnchor="middle">&quot;Onion Skin&quot;</text>
              </g>)}

              {disease === 'niemann-pick' && (<g transform="translate(60, 52)">
                <circle cx="0" cy="0" r="28" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2.5" />
                <circle cx="-10" cy="-6" r="6" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="7" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                <circle cx="-6" cy="10" r="5" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                <circle cx="10" cy="-8" r="6" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="4" fill="#64748b" />
                <text x="0" y="44" fill="#475569" fontSize="8" fontWeight="bold" textAnchor="middle">Foamy Cytoplasm</text>
              </g>)}

              {disease === 'gaucher' && (<g transform="translate(60, 52)">
                <polygon points="0,-25 24,-15 15,20 -18,22 -24,-5" fill="#fef9c3" stroke="#eab308" strokeWidth="2" />
                <line x1="-15" y1="-10" x2="12" y2="12" stroke="#eab308" strokeWidth="1.5" />
                <line x1="-20" y1="8" x2="8" y2="-15" stroke="#eab308" strokeWidth="1.5" />
                <line x1="8" y1="18" x2="-8" y2="-6" stroke="#eab308" strokeWidth="1.5" />
                <circle cx="0" cy="5" r="5" fill="#ca8a04" />
                <text x="0" y="44" fill="#854d0e" fontSize="8" fontWeight="bold" textAnchor="middle">&quot;Crumpled Paper&quot;</text>
              </g>)}

              {disease === 'fabry' && (<g transform="translate(60, 52)">
                <circle cx="-14" cy="-14" r="6" fill="#fecaca" stroke="#f87171" strokeWidth="1.5" />
                <circle cx="14" cy="-6" r="5.5" fill="#fca5a5" stroke="#f87171" strokeWidth="1.5" />
                <circle cx="0" cy="14" r="7" fill="#f87171" stroke="#ef4444" strokeWidth="1.5" />
                <circle cx="-9" cy="5" r="5" fill="#f87171" stroke="#f87171" strokeWidth="1.5" />
                <text x="0" y="44" fill="#991b1b" fontSize="8" fontWeight="bold" textAnchor="middle">Angiokeratoma</text>
              </g>)}

              {disease === 'krabbe' && (<g transform="translate(60, 52)">
                <rect x="-24" y="-24" width="48" height="48" rx="12" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" />
                <circle cx="-10" cy="-10" r="5" fill="#2563eb" />
                <circle cx="10" cy="-6" r="5" fill="#2563eb" />
                <circle cx="0" cy="10" r="5" fill="#2563eb" />
                <text x="0" y="44" fill="#1e40af" fontSize="8" fontWeight="bold" textAnchor="middle">Globoid Cells</text>
              </g>)}
            </g>
          </svg>
        </div>

        <div className="bg-[#E5F1FF] border-4 border-neutral-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Inheritance</span>
            <span className="text-sm font-bold text-neutral-800">{current.inheritance}</span>
          </div>
          <div className="text-right">
            <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Missing Enzyme</span>
            <span className="text-sm font-bold text-emerald-700">{current.enzyme}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        <div className="bg-[#E0F2FE] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[-1deg]">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center mb-4 gap-2 font-['Fredoka']"><TrashIcon className="w-5 h-5 text-blue-700" />Disease log</h2>
          <div className="space-y-2">
            {(['tay-sachs', 'niemann-pick', 'gaucher', 'fabry', 'krabbe'] as LysosomeDisease[]).map((d) => (
              <button key={d} onClick={() => setDisease(d)} className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all duration-300 capitalize ${disease === d ? 'border-neutral-800 bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]' : 'border-transparent hover:bg-neutral-50/50'}`}>
                {d.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#E5F1FF] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[1deg]">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest flex items-center gap-1.5 mb-3 font-['Fredoka']"><AcademicCapIcon className="w-4 h-4" />Clinical Board Clues</h3>
          <ul className="space-y-3">
            {current.clues.map((clue, idx) => (
              <li key={idx} className="text-neutral-750 text-xs md:text-sm flex items-start gap-2 leading-relaxed font-medium">
                <span className="text-primary-500 font-extrabold mt-0.5">•</span>
                <span>{clue}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
