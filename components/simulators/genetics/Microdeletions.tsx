'use client';

import { useState } from 'react';
import { MicrodeletionType } from './types';

interface Props {
  microdeletionMode: MicrodeletionType;
  setMicrodeletionMode: (m: MicrodeletionType) => void;
  isDeleted: boolean;
  setIsDeleted: (v: boolean | ((prev: boolean) => boolean)) => void;
  activeCatchSymptom: string | null;
  setActiveCatchSymptom: (s: string | null) => void;
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function MicrodeletionsPanel({
  microdeletionMode,
  isDeleted,
  setIsDeleted,
  activeCatchSymptom,
  setActiveCatchSymptom,
}: Omit<Props, 'setMicrodeletionMode'>) {
  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* Tab Header */}
      <div className="text-center">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-['Fredoka']">
          {microdeletionMode === 'williams'
            ? 'Williams Syndrome (7q11.23 Deletion)'
            : microdeletionMode === 'criduchat'
            ? 'Cri-du-Chat Syndrome (5p Deletion)'
            : 'DiGeorge / 22q11.2 Deletion Syndrome'}
        </span>
      </div>

      {/* Main Interactive Sketchbook */}
      <div className="w-full max-w-2xl bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-5 flex flex-col md:flex-row items-center gap-6">
        
        {/* LEFT: Chromosome Deletion Visualizer */}
        <div className="w-full md:w-1/2 flex flex-col items-center border-r-0 md:border-r-2 md:border-dashed md:border-neutral-300 pr-0 md:pr-6">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
            Chromosome Map
          </span>

          <svg viewBox="0 0 200 280" className="w-full max-w-[180px]" role="img" aria-label="Interactive chromosome deletion diagram">
            {/* Chromosome Outline (Normal or Deleted) */}
            <g className="transition-all duration-500">
              {/* Chromatid Banding and Structure */}
              {/* Centromere */}
              <ellipse cx="100" cy="110" rx="14" ry="7" fill="#6b7280" stroke="#1f2937" strokeWidth="2" />

              {/* p-arm (Short Arm) */}
              <g className={`transition-all duration-700 origin-[100px_110px] ${
                microdeletionMode === 'criduchat' && isDeleted
                  ? 'opacity-0 scale-y-0 -translate-y-10'
                  : 'opacity-100'
              }`}>
                {/* Arm skeleton */}
                <path d="M90,110 C90,40 110,40 110,110 Z" fill="#d1d5db" stroke="#1f2937" strokeWidth="2" />
                {/* Bands */}
                <path d="M91,80 C95,80 105,80 109,80" stroke="#4b5563" strokeWidth="2.5" />
                <path d="M92,60 C96,60 104,60 108,60" stroke="#1f2937" strokeWidth="3.5" />
                
                {/* Cri-du-chat Target Region (5p15) */}
                {microdeletionMode === 'criduchat' && (
                  <g>
                    <rect x="91" y="45" width="18" height="12" fill={isDeleted ? '#f87171' : '#f59e0b'} className="transition-colors duration-300" stroke="#1f2937" strokeWidth="1.5" />
                    <text x="100" y="54" fontSize="8" fontWeight="bold" fill={isDeleted ? '#ffffff' : '#1f2937'} textAnchor="middle">5p15</text>
                  </g>
                )}
              </g>

              {/* q-arm (Long Arm) */}
              <g>
                {/* Arm skeleton */}
                <path d="M90,110 C85,240 115,240 110,110 Z" fill="#e5e7eb" stroke="#1f2937" strokeWidth="2" />
                {/* Bands */}
                <path d="M88,140 C93,140 107,140 112,140" stroke="#4b5563" strokeWidth="2.5" />
                <path d="M86,170 C92,170 108,170 114,170" stroke="#1f2937" strokeWidth="4" />
                <path d="M86,200 C92,200 108,200 114,200" stroke="#9ca3af" strokeWidth="2" />

                {/* Williams Target Region (7q11.23) */}
                {microdeletionMode === 'williams' && (
                  <g className={`transition-all duration-500 origin-[100px_155px] ${isDeleted ? 'opacity-20 scale-75' : 'opacity-100'}`}>
                    <rect x="87" y="148" width="26" height="15" fill={isDeleted ? '#f87171' : '#3b82f6'} stroke="#1f2937" strokeWidth="1.5" className="transition-colors duration-300" />
                    <text x="100" y="158" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">7q11.23</text>
                    {isDeleted && <line x1="84" y1="145" x2="116" y2="166" stroke="#ef4444" strokeWidth="2.5" />}
                  </g>
                )}

