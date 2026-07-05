'use client';

interface Props {
  penetrance: number;
  setPenetrance: (v: number) => void;
  expressivity: number;
  setExpressivity: (v: number) => void;
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function PenetranceGridPanel({ penetrance, expressivity }: Omit<Props, 'setPenetrance' | 'setExpressivity'>) {
  return (
    <div className="w-full flex flex-col items-center space-y-6">
      <div className="w-full max-w-2xl bg-white border-3 border-neutral-800 p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
        <h4 className="text-sm font-extrabold text-neutral-700 uppercase tracking-wider mb-6 font-['Fredoka'] text-center">
          Clinical Cohort (10 Patients with Genotype)
        </h4>
        <div className="grid grid-cols-5 gap-4 justify-items-center">
          {Array.from({ length: 10 }).map((_, idx) => {
            const threshold = (idx + 1) * 10;
            const manifests = penetrance >= threshold;
            let faceEmoji = '😊';
            let severityColor = 'bg-neutral-100 border-neutral-300 text-neutral-400';
            if (manifests) {
              faceEmoji = expressivity === 1 ? '😐' : expressivity === 2 ? '🤒' : '🤮';
              severityColor =
                expressivity === 1
                  ? 'bg-amber-100 border-amber-500 text-amber-900'
                  : expressivity === 2
                  ? 'bg-rose-200 border-rose-600 text-rose-950'
                  : 'bg-red-400 border-red-800 text-red-950 font-black';
            }
            return (
              <div
                key={idx}
                className={`w-20 py-3 rounded-xl border-3 flex flex-col items-center justify-center transition-all duration-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] ${severityColor} ${manifests && 'rotate-[1deg] hover:scale-105'}`}
              >
                <span className="text-2xl mb-1">{manifests ? faceEmoji : '😊'}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide">Pt {idx + 1}</span>
                <span className="text-[8px] font-semibold">
                  {manifests ? (expressivity === 1 ? 'Mild' : expressivity === 2 ? 'Mod' : 'Severe') : 'Normal'}
                </span>
                {manifests && expressivity >= 2 && (
                  <div className="flex gap-0.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-700" />
                    <span className="w-1.5 h-1.5 rounded-full bg-red-700" />
                    {expressivity === 3 && <span className="w-1.5 h-1.5 rounded-full bg-red-700" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-xl text-xs font-semibold text-neutral-600 bg-amber-50/50 border-2 border-dashed border-neutral-300 p-4 rounded-xl">
        <div className="space-y-2">
          <h5 className="font-bold text-neutral-800 uppercase tracking-wider font-['Fredoka']">Dynamic Concept Visualization</h5>
          <p className="leading-relaxed">
            <strong>Penetrance</strong> is binary: does the individual show symptoms or not? (Adjust slider to see how many of the 10 patients are affected).
          </p>
          <p className="leading-relaxed">
            <strong>Expressivity</strong> is a spectrum: how severe are the symptoms in those who show them? (Adjust level to alter symptom presentations).
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Controls ──────────────────────────────────────────────────────

export function PenetranceGridControls({ penetrance, setPenetrance, expressivity, setExpressivity }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest font-['Fredoka']">Variable Parameters</h3>
      <div className="space-y-2">
        <label className="text-xs font-bold text-neutral-600 flex justify-between">
          <span>Penetrance Rate:</span>
          <span className="text-indigo-600">{penetrance}%</span>
        </label>
        <input
          type="range" min="0" max="100" step="10" value={penetrance}
          onChange={(e) => setPenetrance(Number(e.target.value))}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <span className="text-[10px] text-neutral-400 block leading-tight">Controls what percentage of the carrier cohort develops ANY symptoms.</span>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-neutral-600 block">Expressivity Severity:</label>
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              onClick={() => setExpressivity(level)}
              className={`text-xs py-2 rounded-xl border transition-all ${expressivity === level ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-neutral-200 hover:bg-white/30'}`}
            >
              {level === 1 ? 'Mild' : level === 2 ? 'Moderate' : 'Severe'}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-neutral-400 block leading-tight">Controls the severity of clinical symptoms amongst the affected cohort.</span>
      </div>
    </div>
  );
}

// ─── Bottom Metadata ───────────────────────────────────────────────────────

export function PenetranceGridMeta({ penetrance, expressivity }: Omit<Props, 'setPenetrance' | 'setExpressivity'>) {
  return (
    <div className="flex items-center gap-3 w-full justify-between">
      <div>
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Penetrance Rate</span>
        <span className="text-lg font-bold text-indigo-700">{penetrance}%</span>
      </div>
      <div className="text-right">
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Expressivity Level</span>
        <span className="text-lg font-bold text-rose-700">{expressivity === 1 ? 'Mild' : expressivity === 2 ? 'Moderate' : 'Severe'}</span>
      </div>
    </div>
  );
}
