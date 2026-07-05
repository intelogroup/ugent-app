'use client';

import { useState, useEffect } from 'react';

export type DiagnosticMode = 'blot' | 'flow' | 'fish';
export type TargetMolecule = 'dna' | 'rna' | 'protein' | 'db-protein';
export type ProbeType = 'dna-probe' | 'rna-probe' | 'antibody' | 'dsdna-probe';
export type FlowPatient = 'normal' | 'hiv';
export type FishPatient = 'normal' | 'digeorge';

interface Props {
  mode: DiagnosticMode;
  setMode: (m: DiagnosticMode) => void;
  // Blotting states
  target: TargetMolecule;
  setTarget: (t: TargetMolecule) => void;
  probe: ProbeType;
  setProbe: (p: ProbeType) => void;
  gelRunning: boolean;
  setGelRunning: React.Dispatch<React.SetStateAction<boolean>>;
  gelProgress: number;
  setGelProgress: React.Dispatch<React.SetStateAction<number>>;
  // Flow cytometry states
  flowPatient: FlowPatient;
  setFlowPatient: (p: FlowPatient) => void;
  selectedGate: 'none' | 'lymphocytes' | 'granulocytes';
  setSelectedGate: (g: 'none' | 'lymphocytes' | 'granulocytes') => void;
  // FISH states
  fishPatient: FishPatient;
  setFishPatient: (p: FishPatient) => void;
  showFishProbe: boolean;
  setShowFishProbe: (b: boolean) => void;
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function DiagnosticLabPanel({
  mode,
  target,
  probe,
  gelRunning,
  setGelRunning,
  gelProgress,
  setGelProgress,
  flowPatient,
  selectedGate,
  setSelectedGate,
  fishPatient,
  showFishProbe,
}: Omit<Props, 'setMode' | 'setTarget' | 'setProbe' | 'setFlowPatient' | 'setFishPatient' | 'setShowFishProbe'>) {
  
  // Electrophoresis animation effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gelRunning && gelProgress < 100) {
      interval = setInterval(() => {
        setGelProgress((p) => {
          if (p >= 100) {
            setGelRunning(false);
            return 100;
          }
          return p + 10;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [gelRunning, gelProgress, setGelProgress, setGelRunning]);

  // Determine if blot is a correct combination (SNOW DROP)
  // Southern (DNA) -> DNA probe
  // Northern (RNA) -> DNA/RNA probe
  // Western (Protein) -> Antibody
  // Southwestern (DNA-binding protein) -> dsDNA probe
  const isBlotCorrect =
    (target === 'dna' && probe === 'dna-probe') ||
    (target === 'rna' && (probe === 'rna-probe' || probe === 'dna-probe')) ||
    (target === 'protein' && probe === 'antibody') ||
    (target === 'db-protein' && probe === 'dsdna-probe');

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* ── BLOTTING ─────────────────────────────────────────────────── */}
      {mode === 'blot' && (
        <div className="w-full max-w-2xl bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-5 flex flex-col md:flex-row items-center gap-6">
          {/* Gel Plate Visualizer */}
          <div className="w-full md:w-1/2 flex flex-col items-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Gel Electrophoresis</span>
            <div className="w-full max-w-[140px] h-[220px] bg-neutral-900 border-3 border-neutral-800 rounded-lg p-2 relative flex flex-col justify-between overflow-hidden">
              {/* Wells at the top */}
              <div className="flex justify-around">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-6 h-3 bg-neutral-800 border border-neutral-600 rounded-b" />
                ))}
              </div>

              {/* Running band lanes */}
              <div className="flex-grow relative w-full mt-2">
                {/* Lane 1: Sample Lane */}
                <div className="absolute left-[15%] w-6 h-full flex flex-col items-center">
                  {gelProgress > 0 && (
                    <div
                      className="w-full h-2 bg-blue-400 border border-blue-600 rounded transition-all duration-300"
                      style={{ transform: `translateY(${(gelProgress / 100) * 160}px)` }}
                    />
                  )}
                </div>

                {/* Lane 2: Target Lane */}
                <div className="absolute left-[50%] w-6 h-full flex flex-col items-center">
                  {gelProgress > 0 && (
                    <div
                      className={`w-full h-2 border rounded transition-all duration-300 ${
                        gelProgress === 100 && isBlotCorrect
                          ? 'bg-emerald-400 border-emerald-600 shadow-[0_0_10px_2px_rgba(52,211,153,0.8)] animate-pulse'
                          : gelProgress === 100
                          ? 'bg-neutral-600 border-neutral-700 opacity-30'
                          : 'bg-indigo-400 border-indigo-600'
                      }`}
                      style={{ transform: `translateY(${(gelProgress / 100) * 120}px)` }}
                    />
                  )}
                </div>
              </div>

              {/* Anode indicator at bottom */}
              <div className="w-full text-center text-[8px] font-bold text-red-500 uppercase tracking-widest mt-1">
                + Positive Anode (+)
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setGelProgress(0);
                  setGelRunning(true);
                }}
                disabled={gelRunning}
                className="px-3 py-1.5 rounded-lg border-2 border-neutral-800 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                Run Gel
              </button>
              <button
                onClick={() => {
                  setGelProgress(0);
                  setGelRunning(false);
                }}
                className="px-3 py-1.5 rounded-lg border-2 border-neutral-800 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Results/Mnemonic Dashboard */}
          <div className="w-full md:w-1/2 flex flex-col justify-center space-y-4">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Diagnostic Signal</span>
            {gelProgress < 100 ? (
              <div className="text-center p-6 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
                <span className="text-2xl">⏳</span>
                <p className="text-xs text-neutral-500 italic mt-1">
                  Run the gel electrophoresis to separate molecules and apply probes.
                </p>
              </div>
            ) : isBlotCorrect ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-center space-y-2 animate-fade-in">
                <span className="text-3xl block">🟢 Signal Positive!</span>
                <span className="block text-xs font-bold text-emerald-800">
                  {target === 'dna' && 'Southern Blot successful.'}
                  {target === 'rna' && 'Northern Blot successful.'}
                  {target === 'protein' && 'Western Blot successful.'}
                  {target === 'db-protein' && 'Southwestern Blot successful.'}
                </span>
                <p className="text-[10px] text-emerald-600 leading-relaxed font-medium">
                  {target === 'dna' && 'The DNA probe successfully hybridized to the target DNA fragment.'}
                  {target === 'rna' && 'The probe successfully hybridized to the target mRNA transcript.'}
                  {target === 'protein' && 'The antibody probe successfully bound to the target antigen protein.'}
                  {target === 'db-protein' && 'The double-stranded DNA probe bound to the target transcription factor.'}
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-center space-y-2 animate-fade-in">
                <span className="text-3xl block">❌ No Signal</span>
                <span className="block text-xs font-bold text-red-800">Mismatch Detected</span>
                <p className="text-[10px] text-red-600 leading-relaxed font-medium">
                  Incompatible match. In clinical diagnostic testing, a mismatch yields zero visualization signal. Review **S-N-O-W  D-R-O-P** rules.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FLOW CYTOMETRY ───────────────────────────────────────────── */}
      {mode === 'flow' && (
        <div className="w-full max-w-2xl bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-5 flex flex-col md:flex-row items-center gap-6">
          
          {/* Scatter Plot */}
          <div className="w-full md:w-1/2 flex flex-col items-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Cell Scatter Plot</span>
            
            <div className="relative w-[180px] h-[180px] bg-[#f8fafc] border-2 border-neutral-800 rounded p-1">
              {/* Axes */}
              <div className="absolute left-0 bottom-0 top-0 w-0.5 bg-neutral-800" />
              <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-neutral-800" />
              <span className="absolute -left-5 top-1/2 -rotate-90 text-[8px] font-bold text-neutral-400 tracking-wider">SSC</span>
              <span className="absolute bottom-[-16px] left-1/2 -translate-x-1/2 text-[8px] font-bold text-neutral-400 tracking-wider">FSC</span>

              {/* Granulocyte Cluster (High FSC, High SSC) */}
              <div
                onClick={() => setSelectedGate('granulocytes')}
                className={`absolute right-4 top-4 w-16 h-16 rounded-full cursor-pointer transition-all ${
                  selectedGate === 'granulocytes'
                    ? 'border-2 border-dashed border-red-500 bg-red-100/40 scale-105 shadow-md'
                    : 'hover:bg-neutral-200/50'
                }`}
              >
                {/* Dots */}
                <div className="absolute top-2 left-3 w-1.5 h-1.5 rounded-full bg-red-400 opacity-60" />
                <div className="absolute top-6 left-6 w-1.5 h-1.5 rounded-full bg-red-400 opacity-60" />
                <div className="absolute top-8 left-2 w-1.5 h-1.5 rounded-full bg-red-400 opacity-60" />
                <div className="absolute top-4 left-9 w-1.5 h-1.5 rounded-full bg-red-400 opacity-60" />
                <div className="absolute top-10 left-8 w-1.5 h-1.5 rounded-full bg-red-400 opacity-60" />
                <span className="absolute -top-3 left-0 text-[8px] font-bold text-red-500">Granulocytes</span>
              </div>

              {/* Lymphocyte Cluster (Low FSC, Low SSC) */}
              <div
                onClick={() => setSelectedGate('lymphocytes')}
                className={`absolute left-4 bottom-4 w-16 h-16 rounded-full cursor-pointer transition-all ${
                  selectedGate === 'lymphocytes'
                    ? 'border-2 border-dashed border-blue-500 bg-blue-100/40 scale-105 shadow-md'
                    : 'hover:bg-neutral-200/50'
                }`}
              >
                {/* Dots */}
                <div className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-blue-400 opacity-60" />
                <div className="absolute top-8 left-8 w-1.5 h-1.5 rounded-full bg-blue-400 opacity-60" />
                <div className="absolute top-10 left-3 w-1.5 h-1.5 rounded-full bg-blue-400 opacity-60" />
                <div className="absolute top-3 left-9 w-1.5 h-1.5 rounded-full bg-blue-400 opacity-60" />
                <span className="absolute -top-3 left-0 text-[8px] font-bold text-blue-500">Lymphocytes</span>
              </div>
            </div>
            
            <p className="text-[9px] text-neutral-400 text-center mt-5 font-medium">
              Click a cluster to "Gate" and analyze population markers.
            </p>
          </div>

          {/* Flow Analysis Dashboard */}
          <div className="w-full md:w-1/2 flex flex-col justify-center min-h-[180px]">
            {selectedGate === 'none' && (
              <div className="text-center p-4 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
                <span className="text-2xl">🔬</span>
                <p className="text-xs text-neutral-500 italic mt-1">
                  Select a gated region on the scatter plot to display cell-specific CD markers.
                </p>
              </div>
            )}

            {selectedGate === 'granulocytes' && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 space-y-2 animate-fade-in">
                <span className="text-xs font-bold text-red-800 uppercase block">Gated: Granulocyte Cluster</span>
                <p className="text-[10px] text-red-600 leading-relaxed font-medium">
                  Cells show **High Size (FSC)** and **High Granularity (SSC)**. Mostly neutrophils, eosinophils, and basophils.
                </p>
                <div className="bg-white/80 rounded-lg p-2 border border-red-200 text-[10px] font-semibold text-red-700">
                  CD15+, CD16+ (Neutrophils)
                </div>
              </div>
            )}

            {selectedGate === 'lymphocytes' && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-800 uppercase">Gated: Lymphocytes</span>
                  <span className="text-[8px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold uppercase">
                    {flowPatient === 'normal' ? 'Normal Patient' : 'HIV Patient'}
                  </span>
                </div>
                <p className="text-[10px] text-blue-600 leading-relaxed">
                  Cells show **Low Size (FSC)** and **Low Granularity (SSC)**. Analyzed with anti-CD4 and anti-CD8 antibodies:
                </p>
                
                {/* Ratio Bar Chart */}
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[8px] font-bold text-neutral-500">
                      <span>CD4+ Helper T-Cells</span>
                      <span>{flowPatient === 'normal' ? '65%' : '12%'}</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: flowPatient === 'normal' ? '65%' : '12%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[8px] font-bold text-neutral-500">
                      <span>CD8+ Cytotoxic T-Cells</span>
                      <span>{flowPatient === 'normal' ? '30%' : '50%'}</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: flowPatient === 'normal' ? '30%' : '50%' }}
                      />
                    </div>
                  </div>
                </div>