                {/* DiGeorge Target Region (22q11.2) */}
                {microdeletionMode === 'digeorge' && (
                  <g className={`transition-all duration-500 origin-[100px_185px] ${isDeleted ? 'opacity-20 scale-75' : 'opacity-100'}`}>
                    <rect x="86" y="178" width="28" height="15" fill={isDeleted ? '#f87171' : '#8b5cf6'} stroke="#1f2937" strokeWidth="1.5" className="transition-colors duration-300" />
                    <text x="100" y="188" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">22q11.2</text>
                    {isDeleted && <line x1="83" y1="175" x2="117" y2="196" stroke="#ef4444" strokeWidth="2.5" />}
                  </g>
                )}
              </g>
            </g>

            {/* Labels and chromosome title */}
            <text x="100" y="265" fontSize="11" fontWeight="bold" fill="#374151" textAnchor="middle" fontFamily="Fredoka">
              {microdeletionMode === 'williams' ? 'Chr 7' : microdeletionMode === 'criduchat' ? 'Chr 5' : 'Chr 22'}
            </text>
          </svg>

          {/* Action Button */}
          <button
            onClick={() => {
              setIsDeleted(v => !v);
              setActiveCatchSymptom(null);
            }}
            className={`mt-4 px-4 py-2 rounded-xl border-2 font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
              isDeleted
                ? 'bg-neutral-200 border-neutral-400 text-neutral-700 hover:bg-neutral-300'
                : 'bg-red-500 border-red-800 text-white hover:bg-red-600'
            }`}
          >
            {isDeleted ? 'Revert Deletion' : 'Trigger Microdeletion'}
          </button>
        </div>

