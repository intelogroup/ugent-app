'use client';

import React from 'react';
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';

// Types specific to this panel
export type NonClassicalMode = 'imprinting' | 'heteroplasmy' | 'trinucleotide';
export type ImprintingState = 'normal' | 'paternal-del' | 'maternal-del' | 'maternal-upd' | 'paternal-upd';
export type TrinucleotideDisease = 'huntington' | 'fragile-x' | 'myotonic';

interface NonClassicalPanelProps {
  mode: NonClassicalMode;
  imprintingState: ImprintingState;
  heteroplasmyPct: number;
  trinucleotideDisease: TrinucleotideDisease;
  trinucleotideRepeats: number;
}

export function NonClassicalPanel({
  mode,
  imprintingState,
  heteroplasmyPct,
  trinucleotideDisease,
  trinucleotideRepeats,
}: NonClassicalPanelProps) {
  
  // ─── Render Imprinting Mode ───
  if (mode === 'imprinting') {
    const isPWS = imprintingState === 'paternal-del' || imprintingState === 'maternal-upd';
    const isAS = imprintingState === 'maternal-del' || imprintingState === 'paternal-upd';

    // Chromosome 15 configurations
    // Left chromosome (Paternal)
    const patStatus =
      imprintingState === 'paternal-del'
        ? 'deleted'
        : imprintingState === 'maternal-upd'
        ? 'replaced' // maternal UPD means two maternal copies, no paternal
        : 'normal';

    // Right chromosome (Maternal)
    const matStatus =
      imprintingState === 'maternal-del'
        ? 'deleted'
        : imprintingState === 'paternal-upd'
        ? 'replaced' // paternal UPD means two paternal copies, no maternal
        : 'normal';

    // Labeling helper
    const getLeftChromLabel = () => {
      if (imprintingState === 'maternal-upd') return 'Maternal Chromosome 15 (UPD)';
      return 'Paternal Chromosome 15';
    };

    const getRightChromLabel = () => {
      if (imprintingState === 'paternal-upd') return 'Paternal Chromosome 15 (UPD)';
      return 'Maternal Chromosome 15';
    };

    return (
      <div className="w-full flex flex-col items-center">
        <div className="mb-4 text-center">
          <p className="text-sm font-bold text-neutral-600 uppercase tracking-wider">
            Chromosome 15q11-q13 Imprinting Map
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Active copies determine health. Inactive copies are epigenetically methylated (silenced).
          </p>
        </div>

        <div className="relative w-full max-w-md h-64 bg-white/40 border-2 border-dashed border-neutral-300 rounded-2xl flex items-center justify-around p-4 shadow-inner">
          {/* LEFT CHROMOSOME */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-neutral-500 mb-2">{getLeftChromLabel()}</span>
            {patStatus === 'deleted' ? (
              // Deleted Dotted Outline
              <div className="w-12 h-40 border-3 border-dashed border-red-300 rounded-full flex items-center justify-center bg-red-50/20">
                <span className="text-red-500 font-extrabold text-xs rotate-[-15deg] uppercase">Deleted</span>
              </div>
            ) : (
              // Active Paternal Chromosome (Blue or Pink if maternal UPD replacement)
              <div 
                className={`relative w-12 h-40 rounded-full border-3 border-neutral-800 flex flex-col justify-around py-4 items-center shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] ${
                  imprintingState === 'maternal-upd' ? 'bg-rose-100' : 'bg-sky-100'
                }`}
                style={{ filter: 'url(#hand-drawn-wiggle-fine)' }}
              >
                {/* Centromere */}
                <div className="absolute top-12 w-full h-2 bg-neutral-500 border-y border-neutral-800" />
                
                {/* PWS Gene Locus */}
                <div className="z-10 flex flex-col items-center w-full px-1">
                  <div className={`w-8 h-6 rounded flex items-center justify-center border border-neutral-800 ${
                    imprintingState === 'maternal-upd' ? 'bg-neutral-300 text-neutral-500' : 'bg-emerald-300 text-emerald-950 font-bold'
                  } text-[9px]`}>
                    {imprintingState === 'maternal-upd' ? '🔒' : 'PWS'}
                  </div>
                  <span className="text-[7px] font-bold mt-0.5 scale-90">
                    {imprintingState === 'maternal-upd' ? 'Methylated' : 'ACTIVE'}
                  </span>
                </div>

                {/* UBE3A Gene Locus */}
                <div className="z-10 flex flex-col items-center w-full px-1">
                  <div className={`w-8 h-6 rounded flex items-center justify-center border border-neutral-800 ${
                    imprintingState === 'maternal-upd' ? 'bg-pink-300 text-pink-950 font-bold' : 'bg-neutral-300 text-neutral-500'
                  } text-[9px]`}>
                    {imprintingState === 'maternal-upd' ? 'UBE3A' : '🔒'}
                  </div>
                  <span className="text-[7px] font-bold mt-0.5 scale-90">
                    {imprintingState === 'maternal-upd' ? 'ACTIVE' : 'Methylated'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* MIDDLE FLOW ARROW */}
          <div className="flex flex-col items-center justify-center max-w-[80px]">
            <span className="text-2xl">➔</span>
            <div className={`text-center mt-2 p-2 rounded-xl border-2 border-neutral-800 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              isPWS ? 'bg-amber-100 text-amber-900' : isAS ? 'bg-purple-100 text-purple-900' : 'bg-emerald-100 text-emerald-950'
            }`}>
              {isPWS ? 'Prader-Willi' : isAS ? 'Angelman' : 'Normal Euploid'}
            </div>
          </div>

          {/* RIGHT CHROMOSOME */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-neutral-500 mb-2">{getRightChromLabel()}</span>
            {matStatus === 'deleted' ? (
              // Deleted Dotted Outline
              <div className="w-12 h-40 border-3 border-dashed border-red-300 rounded-full flex items-center justify-center bg-red-50/20">
                <span className="text-red-500 font-extrabold text-xs rotate-[15deg] uppercase">Deleted</span>
              </div>
            ) : (
              // Active Maternal Chromosome (Pink or Blue if paternal UPD replacement)
              <div 
                className={`relative w-12 h-40 rounded-full border-3 border-neutral-800 flex flex-col justify-around py-4 items-center shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] ${
                  imprintingState === 'paternal-upd' ? 'bg-sky-100' : 'bg-rose-100'
                }`}
                style={{ filter: 'url(#hand-drawn-wiggle-fine)' }}
              >
                {/* Centromere */}
                <div className="absolute top-12 w-full h-2 bg-neutral-500 border-y border-neutral-800" />
                
                {/* PWS Gene Locus */}
                <div className="z-10 flex flex-col items-center w-full px-1">
                  <div className={`w-8 h-6 rounded flex items-center justify-center border border-neutral-800 ${
                    imprintingState === 'paternal-upd' ? 'bg-sky-300 text-sky-950 font-bold' : 'bg-neutral-300 text-neutral-500'
                  } text-[9px]`}>
                    {imprintingState === 'paternal-upd' ? 'PWS' : '🔒'}
                  </div>
                  <span className="text-[7px] font-bold mt-0.5 scale-90">
                    {imprintingState === 'paternal-upd' ? 'ACTIVE' : 'Methylated'}
                  </span>
                </div>

                {/* UBE3A Gene Locus */}
                <div className="z-10 flex flex-col items-center w-full px-1">
                  <div className={`w-8 h-6 rounded flex items-center justify-center border border-neutral-800 ${
                    imprintingState === 'paternal-upd' ? 'bg-neutral-300 text-neutral-500' : 'bg-pink-300 text-pink-950 font-bold'
                  } text-[9px]`}>
                    {imprintingState === 'paternal-upd' ? '🔒' : 'UBE3A'}
                  </div>
                  <span className="text-[7px] font-bold mt-0.5 scale-90">
                    {imprintingState === 'paternal-upd' ? 'Methylated' : 'ACTIVE'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Diagnosis details overlay */}
        <div className="mt-4 text-center max-w-md bg-white p-3 rounded-xl border-2 border-neutral-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
          {imprintingState === 'normal' && (
            <p className="text-xs font-semibold text-emerald-800">
              ✅ Both paternal PWS gene and maternal UBE3A gene are active. Development is normal.
            </p>
          )}
          {isPWS && (
            <p className="text-xs font-semibold text-amber-800">
              🚨 <span className="font-bold underline">Prader-Willi Syndrome (PWS)</span>: 0 active copies of paternal PWS gene. Causes neonatal hypotonia, developmental delay, and hyperphagia leading to early obesity.
            </p>
          )}
          {isAS && (
            <p className="text-xs font-semibold text-purple-800">
              🚨 <span className="font-bold underline">Angelman Syndrome (AS)</span>: 0 active copies of maternal UBE3A gene. Causes ataxia, severe intellectual disability, microcephaly, seizures, and inappropriate laughter.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Render Heteroplasmy Mode ───
  if (mode === 'heteroplasmy') {
    const totalMit = 10;
    const mutatedCount = Math.round((heteroplasmyPct / 100) * totalMit);
    const normalCount = totalMit - mutatedCount;

    // ATP Production Curve: decreases non-linearly with mutated mtDNA load
    const atpPct = Math.max(0, Math.round(100 - Math.pow(heteroplasmyPct / 10, 1.8)));

    const getAtpColor = () => {
      if (atpPct > 70) return 'bg-emerald-500';
      if (atpPct > 35) return 'bg-amber-500';
      return 'bg-red-500';
    };

    return (
      <div className="w-full flex flex-col items-center">
        <div className="mb-4 text-center">
          <p className="text-sm font-bold text-neutral-600 uppercase tracking-wider">
            Mitochondrial Heteroplasmy Cell Simulator
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Clinical threshold effect: High energy organs (Brain/Muscle) fail first as mutated mtDNA load rises.
          </p>
        </div>

        {/* The Cell Container */}
        <div className="relative w-full max-w-md h-56 bg-neutral-100 rounded-[35px] border-4 border-neutral-800 p-4 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.15)] flex flex-wrap justify-center items-center gap-4 overflow-hidden">
          {/* Cell Nucleus */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-neutral-300 border-2 border-neutral-800 border-dashed flex items-center justify-center opacity-65 z-0">
            <span className="text-[9px] font-bold text-neutral-600">Nucleus</span>
          </div>

          {/* Render Mitochondria */}
          {Array.from({ length: totalMit }).map((_, i) => {
            const isMutated = i < mutatedCount;
            return (
              <div
                key={i}
                className={`relative z-10 w-12 h-7 rounded-full border-2 border-neutral-800 flex items-center justify-center ${
                  isMutated 
                    ? 'bg-red-200 text-red-700 animate-pulse' 
                    : 'bg-emerald-200 text-emerald-800'
                }`}
                style={{ 
                  transform: `rotate(${i * 35}deg)`,
                  filter: 'url(#hand-drawn-wiggle-fine)'
                }}
              >
                {/* Cristae (inner folds) */}
                <div className="w-9 h-3 border-y border-neutral-800/40 flex justify-around">
                  <span className="text-[5px]">~</span>
                  <span className="text-[5px]">~</span>
                  <span className="text-[5px]">~</span>
                </div>
                {isMutated && (
                  <span className="absolute -top-1 -right-1 text-[8px]">🚨</span>
                )}
              </div>
            );
          })}
        </div>

        {/* ATP Gauge & Stats */}
        <div className="mt-4 w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded-xl border-2 border-neutral-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-xs font-bold text-neutral-600 block mb-1">ATP Output Level</span>
            <div className="w-full bg-neutral-200 rounded-full h-4 overflow-hidden border border-neutral-800">
              <div className={`h-full transition-all duration-300 ${getAtpColor()}`} style={{ width: `${atpPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-neutral-500 mt-1">
              <span>0% (Cell Death)</span>
              <span>{atpPct}% Production</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border-2 border-neutral-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
            <span className="text-xs font-bold text-neutral-600">Cell Genotype:</span>
            <div className="flex gap-4 mt-1 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-neutral-800" />
                <span>Normal: {normalCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-neutral-800" />
                <span>Mutated: {mutatedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render Trinucleotide Mode ───
  if (mode === 'trinucleotide') {
    // Config values based on selected disease
    let codon = 'CAG';
    let label = 'Huntington Disease';
    let normalLimit = 35;
    let fullMutationLimit = 40;
    
    if (trinucleotideDisease === 'fragile-x') {
      codon = 'CGG';
      label = 'Fragile X Syndrome';
      normalLimit = 54;
      fullMutationLimit = 200;
    } else if (trinucleotideDisease === 'myotonic') {
      codon = 'CTG';
      label = 'Myotonic Dystrophy Type 1';
      normalLimit = 49;
      fullMutationLimit = 50;
    }

    const isFullMutation = trinucleotideRepeats >= fullMutationLimit;
    const isCarrier = trinucleotideRepeats > normalLimit && trinucleotideRepeats < fullMutationLimit;
    const isNormal = trinucleotideRepeats <= normalLimit;

    // Visual segment scale - stretching the sequence box based on repeats
    const stretchPct = Math.min(100, Math.max(10, (trinucleotideRepeats / fullMutationLimit) * 80));

    const getSubtitle = () => {
      if (trinucleotideDisease === 'fragile-x') {
        return 'CGG repeats > 200 trigger CpG hypermethylation, silencing FMR1 transcription.';
      }
      if (trinucleotideDisease === 'huntington') {
        return 'CAG repeats > 40 cause toxic protein gain-of-function (polyglutamine accumulation in HTT).';
      }
      return 'CTG repeats > 50 lead to toxic RNA accumulation that sequesters splicing proteins (e.g. MBNL1).';
    };

    return (
      <div className="w-full flex flex-col items-center">
        <div className="mb-4 text-center">
          <p className="text-sm font-bold text-neutral-600 uppercase tracking-wider">
            {label} ({codon} triplet repeat)
          </p>
          <p className="text-xs text-neutral-500 mt-1 px-4">
            {getSubtitle()}
          </p>
        </div>

        {/* Double Helix / Repeat Block */}
        <div className="relative w-full max-w-md h-44 bg-white/40 border-2 border-neutral-800 rounded-2xl p-4 flex flex-col items-center justify-around overflow-hidden shadow-inner">
          
          {/* DNA Strand */}
          <div className="relative w-full h-8 flex items-center justify-center">
            {/* Background backbone rails */}
            <div className="absolute w-full h-1 bg-neutral-800/20 top-2" />
            <div className="absolute w-full h-1 bg-neutral-800/20 bottom-2" />
            
            {/* Visual dynamic repeat sequence blocks */}
            <div 
              className={`h-7 border-2 border-neutral-800 rounded flex items-center justify-around font-mono font-bold text-[10px] transition-all duration-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] ${
                isNormal ? 'bg-sky-200 border-sky-800 text-sky-950' : 
                isCarrier ? 'bg-amber-200 border-amber-800 text-amber-950 animate-pulse' : 
                'bg-red-200 border-red-800 text-red-950'
              }`}
              style={{ width: `${stretchPct}%` }}
            >
              <span>({codon})x{trinucleotideRepeats}</span>
            </div>
          </div>

          {/* Fragile X methylation overlay */}
          {trinucleotideDisease === 'fragile-x' && isFullMutation && (
            <div className="absolute inset-0 bg-neutral-800/80 backdrop-blur-[1px] flex flex-col items-center justify-center text-white p-4 transition-all duration-300">
              <LockClosedIcon className="w-8 h-8 text-red-400 mb-1 animate-bounce" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-red-400">CpG Methylation Silence</span>
              <span className="text-[10px] text-neutral-300 text-center mt-1">
                CGG repeats &gt; 200 trigger DNA methyltransferase, tagging promoter Cytosines (CpG islands) with -CH₃ to shut down FMR1 expression.
              </span>
            </div>
          )}

          {/* Status Label */}
          <div className="flex gap-2 items-center">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              isNormal ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
              isCarrier ? 'bg-amber-100 text-amber-800 border-amber-300' :
              'bg-red-100 text-red-800 border-red-300'
            }`}>
              {isNormal ? 'Normal Variant' : isCarrier ? 'Premutation / Carrier' : 'Full Pathology / Disease'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Controls Sidebar ───
interface NonClassicalControlsProps {
  mode: NonClassicalMode;
  setMode: (mode: NonClassicalMode) => void;
  imprintingState: ImprintingState;
  setImprintingState: (state: ImprintingState) => void;
  heteroplasmyPct: number;
  setHeteroplasmyPct: (pct: number) => void;
  trinucleotideDisease: TrinucleotideDisease;
  setTrinucleotideDisease: (disease: TrinucleotideDisease) => void;
  trinucleotideRepeats: number;
  setTrinucleotideRepeats: (repeats: number) => void;
}

export function NonClassicalControls({
  mode,
  setMode,
  imprintingState,
  setImprintingState,
  heteroplasmyPct,
  setHeteroplasmyPct,
  trinucleotideDisease,
  setTrinucleotideDisease,
  trinucleotideRepeats,
  setTrinucleotideRepeats,
}: NonClassicalControlsProps) {

  // Auto-align repeats slider range depending on selected disease
  const handleDiseaseChange = (disease: TrinucleotideDisease) => {
    setTrinucleotideDisease(disease);
    if (disease === 'huntington') setTrinucleotideRepeats(45);
    else if (disease === 'fragile-x') setTrinucleotideRepeats(250);
    else if (disease === 'myotonic') setTrinucleotideRepeats(120);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Sub-lab Mode</h3>
        <div className="grid grid-cols-3 gap-1 bg-[#D6E8FC] p-1 rounded-xl border border-neutral-300">
          {(
            [
              { id: 'imprinting', label: 'Imprinting' },
              { id: 'heteroplasmy', label: 'Heteroplasmy' },
              { id: 'trinucleotide', label: 'Repeats' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                mode === m.id ? 'bg-white border-2 border-neutral-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'text-neutral-600 hover:bg-white/40'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* IMPRINTING CONTROLS */}
      {mode === 'imprinting' && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Imprinting States</h3>
          <div className="space-y-1.5">
            {(
              [
                { id: 'normal', label: 'Normal Euploid' },
                { id: 'paternal-del', label: 'Paternal 15q Deletion (PWS)' },
                { id: 'maternal-del', label: 'Maternal 15q Deletion (AS)' },
                { id: 'maternal-upd', label: 'Maternal Uniparental Disomy (PWS)' },
                { id: 'paternal-upd', label: 'Paternal Uniparental Disomy (AS)' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setImprintingState(s.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs border-2 font-medium transition-all ${
                  imprintingState === s.id
                    ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]'
                    : 'border-transparent hover:bg-white/40'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* HETEROPLASMY CONTROLS */}
      {mode === 'heteroplasmy' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Mutated mtDNA Load</h3>
          <div className="p-3 bg-white rounded-2xl border-2 border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
              <span>Mutated mtDNA:</span>
              <span className="text-red-600">{heteroplasmyPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={heteroplasmyPct}
              onChange={(e) => setHeteroplasmyPct(Number(e.target.value))}
              className="w-full accent-neutral-800"
            />
            <div className="flex justify-between text-[9px] text-neutral-400 mt-1">
              <span>Homoplasmy (Normal)</span>
              <span>Homoplasmy (Mutated)</span>
            </div>
          </div>
        </div>
      )}

      {/* TRINUCLEOTIDE CONTROLS */}
      {mode === 'trinucleotide' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Target Disease</h3>
            <div className="grid grid-cols-1 gap-1.5">
              {(
                [
                  { id: 'huntington', label: 'Huntington (CAG)' },
                  { id: 'fragile-x', label: 'Fragile X (CGG)' },
                  { id: 'myotonic', label: 'Myotonic Dystrophy (CTG)' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleDiseaseChange(d.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs border-2 font-medium transition-all ${
                    trinucleotideDisease === d.id
                      ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]'
                      : 'border-transparent hover:bg-white/40'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Triplet Repeat Count</h3>
            <div className="p-3 bg-white rounded-2xl border-2 border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                <span>Repeats:</span>
                <span className="text-neutral-900">{trinucleotideRepeats}</span>
              </div>
              <input
                type="range"
                min={trinucleotideDisease === 'fragile-x' ? '15' : '10'}
                max={trinucleotideDisease === 'fragile-x' ? '500' : '150'}
                value={trinucleotideRepeats}
                onChange={(e) => setTrinucleotideRepeats(Number(e.target.value))}
                className="w-full accent-neutral-800"
              />
              <div className="flex justify-between text-[8px] text-neutral-400 mt-1">
                <span>Mild Variant</span>
                <span>Expanded Pathology</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Status Metadata Bar ───
interface NonClassicalMetaProps {
  mode: NonClassicalMode;
  imprintingState: ImprintingState;
  heteroplasmyPct: number;
  trinucleotideDisease: TrinucleotideDisease;
  trinucleotideRepeats: number;
}

export function NonClassicalMeta({
  mode,
  imprintingState,
  heteroplasmyPct,
  trinucleotideDisease,
  trinucleotideRepeats,
}: NonClassicalMetaProps) {
  
  if (mode === 'imprinting') {
    if (imprintingState === 'normal') {
      return (
        <div className="text-xs font-semibold text-neutral-700">
          📊 **Molecular Status**: 100% normal allele complement. Epigenetic methylation patterns correctly match sex-of-origin.
        </div>
      );
    }
    const isPWS = imprintingState === 'paternal-del' || imprintingState === 'maternal-upd';
    if (isPWS) {
      return (
        <div className="text-xs font-semibold text-neutral-700">
          💡 **PWS Mechanism**: Silenced maternal genes combined with deleted or absent active paternal genes on chromosome 15. Mnemonic: **POP** (Paternal, Obesity, Prader-Willi).
        </div>
      );
    }
    return (
      <div className="text-xs font-semibold text-neutral-700">
        💡 **AS Mechanism**: Silenced paternal UBE3A combined with deleted or absent active maternal UBE3A. Mnemonic: **MAMAS** (Maternal, Angelman, Mood, Ataxia, Seizures).
      </div>
    );
  }

  if (mode === 'heteroplasmy') {
    return (
      <div className="text-xs font-semibold text-neutral-700">
        ⚡ **Heteroplasmy Note**: Mitochondria are randomly segregated during mitotic splitting. Severity varies wildly based on fraction of mutated mitochondria.
      </div>
    );
  }

  // Trinucleotide repeats status notes
  let genAnticipation = 'Gen 1: Asymptomatic';
  let severity = 'None';
  let onset = 'Normal';

  if (trinucleotideDisease === 'fragile-x') {
    if (trinucleotideRepeats < 55) {
      genAnticipation = 'Gen 1: Asymptomatic';
      severity = 'None';
      onset = 'N/A';
    } else if (trinucleotideRepeats <= 200) {
      genAnticipation = 'Gen 2: Carrier (Intention tremor / primary ovarian insufficiency)';
      severity = 'Mild/Premutation';
      onset = 'Adult';
    } else {
      genAnticipation = 'Gen 3: Intellectual disability, macroorchidism, long face';
      severity = 'Severe/Full Mutation';
      onset = 'Childhood';
    }
  } else if (trinucleotideDisease === 'huntington') {
    if (trinucleotideRepeats < 36) {
      genAnticipation = 'Gen 1: Healthy';
      severity = 'None';
      onset = 'N/A';
    } else if (trinucleotideRepeats <= 39) {
      genAnticipation = 'Gen 2: Incomplete penetrance (late chorea)';
      severity = 'Moderate';
      onset = 'Late Adult';
    } else {
      genAnticipation = 'Gen 3: Severe caudate atrophy, chorea, early dementia';
      severity = 'Severe';
      onset = 'Early Adult / Juvenile';
    }
  } else {
    // Myotonic Dystrophy
    if (trinucleotideRepeats < 50) {
      genAnticipation = 'Gen 1: Asymptomatic';
      severity = 'None';
      onset = 'N/A';
    } else if (trinucleotideRepeats < 100) {
      genAnticipation = 'Gen 2: Mild weakness, cataracts';
      severity = 'Mild';
      onset = 'Adult';
    } else {
      genAnticipation = 'Gen 3: Severe muscle wasting, grip myotonia, balding, gonadal atrophy';
      severity = 'Severe';
      onset = 'Childhood / Early Adult';
    }
  }

  return (
    <div className="text-xs font-semibold text-neutral-700">
      🧬 **Anticipation**: {genAnticipation} | **Onset**: {onset} | **Repeats**: {trinucleotideRepeats}
    </div>
  );
}