                <div className={`p-2 rounded border text-[10px] font-bold ${
                  flowPatient === 'normal'
                    ? 'bg-emerald-100/50 border-emerald-300 text-emerald-800'
                    : 'bg-red-100/50 border-red-300 text-red-800'
                }`}>
                  {flowPatient === 'normal'
                    ? 'Ratio CD4:CD8 ≈ 2:1 (Normal T-cell balance)'
                    : 'Ratio CD4:CD8 < 0.5:1 (Diagnostic for AIDS / HIV progression)'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FISH ─────────────────────────────────────────────────────── */}
      {mode === 'fish' && (
        <div className="w-full max-w-2xl bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-5 flex flex-col md:flex-row items-center gap-6">
          {/* FISH Microscope Display */}
          <div className="w-full md:w-1/2 flex flex-col items-center">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Microscope Field (FISH)</span>
            
            <div className="relative w-[180px] h-[180px] bg-neutral-950 border-3 border-neutral-800 rounded-full overflow-hidden flex items-center justify-center shadow-inner">
              {/* Gridlines */}
              <div className="absolute inset-0 border border-neutral-800/40 rounded-full" />
              <svg viewBox="0 0 180 180" className="w-full h-full">
                <line x1="0" y1="90" x2="180" y2="90" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="90" y1="0" x2="90" y2="180" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3,3" />

                {/* Chromosome 22 Pair */}
                <g className="translate-y-2">
                  {/* Chromosome A */}
                  <g transform="translate(60, 45)">
                    <path d="M0,0 C0,30 15,30 10,0 C10,-20 0,-20 0,0" fill="#374151" stroke="#4b5563" strokeWidth="1" />
                    <circle cx="5" cy="15" r="4" fill="#374151" />
                    {showFishProbe && (
                      <circle cx="5" cy="-8" r="3" fill="#10b981" className="shadow-[0_0_8px_2px_rgba(16,185,129,1)]" />
                    )}
                    {showFishProbe && (
                      <circle cx="5" cy="15" r="3" fill="#ef4444" className="shadow-[0_0_8px_2px_rgba(239,68,68,1)]" />
                    )}
                  </g>

                  {/* Chromosome B */}
                  <g transform="translate(110, 45)">
                    <path d="M0,0 C0,30 15,30 10,0 C10,-20 0,-20 0,0" fill="#374151" stroke="#4b5563" strokeWidth="1" />
                    <circle cx="5" cy="15" r="4" fill="#374151" />
                    {showFishProbe && (
                      <circle cx="5" cy="15" r="3" fill="#ef4444" className="shadow-[0_0_8px_2px_rgba(239,68,68,1)]" />
                    )}
                    {/* DiGeorge deletes 22q11 probe location (no green signal) */}
                    {showFishProbe && fishPatient === 'normal' && (
                      <circle cx="5" cy="-8" r="3" fill="#10b981" className="shadow-[0_0_8px_2px_rgba(16,185,129,1)]" />
                    )}
                  </g>
                </g>
              </svg>
            </div>
            
            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-2">
              {showFishProbe ? 'Fluorescent Signal Enabled' : 'Probes unhybridized'}
            </p>
          </div>

          {/* FISH Analysis */}
          <div className="w-full md:w-1/2 flex flex-col justify-center min-h-[180px] space-y-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">FISH Hybridization Probe</span>
            
            <div className="bg-neutral-50 rounded-2xl border-2 border-neutral-200 p-3 text-[10px] text-neutral-600 space-y-1">
              <p>🟢 <strong>Green Probe</strong>: Target 22q11.2 (DiGeorge region)</p>
              <p>🔴 <strong>Red Probe</strong>: Control probe (Chromosome 22 centromere)</p>
            </div>

            {!showFishProbe ? (
              <div className="text-center p-3 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 text-neutral-400 text-xs italic">
                Apply fluorescent hybridization probes to view cytogenetic markers.
              </div>
            ) : fishPatient === 'normal' ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-center space-y-2 animate-fade-in">
                <span className="text-xs font-bold text-emerald-800 uppercase block">Normal Karyotype Detected</span>
                <p className="text-[10px] text-emerald-600 leading-relaxed font-medium">
                  Two red signals (centromeres) and two green signals (22q11.2). Both copies of chromosome 22 are intact.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-center space-y-2 animate-fade-in">
                <span className="text-xs font-bold text-red-800 uppercase block">Microdeletion Detected!</span>
                <p className="text-[10px] text-red-600 leading-relaxed font-medium">
                  Two red signals (centromeres) but **only one green signal** (22q11.2). Confirms **22q11.2 microdeletion** (DiGeorge).
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar Controls ──────────────────────────────────────────────────────

export function DiagnosticLabControls({
  mode,
  setMode,
  target,
  setTarget,
  probe,
  setProbe,
  setGelProgress,
  setGelRunning,
  flowPatient,
  setFlowPatient,
  setSelectedGate,
  fishPatient,
  setFishPatient,
  showFishProbe,
  setShowFishProbe,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Sub-mode selector */}
      <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest font-['Fredoka']">Diagnostic Mode</h3>
      <div className="grid grid-cols-3 gap-1">
        {(
          [
            { tab: 'blot', label: 'Blotting' },
            { tab: 'flow', label: 'Flow Cyt.' },
            { tab: 'fish', label: 'FISH' },
          ] as { tab: DiagnosticMode; label: string }[]
        ).map(({ tab, label }) => (
          <button
            key={tab}
            onClick={() => setMode(tab)}
            className={`text-center text-[10px] py-2 rounded-lg border font-bold transition-all ${
              mode === tab
                ? 'bg-white border-neutral-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                : 'border-neutral-200 hover:bg-white/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="border-t border-neutral-300 pt-3 mt-2 space-y-3">
        {/* Blotting controls */}
        {mode === 'blot' && (
          <>
            <div>
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Target Molecule</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { val: 'dna', l: 'DNA' },
                    { val: 'rna', l: 'RNA' },
                    { val: 'protein', l: 'Protein' },
                    { val: 'db-protein', l: 'TF (DNA Bind)' },
                  ] as { val: TargetMolecule; l: string }[]
                ).map(({ val, l }) => (
                  <button
                    key={val}
                    onClick={() => {
                      setTarget(val);
                      setGelProgress(0);
                      setGelRunning(false);
                    }}
                    className={`text-[9px] py-1.5 rounded-md border font-semibold ${
                      target === val ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'border-neutral-200 hover:bg-white/30'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Probe Type</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { val: 'dna-probe', l: 'DNA Probe' },
                    { val: 'rna-probe', l: 'RNA Probe' },
                    { val: 'antibody', l: 'Antibody' },
                    { val: 'dsdna-probe', l: 'dsDNA Probe' },
                  ] as { val: ProbeType; l: string }[]
                ).map(({ val, l }) => (
                  <button
                    key={val}
                    onClick={() => {
                      setProbe(val);
                      setGelProgress(0);
                      setGelRunning(false);
                    }}
                    className={`text-[9px] py-1.5 rounded-md border font-semibold ${
                      probe === val ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'border-neutral-200 hover:bg-white/30'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Flow cytometry controls */}
        {mode === 'flow' && (
          <>
            <div>
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Patient Diagnosis</span>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setFlowPatient('normal');
                    setSelectedGate('lymphocytes');
                  }}
                  className={`text-left text-[10px] px-3 py-2 rounded-xl border transition-all ${
                    flowPatient === 'normal' ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold' : 'border-neutral-200 hover:bg-white/30'
                  }`}
                >
                  Healthy Control Patient
                </button>
                <button
                  onClick={() => {
                    setFlowPatient('hiv');
                    setSelectedGate('lymphocytes');
                  }}
                  className={`text-left text-[10px] px-3 py-2 rounded-xl border transition-all ${
                    flowPatient === 'hiv' ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold' : 'border-neutral-200 hover:bg-white/30'
                  }`}
                >
                  HIV / AIDS Patient (CD4 Deficient)
                </button>
              </div>
            </div>
          </>
        )}

        {/* FISH controls */}
        {mode === 'fish' && (
          <>
            <div>
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Select Patient</span>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setFishPatient('normal')}
                  className={`text-left text-[10px] px-3 py-2 rounded-xl border transition-all ${
                    fishPatient === 'normal' ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold' : 'border-neutral-200 hover:bg-white/30'
                  }`}
                >
                  Normal Karyotype
                </button>
                <button
                  onClick={() => setFishPatient('digeorge')}
                  className={`text-left text-[10px] px-3 py-2 rounded-xl border transition-all ${
                    fishPatient === 'digeorge' ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold' : 'border-neutral-200 hover:bg-white/30'
                  }`}
                >
                  DiGeorge Syndrome Patient
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-white border-2 border-neutral-200 rounded-xl mt-2">
              <span className="text-[10px] font-bold text-neutral-700">Apply Hybridization Probes</span>
              <button
                onClick={() => setShowFishProbe(!showFishProbe)}
                className={`px-3 py-1 rounded-lg border-2 border-neutral-800 font-bold text-[9px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                  showFishProbe ? 'bg-emerald-500 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {showFishProbe ? 'ON' : 'OFF'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Bottom Metadata ───────────────────────────────────────────────────────

export function DiagnosticLabMeta({
  mode,
  target,
  probe,
  flowPatient,
  selectedGate,
  fishPatient,
  showFishProbe,
}: {
  mode: DiagnosticMode;
  target: TargetMolecule;
  probe: ProbeType;
  flowPatient: FlowPatient;
  selectedGate: 'none' | 'lymphocytes' | 'granulocytes';
  fishPatient: FishPatient;
  showFishProbe: boolean;
}) {
  return (
    <>
      <div>
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">
          Method
        </span>
        <span className="text-sm font-bold text-neutral-800">
          {mode === 'blot'
            ? 'Molecular Blotting (S-N-O-W)'
            : mode === 'flow'
            ? 'Flow Cytometry scatter'
            : 'FISH (Fluorescent Hybridization)'}
        </span>
      </div>
      <div className="text-left md:text-right">
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">
          Diagnostic Clue
        </span>
        <span className="text-xs font-bold text-violet-700 block">
          {mode === 'blot' && 'Southern = DNA, Northern = RNA, Western = Protein, Southwestern = Transcription Factor'}
          {mode === 'flow' && selectedGate === 'lymphocytes' && flowPatient === 'hiv' && 'AIDS patient shows CD4:CD8 ratio < 0.5:1'}
          {mode === 'flow' && 'FSC measures cell size; SSC measures cell granularity/complexity'}
          {mode === 'fish' && showFishProbe && fishPatient === 'digeorge' && 'Deletion: Loss of green fluorescence at locus 22q11.2'}
          {mode === 'fish' && 'FISH detects deletions, translocations, or duplications'}
        </span>
      </div>
    </>
  );
}
