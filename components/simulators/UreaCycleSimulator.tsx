'use client';

import React, { useState } from 'react';
import { AcademicCapIcon, CpuChipIcon } from '@heroicons/react/24/outline';

type UreaCycleDisease = 'normal' | 'otc-deficiency' | 'cps1-deficiency';

export default function UreaCycleSimulator() {
  const [disease, setDisease] = useState<UreaCycleDisease>('normal');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-[#ECF5FF] border-4 border-neutral-800 rounded-[30px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[520px] shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-4 left-4 z-10">
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-900 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">Textbook Notebook: Urea Cycle</span>
        </div>
        <div className="absolute top-4 right-4 z-10">
          {disease === 'normal'          && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-950 border-2 border-neutral-800">Active Cycle</span>}
          {disease === 'otc-deficiency'  && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-950 border-2 border-neutral-800">OTC Deficiency</span>}
          {disease === 'cps1-deficiency' && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-950 border-2 border-neutral-800">CPS1 Deficiency</span>}
        </div>

        <div className="flex-grow flex items-center justify-center my-6 z-10">
          <svg viewBox="0 0 600 340" className="w-full max-w-2xl h-auto select-none" id="ureacycle-svg-canvas">
            <style>{`
              @keyframes pipe-flow { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -32; } }
              @keyframes warning-flash { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
              .ure-pipe-active { animation: pipe-flow 1.5s infinite linear; }
              .ure-warning { animation: warning-flash 1s infinite alternate; }
            `}</style>

            {/* Membrane divider */}
            <path d="M 270,10 L 270,320" stroke="#374151" strokeWidth="2.5" strokeDasharray="6 4" filter="url(#hand-drawn-wiggle)" />
            <path d="M 282,10 L 282,320" stroke="#374151" strokeWidth="1.5" strokeDasharray="6 4" filter="url(#hand-drawn-wiggle)" />
            <text x="255" y="305" fill="#64748b" fontSize="9" fontWeight="900" textAnchor="end" fontFamily="Fredoka">MITOCHONDRION</text>
            <text x="295" y="305" fill="#64748b" fontSize="9" fontWeight="900" fontFamily="Fredoka">CYTOSOL</text>

            {/* CPS1 */}
            <g transform="translate(30, 35)" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="200" height="65" rx="12" fill={disease === 'cps1-deficiency' ? '#fca5a5' : '#dbeafe'} stroke="#374151" strokeWidth="2.5" />
              <text x="100" y="24" fill="#1e293b" fontSize="13" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">CPS1</text>
              <text x="100" y="42" fill="#1e40af" fontSize="8" textAnchor="middle">NH₃ + CO₂ + 2 ATP → Carbamoyl PO₄</text>
              <text x="100" y="53" fill="#15803d" fontSize="7" textAnchor="middle" fontWeight="bold">Requires N-acetylglutamate (NAG)</text>
              {disease === 'cps1-deficiency' && <text x="100" y="12" fill="#b91c1c" fontSize="7" fontWeight="bold" textAnchor="middle" className="ure-warning">DEFICIENT</text>}
            </g>

            {/* OTC */}
            <g transform="translate(30, 155)" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="200" height="65" rx="12" fill={disease === 'otc-deficiency' ? '#fca5a5' : '#ccfbf1'} stroke="#374151" strokeWidth="2.5" />
              <text x="100" y="24" fill="#1e293b" fontSize="13" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">OTC</text>
              <text x="100" y="43" fill="#0f766e" fontSize="8" textAnchor="middle">Ornithine Transcarbamylase</text>
              <text x="100" y="54" fill="#0f766e" fontSize="7" textAnchor="middle">Ornithine + Carbamoyl-P → Citrulline</text>
              {disease === 'otc-deficiency' && <text x="100" y="12" fill="#b91c1c" fontSize="7" fontWeight="bold" textAnchor="middle" className="ure-warning">DEFICIENT</text>}
            </g>

            {/* NH3 warning */}
            {disease === 'cps1-deficiency' && (
              <g transform="translate(60, 110)" className="ure-warning">
                <path d="M 0,10 A 10,10 0 0 1 15,0 A 15,15 0 0 1 45,5 A 10,10 0 0 1 60,15 A 10,10 0 0 1 45,25 L 15,25 A 10,10 0 0 1 0,10 Z" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
                <text x="30" y="18" fill="#b91c1c" fontSize="9" fontWeight="black" textAnchor="middle">NH₃ Spikes!</text>
              </g>
            )}

            {/* Cytosol loop */}
            <path d="M 330,100 C 470,100 540,150 540,200 C 540,250 470,280 330,280" fill="none" stroke={disease === 'normal' ? '#86efac' : '#cbd5e1'} strokeWidth="4" strokeLinecap="round" className={disease === 'normal' ? 'ure-pipe-active' : ''} strokeDasharray="8 8" />

            {/* ORNT1 transporter */}
            <g transform="translate(260, 115)" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="30" height="90" rx="8" fill="#f1f5f9" stroke="#374151" strokeWidth="2.5" />
              <text x="15" y="45" fill="#475569" fontSize="8" fontWeight="black" textAnchor="middle" transform="rotate(-90, 15, 45)" fontFamily="Fredoka">ORNT1 PORE</text>
            </g>

            {/* Citrulline / Ornithine arrows */}
            {disease === 'normal' && (<g stroke="#16a34a" strokeWidth="2" fill="none">
              <path d="M 230,120 L 310,120" strokeDasharray="3 3" className="ure-pipe-active" />
              <polygon points="310,117 316,120 310,123" fill="#16a34a" />
              <path d="M 310,200 L 230,200" strokeDasharray="3 3" className="ure-pipe-active" />
              <polygon points="230,197 224,200 230,203" fill="#16a34a" />
            </g>)}

            {/* Orotic acid shunt */}
            {disease === 'otc-deficiency' && (<g transform="translate(180, 205)">
              <path d="M 0,10 C 60,10 80,55 130,55" fill="none" stroke="#d946ef" strokeWidth="4" className="ure-pipe-active" strokeDasharray="8 8" />
              <polygon points="130,51 137,55 130,59" fill="#d946ef" />
              <g transform="translate(130, 38)" filter="url(#hand-drawn-wiggle)">
                <rect x="0" y="0" width="105" height="35" rx="8" fill="#fdf4ff" stroke="#374151" strokeWidth="2" />
                <text x="52.5" y="22" fill="#701a75" fontSize="10" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">Orotic Acid</text>
              </g>
            </g>)}

            {/* Labels */}
            <g transform="translate(380, 80)" filter="url(#hand-drawn-wiggle)">
              <text x="0" y="0" fill="#475569" fontSize="9" fontWeight="bold">Citrulline + Aspartate</text>
            </g>
            <g transform="translate(480, 210)" filter="url(#hand-drawn-wiggle)">
              <text x="0" y="0" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Argininosuccinate</text>
            </g>
            <g transform="translate(380, 310)" filter="url(#hand-drawn-wiggle)">
              <text x="0" y="0" fill="#16a34a" fontSize="11" fontWeight="black">Urea Excreted (ARG1)</text>
            </g>
          </svg>
        </div>

        <div className="bg-[#E5F1FF] border-4 border-neutral-800 p-4 rounded-2xl">
          <p className="text-sm font-semibold text-center text-neutral-700">
            {disease === 'normal'          && 'Detox active. Excess Ammonia is safely packaged into Citrulline, processed in cytosol, and excreted as Urea.'}
            {disease === 'otc-deficiency'  && 'OTC block! Carbamoyl Phosphate overflows, escaping to cytosol where it enters Pyrimidine synthesis to yield Orotic Acid.'}
            {disease === 'cps1-deficiency' && 'CPS1 block! The very entry point is jammed. Hyperammonemia spikes immediately, but Orotic Acid remains normal.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        <div className="bg-[#E0F2FE] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[1deg]">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center mb-4 gap-2 font-['Fredoka']"><CpuChipIcon className="w-5 h-5 text-blue-700" />Pathology Panel</h2>
          <div className="space-y-3">
            {[
              { id: 'normal',          title: 'Normal Cycle',       desc: 'No blocks. Safe detox of nitrogen waste.' },
              { id: 'otc-deficiency',  title: 'OTC Deficiency',     desc: 'X-linked Recessive. High Ammonia + High Orotic Aciduria.' },
              { id: 'cps1-deficiency', title: 'CPS1 Deficiency',    desc: 'Autosomal Recessive. High Ammonia but NO Orotic Aciduria.' },
            ].map((d) => (
              <label key={d.id} className={`flex items-start p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 ${disease === d.id ? 'border-neutral-800 bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]' : 'border-transparent hover:bg-neutral-50/50'}`}>
                <input type="radio" name="ureaDisease" checked={disease === d.id} onChange={() => setDisease(d.id as UreaCycleDisease)} className="mt-1.5 mr-3 text-emerald-600 focus:ring-emerald-500 bg-white border-neutral-400" />
                <div>
                  <span className="text-sm font-bold text-neutral-900 block font-['Fredoka']">{d.title}</span>
                  <span className="text-xs text-neutral-600 mt-1 block leading-relaxed font-medium">{d.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-[#E5F1FF] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[-1deg]">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest flex items-center gap-1.5 mb-3 font-['Fredoka']"><AcademicCapIcon className="w-4 h-4" />Ammonia Plant Metaphor</h3>
          <p className="text-neutral-700 text-xs md:text-sm leading-relaxed font-medium">
            <strong>The Ammonia Detox Plant:</strong> Ammonia is highly toxic cellular sludge. CPS1 is the primary processor funneling sludge into the plant. OTC is the packing line loading it onto conveyor belts (Citrulline) to send out of the factory division (Mitochondria) into the cytosol, where it is finally boxed as Urea for exit (excretion).
          </p>
        </div>
      </div>
    </div>
  );
}
