'use client';

import React from 'react';
import { MUTATIONS } from './types';

interface Props {
  mutationType: string;
  setMutationType: (t: string) => void;
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function MutationFactoryPanel({ mutationType }: { mutationType: string }) {
  const currentMut = MUTATIONS[mutationType];
  return (
    <div className="w-full flex flex-col items-center space-y-8">
      {/* DNA Strand */}
      <div className="w-full max-w-lg bg-yellow-50/50 border-3 border-dashed border-neutral-400 p-4 rounded-2xl relative">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 font-['Fredoka']">DNA Template Strand (3&apos; → 5&apos;)</h4>
        <div className="flex justify-around items-center font-mono text-lg font-bold text-blue-900 bg-white border-2 border-neutral-800 p-3 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          {currentMut.dna.map((codon, idx) => (
            <div key={idx} className="flex flex-col items-center px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
              <span>{codon}</span>
              <span className="text-[10px] text-neutral-400 font-sans mt-0.5">Codon {idx + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* mRNA Strand */}
      <div className="w-full max-w-lg bg-orange-50/50 border-3 border-dashed border-neutral-400 p-4 rounded-2xl relative">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 font-['Fredoka']">mRNA Transcript (5&apos; → 3&apos;)</h4>
        <div className="flex justify-around items-center font-mono text-lg font-bold text-orange-950 bg-white border-2 border-neutral-800 p-3 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          {currentMut.mrna.map((codon, idx) => (
            <div key={idx} className="flex flex-col items-center px-3 py-1 bg-orange-50 border border-orange-200 rounded-md">
              <span>{codon}</span>
              <span className="text-[10px] text-neutral-400 font-sans mt-0.5">Codon {idx + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Polypeptide Chain */}
      <div className="w-full max-w-lg flex flex-col items-center">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 font-['Fredoka']">Translated Polypeptide Chain</h4>
        <div className="flex items-center gap-2 py-4 px-6 bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          {currentMut.protein.map((aa, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <div className="w-6 h-1 bg-neutral-800" />}
              <div className={`w-14 h-14 rounded-full border-3 flex items-center justify-center font-bold text-neutral-800 text-sm font-['Fredoka'] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${aa.color}`}>
                {aa.name}
              </div>
            </React.Fragment>
          ))}
          {currentMut.protein.length === 0 && (
            <span className="text-sm font-bold text-neutral-400 italic">No translation initiated</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Controls ──────────────────────────────────────────────────────

export function MutationFactoryControls({ mutationType, setMutationType }: Props) {
  const currentMut = MUTATIONS[mutationType];
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest font-['Fredoka']">Mutation Selectors</h3>
      <div className="flex flex-col gap-2">
        {Object.keys(MUTATIONS).map((key) => (
          <button
            key={key}
            onClick={() => setMutationType(key)}
            className={`w-full text-left text-xs px-3 py-2 rounded-xl border transition-all ${mutationType === key ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-neutral-200 hover:bg-white/30'}`}
          >
            {MUTATIONS[key].label}
          </button>
        ))}
      </div>
      <p className="text-neutral-600 text-xs leading-relaxed border-t border-neutral-300 pt-3">
        {currentMut.description}
      </p>
    </div>
  );
}

// ─── Bottom Metadata ───────────────────────────────────────────────────────

export function MutationFactoryMeta({ mutationType }: { mutationType: string }) {
  const currentMut = MUTATIONS[mutationType];
  return (
    <>
      <div>
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Selected Mutation Mode</span>
        <span className="text-sm font-bold text-neutral-800">{currentMut.label}</span>
      </div>
      <div className="text-left md:text-right max-w-md">
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Clinical Note</span>
        <span className="text-xs font-bold text-neutral-700 block">{currentMut.clinicalClue}</span>
      </div>
    </>
  );
}