        {/* RIGHT: Phenotype / Clinical Consequence */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center min-h-[200px]">
          {!isDeleted ? (
            <div className="text-center p-4">
              <span className="block text-neutral-400 text-3xl mb-2 font-bold">🧬</span>
              <p className="text-xs text-neutral-500 italic">
                Trigger the microdeletion on the chromosome map to simulate the clinical syndrome.
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center space-y-4 animate-fade-in">
              {/* Williams Clinical Presentation */}
              {microdeletionMode === 'williams' && (
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3 bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                    <span className="text-2xl">😊</span>
                    <div>
                      <span className="block text-xs font-bold text-blue-800">Extreme Friendliness</span>
                      <span className="text-[10px] text-blue-600">Highly social with strangers, strong verbal skills.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                    <span className="text-2xl">🥛</span>
                    <div>
                      <span className="block text-xs font-bold text-amber-800">Hypercalcemia</span>
                      <span className="text-[10px] text-amber-600">Increased sensitivity to Vitamin D.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-red-50 border-2 border-red-200 rounded-xl p-3">
                    <span className="text-2xl">❤️</span>
                    <div>
                      <span className="block text-xs font-bold text-red-800">Elastin Deletion Effect</span>
                      <span className="text-[10px] text-red-600">Supravalvular aortic stenosis, elfin-like facial features.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cri-du-chat Clinical Presentation */}
              {microdeletionMode === 'criduchat' && (
                <div className="w-full text-center space-y-3">
                  {/* Cat sketch */}
                  <div className="relative inline-block bg-amber-50 border-3 border-neutral-800 rounded-2xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-4xl block animate-bounce">🐱</span>
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] px-1 rounded-full font-bold uppercase tracking-wider animate-pulse">mew!</span>
                    <span className="block text-xs font-black text-neutral-800 mt-2 font-['Fredoka']">"Cry of the Cat"</span>
                  </div>

                  <div className="w-full space-y-2 text-left bg-neutral-50 border-2 border-neutral-200 rounded-xl p-3 text-[10px] text-neutral-600">
                    <p><strong>• Etiology</strong>: 5p deletion affecting larynx and nervous system development.</p>
                    <p><strong>• Microcephaly</strong>: Significantly smaller head circumference.</p>
                    <p><strong>• Congenital Heart</strong>: Ventricular Septal Defect (VSD) (<em>"Very SaD"</em>).</p>
                    <p><strong>• Facial Features</strong>: Epicanthal folds, round face, low-set ears.</p>
                  </div>
                </div>
              )}

              {/* DiGeorge Clinical Presentation */}
              {microdeletionMode === 'digeorge' && (
                <div className="w-full space-y-3">
                  <span className="block text-center text-xs font-bold text-neutral-500 uppercase tracking-widest font-['Fredoka']">CATCH-22 Checklist</span>
                  
                  <div className="grid grid-cols-5 gap-1.5 justify-center">
                    {['C', 'A', 'T', 'C', 'H'].map((char, index) => {
                      const labels = ['Cardiac', 'Abnormal Facies', 'Thymic', 'Cleft Palate', 'Hypocalcemia'];
                      const active = activeCatchSymptom === labels[index];
                      return (
                        <button
                          key={index}
                          onMouseEnter={() => setActiveCatchSymptom(labels[index])}
                          onClick={() => setActiveCatchSymptom(labels[index])}
                          className={`h-9 rounded-lg border-2 font-black text-sm flex items-center justify-center transition-all ${
                            active
                              ? 'bg-violet-600 border-violet-800 text-white scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                              : 'bg-white border-neutral-300 text-neutral-700 hover:border-violet-400'
                          }`}
                        >
                          {char}
                        </button>
                      );
                    })}
                  </div>

                  {/* Symptom Details */}
                  <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-3 min-h-[95px] flex flex-col justify-center text-center">
                    {activeCatchSymptom ? (
                      <div>
                        <span className="block text-xs font-bold text-violet-800">{activeCatchSymptom}</span>
                        <span className="text-[10px] text-violet-600 block mt-1">
                          {activeCatchSymptom === 'Cardiac' && 'Truncus arteriosus, Tetralogy of Fallot (conotruncal abnormalities).'}
                          {activeCatchSymptom === 'Abnormal Facies' && 'Short philtrum, low-set ears, micrognathia.'}
                          {activeCatchSymptom === 'Thymic' && 'Thymic hypoplasia causing T-cell deficiency and recurrent viral/fungal infections.'}
                          {activeCatchSymptom === 'Cleft Palate' && 'Bifid uvula or cleft lip/palate.'}
                          {activeCatchSymptom === 'Hypocalcemia' && 'Parathyroid aplasia causes low calcium, leading to tetany and seizures.'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-violet-500 italic">
                        Hover/click on the C-A-T-C-H keys above to examine the 22q11 clinical manifestation.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Controls ──────────────────────────────────────────────────────

export function MicrodeletionsControls({
  microdeletionMode,
  setMicrodeletionMode,
  setIsDeleted,
  setActiveCatchSymptom,
}: Pick<Props, 'microdeletionMode' | 'setMicrodeletionMode' | 'setIsDeleted' | 'setActiveCatchSymptom'>) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest font-['Fredoka']">
        Microdeletions
      </h3>
      <div className="flex flex-col gap-2">
        {(
          [
            { mode: 'williams', label: 'Williams Syndrome' },
            { mode: 'criduchat', label: 'Cri-du-Chat' },
            { mode: 'digeorge', label: 'DiGeorge / 22q11' },
          ] as { mode: MicrodeletionType; label: string }[]
        ).map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => {
              setMicrodeletionMode(mode);
              setIsDeleted(false);
              setActiveCatchSymptom(null);
            }}
            className={`w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all ${
              microdeletionMode === mode
                ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold'
                : 'border-neutral-200 hover:bg-white/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="border-t border-neutral-300 pt-3 mt-2 space-y-2 text-[10px] text-neutral-500 leading-relaxed">
        {microdeletionMode === 'williams' && (
          <>
            <p className="font-bold text-blue-700 text-xs">Williams Syndrome</p>
            <p>
              Microdeletion on 7q11.23 containing the elastin (ELN) gene. Results in elastic fiber abnormalities throughout the body.
            </p>
            <p className="font-semibold text-neutral-600">
              Key board features: Strangers are their best friends, elfin face, supravalvular aortic stenosis, and hypercalcemia.
            </p>
          </>
        )}
        {microdeletionMode === 'criduchat' && (
          <>
            <p className="font-bold text-amber-600 text-xs">Cri-du-Chat Syndrome</p>
            <p>
              Deletion on short arm of chromosome 5 (5p). Causes developmental delays in vocal cords and brain.
            </p>
            <p className="font-semibold text-neutral-600">
              Key board features: High-pitched cat-like cry in infant, microcephaly, epicanthal folds, and VSD.
            </p>
          </>
        )}
        {microdeletionMode === 'digeorge' && (
          <>
            <p className="font-bold text-violet-700 text-xs">22q11.2 Deletion Syndromes</p>
            <p>
              Microdeletion on chromosome 22. Causes aberrant development of the 3rd and 4th pharyngeal pouches.
            </p>
            <p className="font-semibold text-neutral-600">
              Key board features: CATCH-22. Recurrent infections (no thymus), tetany/seizures (no parathyroids), and truncus arteriosus/TOF.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Bottom Metadata ───────────────────────────────────────────────────────

export function MicrodeletionsMeta({
  microdeletionMode,
  isDeleted,
}: {
  microdeletionMode: MicrodeletionType;
  isDeleted: boolean;
}) {
  return (
    <>
      <div>
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">
          Syndrome
        </span>
        <span className="text-sm font-bold text-neutral-800">
          {microdeletionMode === 'williams'
            ? 'Williams Syndrome'
            : microdeletionMode === 'criduchat'
            ? 'Cri-du-Chat Syndrome'
            : 'DiGeorge / 22q11'}
        </span>
      </div>
      <div className="text-left md:text-right">
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">
          State
        </span>
        <span className="text-xs font-bold text-violet-700 block">
          {!isDeleted ? 'Normal chromosome' : 'Microdeletion present'}
        </span>
      </div>
    </>
  );
}
