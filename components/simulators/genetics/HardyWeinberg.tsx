'use client';

interface Props {
  qValue: number;
  setQValue: (v: number) => void;
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function HardyWeinbergPanel({ qValue }: { qValue: number }) {
  const pValue = 1 - qValue;
  const p2 = pValue * pValue;
  const twoPQ = 2 * pValue * qValue;
  const q2 = qValue * qValue;

  return (
    <div className="w-full flex flex-col items-center space-y-6">
      <div className="w-full max-w-2xl bg-white border-3 border-neutral-800 p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Proportional Area Punnett Square */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 font-['Fredoka']">Proportional Area Punnett Square</span>
          <div className="w-48 h-48 border-3 border-neutral-850 relative bg-neutral-50" style={{ border: '3px solid rgb(38,38,38)' }}>
            <div className="absolute left-0 top-0 bg-emerald-100 border-r-2 border-b-2 border-neutral-800 flex items-center justify-center font-bold text-xs"
              style={{ width: `${pValue * 100}%`, height: `${pValue * 100}%`, borderRight: '2px solid rgb(38,38,38)', borderBottom: '2px solid rgb(38,38,38)' }}>
              {pValue > 0.25 && <span>p² (AA)</span>}
            </div>
            <div className="absolute top-0 bg-amber-100 border-b-2 border-neutral-850 flex items-center justify-center font-bold text-[10px]"
              style={{ left: `${pValue * 100}%`, width: `${qValue * 100}%`, height: `${pValue * 100}%`, borderBottom: '2px solid rgb(38,38,38)' }}>
              {pValue > 0.2 && qValue > 0.08 && <span>pq (Aa)</span>}
            </div>
            <div className="absolute left-0 bg-amber-100 border-r-2 border-neutral-850 flex items-center justify-center font-bold text-[10px]"
              style={{ top: `${pValue * 100}%`, width: `${pValue * 100}%`, height: `${qValue * 100}%`, borderRight: '2px solid rgb(38,38,38)' }}>
              {pValue > 0.2 && qValue > 0.08 && <span>pq (Aa)</span>}
            </div>
            <div className="absolute bg-red-400 flex items-center justify-center font-bold text-[8px] text-red-950"
              style={{ left: `${pValue * 100}%`, top: `${pValue * 100}%`, width: `${qValue * 100}%`, height: `${qValue * 100}%` }}>
              {qValue > 0.1 && <span>q²</span>}
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-[10px] font-bold text-neutral-500">
            <span>p (A) = {pValue.toFixed(2)}</span>
            <span>q (a) = {qValue.toFixed(2)}</span>
          </div>
        </div>

        {/* Population dot grid */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 font-['Fredoka']">Population distribution (n=100)</span>
          <div className="grid grid-cols-10 gap-1 p-2 bg-neutral-50 border-2 border-neutral-300 rounded-xl">
            {Array.from({ length: 100 }).map((_, idx) => {
              const p2Count = Math.round(p2 * 100);
              const carrierCount = Math.round(twoPQ * 100);
              let dotColor = 'bg-emerald-300';
              if (idx >= p2Count && idx < p2Count + carrierCount) dotColor = 'bg-amber-300';
              else if (idx >= p2Count + carrierCount) dotColor = 'bg-red-500 animate-pulse';
              return <div key={idx} className={`w-3.5 h-3.5 rounded-full border border-neutral-700 ${dotColor}`} />;
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[9px] font-bold tracking-wider text-neutral-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-300 rounded-full border border-neutral-600" /> AA: {Math.round(p2 * 100)}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-300 rounded-full border border-neutral-600" /> Aa: {Math.round(twoPQ * 100)}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-full border border-neutral-600" /> aa: {Math.round(q2 * 100)}</span>
          </div>
        </div>
      </div>

      {/* Equation summary */}
      <div className="w-full max-w-xl text-xs font-semibold text-neutral-600 bg-[#E5F1FF] border-2 border-neutral-800 p-4 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <h5 className="font-bold text-neutral-850 uppercase tracking-wider mb-2 font-['Fredoka'] text-center">Calculated Probabilities</h5>
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] md:text-xs">
          <div className="bg-white border border-neutral-300 p-2 rounded-lg">
            <span className="block font-bold text-emerald-800">Normal (p²)</span>
            <span className="text-sm font-black text-neutral-800">{(p2 * 100).toFixed(2)}%</span>
          </div>
          <div className="bg-white border border-neutral-300 p-2 rounded-lg">
            <span className="block font-bold text-amber-800">Carriers (2pq)</span>
            <span className="text-sm font-black text-neutral-850">{(twoPQ * 100).toFixed(2)}%</span>
          </div>
          <div className="bg-white border border-neutral-300 p-2 rounded-lg">
            <span className="block font-bold text-red-800">Diseased (q²)</span>
            <span className="text-sm font-black text-neutral-800">{(q2 * 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Controls ──────────────────────────────────────────────────────

export function HardyWeinbergControls({ qValue, setQValue }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest font-['Fredoka']">Population Parameters</h3>
      <div className="space-y-2">
        <label className="text-xs font-bold text-neutral-600 flex justify-between">
          <span>Mutant Allele Freq (q):</span>
          <span className="text-indigo-600 font-black">{qValue.toFixed(2)}</span>
        </label>
        <input
          type="range" min="0.01" max="0.50" step="0.01" value={qValue}
          onChange={(e) => setQValue(Number(e.target.value))}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <span className="text-[10px] text-neutral-400 block leading-tight">Adjust the recessive allele frequency (q) in the population pool.</span>
      </div>
      <div className="border-t border-neutral-350 pt-3 mt-3 space-y-2 text-[10px] text-neutral-500">
        <h4 className="text-xs font-bold text-neutral-750 font-['Fredoka']">Key H-W insights:</h4>
        <ul className="space-y-1.5 list-disc pl-4 leading-relaxed">
          <li>When q is small, 2pq (carriers) is much larger than q² (diseased).</li>
          <li>At q = 0.05 (5%), 9.5% of the population are carriers, but only 0.25% have the disease!</li>
          <li>This math explains why rare autosomal recessive diseases persist in the population.</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Bottom Metadata ───────────────────────────────────────────────────────

export function HardyWeinbergMeta({ qValue }: { qValue: number }) {
  const pValue = 1 - qValue;
  const p2 = pValue * pValue;
  const twoPQ = 2 * pValue * qValue;
  const q2 = qValue * qValue;
  return (
    <>
      <div>
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Allele Frequencies</span>
        <span className="text-sm font-bold text-neutral-800">p (A) = {pValue.toFixed(2)} | q (a) = {qValue.toFixed(2)}</span>
      </div>
      <div className="text-left md:text-right">
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Equation Balance</span>
        <span className="text-xs font-bold text-neutral-700 block">
          p² ({(p2 * 100).toFixed(0)}%) + 2pq ({(twoPQ * 100).toFixed(0)}%) + q² ({(q2 * 100).toFixed(0)}%) = 100%
        </span>
      </div>
    </>
  );
}
