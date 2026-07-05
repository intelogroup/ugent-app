'use client';

import { useState } from 'react';

export type CancerMode = 'oncogene' | 'sporadic-ts' | 'hereditary-ts';

interface Props {
  mode: CancerMode;
  setMode: (m: CancerMode) => void;
  mutatedCount: number; // 0, 1, 2
  setMutatedCount: React.Dispatch<React.SetStateAction<number>>;
  cellState: 'normal' | 'carrier' | 'cancerous';
  setCellState: React.Dispatch<React.SetStateAction<'normal' | 'carrier' | 'cancerous'>>;
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function CancerGeneticsPanel({
  mode,
  mutatedCount,
  setMutatedCount,
  cellState,
  setCellState,
}: Omit<Props, 'setMode'>) {
  
  // Trigger mutation
  const handleMutate = () => {
    if (mode === 'oncogene') {
      setMutatedCount(1);
      setCellState('cancerous');
    } else if (mode === 'sporadic-ts') {
      if (mutatedCount === 0) {
        setMutatedCount(1);
        setCellState('carrier');
      } else if (mutatedCount === 1) {
        setMutatedCount(2);
        setCellState('cancerous');
      }
    } else if (mode === 'hereditary-ts') {
      if (mutatedCount === 1) {
        setMutatedCount(2);
        setCellState('cancerous');
      }
    }
  };

  // Reset mutations
  const handleReset = () => {
    if (mode === 'hereditary-ts') {
      setMutatedCount(1);
      setCellState('carrier');
    } else {
      setMutatedCount(0);
      setCellState('normal');
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* Title */}
      <div className="text-center">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-['Fredoka']">
          {mode === 'oncogene'
            ? 'Oncogene Activation (Gain of Function)'
            : mode === 'sporadic-ts'
            ? 'Sporadic Tumor Suppressor Deactivation (2-Hit)'
            : 'Hereditary Tumor Suppressor Deactivation (Germline + 1-Hit)'}
        </span>
      </div>

      {/* Interactive Notebook Plate */}
      <div className="w-full max-w-2xl bg-white border-3 border-neutral-800 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-5 flex flex-col md:flex-row items-center gap-6">
        
        {/* LEFT: Cell and DNA Visualization */}
        <div className="w-full md:w-1/2 flex flex-col items-center border-r-0 md:border-r-2 md:border-dashed md:border-neutral-300 pr-0 md:pr-6">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
            Cellular View
          </span>

          {/* Cell SVG Screen */}
          <div className="relative w-[180px] h-[180px] bg-[#FAF8F2] border-3 border-neutral-800 rounded-2xl flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Proliferation background if cancerous */}
              {cellState === 'cancerous' && (
                <g className="animate-pulse opacity-40">
                  <circle cx="22" cy="20" r="8" fill="#f87171" stroke="#dc2626" strokeWidth="0.8" />
                  <circle cx="78" cy="22" r="9" fill="#f87171" stroke="#dc2626" strokeWidth="0.8" />
                  <circle cx="16" cy="45" r="7" fill="#f87171" stroke="#dc2626" strokeWidth="0.8" />
                  <circle cx="84" cy="43" r="8" fill="#f87171" stroke="#dc2626" strokeWidth="0.8" />
                </g>
              )}

              {/* Main Cell Membrane */}
              <circle
                cx="50"
                cy="40"
                r="26"
                fill={cellState === 'cancerous' ? '#fee2e2' : cellState === 'carrier' ? '#fef3c7' : '#ecfdf5'}
                stroke={cellState === 'cancerous' ? '#ef4444' : '#1f2937'}
                strokeWidth="2.5"
                className="transition-colors duration-500"
              />

              {/* Nucleus */}
              <circle
                cx="50"
                cy="40"
                r="15"
                fill="none"
                stroke="#4b5563"
                strokeWidth="1.2"
                strokeDasharray="2,2"
              />

              {/* Allele A (Left) */}
              <g transform="translate(43, 30)">
                <rect
                  x="0"
                  y="0"
                  width="5"
                  height="18"
                  rx="1.5"
                  fill={
                    mode === 'oncogene' && mutatedCount >= 1
                      ? '#10b981' // Green gain-of-function
                      : (mode === 'sporadic-ts' || mode === 'hereditary-ts') && mutatedCount >= 1
                      ? '#ef4444' // Red loss-of-function
                      : '#9ca3af' // Grey normal
                  }
                  stroke="#1f2937"
                  strokeWidth="1.2"
                  className="transition-colors duration-500"
                />
                <text x="2.5" y="10.5" fontSize="4.5" fontWeight="bold" fill="white" textAnchor="middle" className="font-sans">
                  {mode === 'oncogene' ? 'RET' : 'Rb'}
                </text>
              </g>

              {/* Allele B (Right) */}
              <g transform="translate(52, 30)">
                <rect
                  x="0"
                  y="0"
                  width="5"
                  height="18"
                  rx="1.5"
                  fill={
                    (mode === 'sporadic-ts' || mode === 'hereditary-ts') && mutatedCount >= 2
                      ? '#ef4444' // Red loss-of-function
                      : '#9ca3af' // Grey normal
                  }
                  stroke="#1f2937"
                  strokeWidth="1.2"
                  className="transition-colors duration-500"
                />
                <text x="2.5" y="10.5" fontSize="4.5" fontWeight="bold" fill="white" textAnchor="middle" className="font-sans">
                  {mode === 'oncogene' ? 'RET' : 'Rb'}
                </text>
              </g>

              {/* Dashboard */}
              <g transform="translate(8, 70)">
                {/* Border / Panel */}
                <rect
                  x="0"
                  y="0"
                  width="84"
                  height="26"
                  rx="3"
                  fill="#ffffff"
                  stroke="#1f2937"
                  strokeWidth="1.2"
                />

                {/* Left Side: Cell Cycle Speedometer */}
                <g transform="translate(4, 2)">
                  <text x="18" y="5" fontSize="2.8" fontWeight="black" fill="#4b5563" textAnchor="middle" className="font-sans tracking-wide">
                    CELL DIVISION RATE
                  </text>
                  {/* Gauge Arc */}
                  <path
                    d="M 6 18 A 12 12 0 0 1 30 18"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Color Arc slice for high rate */}
                  {cellState === 'cancerous' && (
                    <path
                      d="M 18 6 A 12 12 0 0 1 30 18"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}
                  {/* Needle */}
                  <line
                    x1="18"
                    y1="18"
                    x2="18"
                    y2="8"
                    stroke={cellState === 'cancerous' ? '#ef4444' : '#10b981'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    transform={`rotate(${cellState === 'cancerous' ? 60 : cellState === 'carrier' ? -30 : -60}, 18, 18)`}
                    className="transition-transform duration-700"
                  />
                  <circle cx="18" cy="18" r="1.5" fill="#1f2937" />
                  
                  {/* Speed text */}
                  <text x="18" y="23.5" fontSize="3.2" fontWeight="bold" fill={cellState === 'cancerous' ? '#dc2626' : '#16a34a'} textAnchor="middle">
                    {cellState === 'cancerous' ? 'UNCONTROLLED' : 'NORMAL (1x)'}
                  </text>
                </g>

                {/* Divider Line */}
                <line x1="42" y1="2" x2="42" y2="24" stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="2,2" />

                {/* Right Side: Mechanism Indicators */}
                <g transform="translate(45, 2)">
                  {mode === 'oncogene' ? (
                    <>
                      <text x="18" y="5" fontSize="2.8" fontWeight="black" fill="#4b5563" textAnchor="middle" className="font-sans tracking-wide">
                        ONCOGENE ACCELERATOR
                      </text>
                      {/* Gas Pedal Indicator */}
                      <rect
                        x="6"
                        y="8.5"
                        width="24"
                        height="8"
                        rx="1.5"
                        fill={mutatedCount >= 1 ? '#fee2e2' : '#f3f4f6'}
                        stroke={mutatedCount >= 1 ? '#ef4444' : '#9ca3af'}
                        strokeWidth="1"
                      />
                      <text
                        x="18"
                        y="14.5"
                        fontSize="3.2"
                        fontWeight="black"
                        fill={mutatedCount >= 1 ? '#dc2626' : '#6b7280'}
                        textAnchor="middle"
                      >
                        {mutatedCount >= 1 ? 'STUCK ON!' : 'NORMAL (IDLE)'}
                      </text>
                      <text x="18" y="22" fontSize="2.5" fill="#9ca3af" textAnchor="middle">
                        1 mutated allele activates
                      </text>
                    </>
                  ) : (
                    <>
                      <text x="18" y="5" fontSize="2.8" fontWeight="black" fill="#4b5563" textAnchor="middle" className="font-sans tracking-wide">
                        TUMOR SUPPRESSOR BRAKES
                      </text>
                      {/* Two Brake pedal boxes */}
                      <g transform="translate(2.5, 8.5)">
                        {/* Brake 1 */}
                        <rect
                          x="0"
                          y="0"
                          width="14"
                          height="7.5"
                          rx="1"
                          fill={mutatedCount >= 1 ? '#fee2e2' : '#dcfce7'}
                          stroke={mutatedCount >= 1 ? '#ef4444' : '#10b981'}
                          strokeWidth="0.8"
                        />
                        <text x="7" y="5.5" fontSize="2.5" fontWeight="bold" fill={mutatedCount >= 1 ? '#ef4444' : '#15803d'} textAnchor="middle">
                          {mutatedCount >= 1 ? 'HIT 1 ❌' : 'BRAKE 1'}
                        </text>

                        {/* Brake 2 */}
                        <rect
                          x="17"
                          y="0"
                          width="14"
                          height="7.5"
                          rx="1"
                          fill={mutatedCount >= 2 ? '#fee2e2' : '#dcfce7'}
                          stroke={mutatedCount >= 2 ? '#ef4444' : '#10b981'}
                          strokeWidth="0.8"
                        />
                        <text x="24" y="5.5" fontSize="2.5" fontWeight="bold" fill={mutatedCount >= 2 ? '#ef4444' : '#15803d'} textAnchor="middle">
                          {mutatedCount >= 2 ? 'HIT 2 ❌' : 'BRAKE 2'}
                        </text>
                      </g>
                      
                      <text x="18" y="22" fontSize="2.5" fill={mutatedCount === 2 ? '#ef4444' : '#9ca3af'} fontWeight={mutatedCount === 2 ? 'bold' : 'normal'} textAnchor="middle">
                        {mutatedCount === 0 ? 'Brakes fully functional' : mutatedCount === 1 ? '1 hit: 1 brake remains' : 'Brakes failed (LOH)'}
                      </text>
                    </>
                  )}
                </g>
              </g>
            </svg>

            {/* Cancer Overlay Badge */}
            {cellState === 'cancerous' && (
              <span className="absolute top-2.5 left-2.5 bg-red-600 border-2 border-neutral-800 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider animate-bounce">
                Oncogenesis!
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleMutate}
              disabled={cellState === 'cancerous'}
              className="px-3 py-1.5 rounded-xl border-2 border-neutral-800 bg-red-500 hover:bg-red-600 text-white font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all"
            >
              {mode === 'oncogene'
                ? 'Mutate Oncogene (1st hit)'
                : mode === 'sporadic-ts' && mutatedCount === 0
                ? 'Mutate Allele 1 (1st hit)'
                : mode === 'sporadic-ts' && mutatedCount === 1
                ? 'Mutate Allele 2 (2nd hit)'
                : 'Mutate Allele 2 (2nd hit)'}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border-2 border-neutral-800 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* RIGHT: Molecular & Pathological Description */}
        <div className="w-full md:w-1/2 flex flex-col justify-center min-h-[200px] space-y-3">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            Mutation Analysis
          </span>

          <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-3 text-[10px] text-neutral-600 space-y-2">
            {mode === 'oncogene' && (
              <>
                <p><strong>• Gene Class</strong>: Proto-oncogene (promotes cell division).</p>
                <p><strong>• Cellular Level</strong>: Dominant. A single "gain-of-function" mutation activates the protein constitutively.</p>
                <p><strong>• Visual Effect</strong>: Mutating one RET allele immediately pushes the cell into uncontrolled division.</p>
              </>
            )}
            {mode === 'sporadic-ts' && (
              <>
                <p><strong>• Gene Class</strong>: Tumor Suppressor (acts as brakes on the cell cycle).</p>
                <p><strong>• Cellular Level</strong>: Recessive. Both alleles must be lost before brakes fail (Knudson 2-Hit).</p>
                <p><strong>• Visual Effect</strong>: The first hit makes the cell a carrier. Brakes remain active. The second hit triggers cancer.</p>
              </>
            )}
            {mode === 'hereditary-ts' && (
              <>
                <p><strong>• Gene Class</strong>: Tumor Suppressor (inherited predisposition).</p>
                <p><strong>• Cellular Level</strong>: Recessive, but displays dominant inheritance due to high likelihood of somatic second hit.</p>
                <p><strong>• Visual Effect</strong>: The cell starts with 1 inherited hit in all cells. A single subsequent somatic hit triggers cancer.</p>
              </>
            )}
          </div>

          {/* Clinical Alert Card */}
          <div className={`p-3 rounded-xl border-2 transition-all ${
            cellState === 'cancerous'
              ? 'bg-red-50 border-red-300 text-red-800'
              : cellState === 'carrier'
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          } text-[10px] leading-relaxed font-semibold`}>
            {cellState === 'normal' && (
              <p>🟢 Cell is normal. Regulation checkpoint intact. Cell cycle breaks function perfectly.</p>
            )}
            {cellState === 'carrier' && (
              <p>
                ⚠️ Carrier State: One allele mutated/methylated. No cancer phenotype yet. The cell remains healthy but lacks redundancy.
              </p>
            )}
            {cellState === 'cancerous' && (
              <p>
                🚨 Oncogenesis:
                {mode === 'oncogene'
                  ? ' Constant accelerator signal overrides regulatory checks. Fast proliferation.'
                  : ' Brakes failed completely. Loss of Heterozygosity (LOH) is complete.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Controls ──────────────────────────────────────────────────────

export function CancerGeneticsControls({
  mode,
  setMode,
  setMutatedCount,
  setCellState,
}: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest font-['Fredoka']">
        Cancer Genetics
      </h3>
      <div className="flex flex-col gap-2">
        {(
          [
            { mode: 'oncogene', label: 'Oncogene Activation' },
            { mode: 'sporadic-ts', label: 'Sporadic 2-Hit TS' },
            { mode: 'hereditary-ts', label: 'Hereditary 2-Hit TS' },
          ] as { mode: CancerMode; label: string }[]
        ).map(({ mode: m, label }) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              if (m === 'hereditary-ts') {
                setMutatedCount(1);
                setCellState('carrier');
              } else {
                setMutatedCount(0);
                setCellState('normal');
              }
            }}
            className={`w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all ${
              mode === m
                ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold'
                : 'border-neutral-200 hover:bg-white/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="border-t border-neutral-300 pt-3 mt-2 space-y-2 text-[10px] text-neutral-500 leading-relaxed">
        {mode === 'oncogene' && (
          <>
            <p className="font-bold text-emerald-700 text-xs">Oncogenes</p>
            <p>
              Proto-oncogenes promote growth. A gain-of-function mutation in a single allele is sufficient to drive cancer.
            </p>
            <p className="font-semibold text-neutral-600">
              Key board examples: RET (MEN2), c-MYC (Burkitt), RAS (pancreatic/colon), ERBB2 (HER2).
            </p>
          </>
        )}
        {mode === 'sporadic-ts' && (
          <>
            <p className="font-bold text-red-600 text-xs">Sporadic Tumor Suppressors</p>
            <p>
              Requires two somatic mutation events in the same cell lineage. Occurs late in life and is typically unilateral/unifocal.
            </p>
            <p className="font-semibold text-neutral-600">
              Key board examples: Sporadic retinoblastoma (Rb), sporadic colorectal cancer (APC).
            </p>
          </>
        )}
        {mode === 'hereditary-ts' && (
          <>
            <p className="font-bold text-violet-700 text-xs">Hereditary Tumor Suppressors</p>
            <p>
              First hit is inherited germline (found in every cell). Cell only requires a single subsequent somatic hit in any cell to trigger cancer.
            </p>
            <p className="font-semibold text-neutral-600">
              Key board examples: Li-Fraumeni (TP53), Familial Retinoblastoma (Rb), FAP (APC), VHL.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Bottom Metadata ───────────────────────────────────────────────────────

export function CancerGeneticsMeta({
  mode,
  cellState,
}: {
  mode: CancerMode;
  cellState: 'normal' | 'carrier' | 'cancerous';
}) {
  return (
    <>
      <div>
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">
          Cancer Model
        </span>
        <span className="text-sm font-bold text-neutral-800">
          {mode === 'oncogene'
            ? 'Oncogene (RET/RAS)'
            : mode === 'sporadic-ts'
            ? 'Sporadic TS (Rb/p53)'
            : 'Hereditary TS (Li-Fraumeni)'}
        </span>
      </div>
      <div className="text-left md:text-right">
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">
          Cell Cycle Checkpoint Status
        </span>
        <span className="text-xs font-bold text-violet-700 block">
          {cellState === 'normal' && 'Checkpoint intact — Normal growth'}
          {cellState === 'carrier' && 'Loss of 1 allele — Checkpoint active (unaffected carrier)'}
          {cellState === 'cancerous' && 'Checkpoint failed — Loss of heterozygosity / Oncogenesis'}
        </span>
      </div>
    </>
  );
}
