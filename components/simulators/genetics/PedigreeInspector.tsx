'use client';

import { PedigreeType } from './types';

interface Props {
  pedigree: PedigreeType;
  setPedigree: (p: PedigreeType) => void;
}

function getPedigreeNodeColor(id: string, pedigree: PedigreeType): string {
  switch (pedigree) {
    case 'AD':
      if (['G1_M', 'G2_C1', 'G2_C3', 'G3_C2'].includes(id)) return 'fill-[#f87171] stroke-neutral-800';
      return 'fill-white stroke-neutral-800';
    case 'AR':
      if (id === 'G2_C1') return 'fill-[#f87171] stroke-neutral-800';
      if (['G1_M', 'G1_F', 'G2_C2'].includes(id)) return 'carrier';
      return 'fill-white stroke-neutral-800';
    case 'XLR':
      if (id === 'G2_C1') return 'fill-[#f87171] stroke-neutral-800';
      if (['G1_F', 'G2_C2'].includes(id)) return 'carrier';
      return 'fill-white stroke-neutral-800';
    case 'Mito':
      if (['G1_F', 'G2_C1', 'G2_C2', 'G2_C3'].includes(id)) return 'fill-[#f87171] stroke-neutral-800';
      return 'fill-white stroke-neutral-800';
  }
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function PedigreeInspectorPanel({ pedigree }: { pedigree: PedigreeType }) {
  const node = (id: string) => getPedigreeNodeColor(id, pedigree);

  const MaleNode = ({ id, x, y }: { id: string; x: number; y: number }) => {
    const color = node(id);
    return color === 'carrier' ? (
      <g transform={`translate(${x - 20}, ${y - 20})`}>
        <rect x="0" y="0" width="40" height="40" fill="white" stroke="#374151" strokeWidth="3" />
        <path d="M 0 0 L 20 0 L 20 40 L 0 40 Z" fill="#f87171" />
      </g>
    ) : (
      <rect x={x - 20} y={y - 20} width="40" height="40" className={color} strokeWidth="3" />
    );
  };

  const FemaleNode = ({ id, cx, cy }: { id: string; cx: number; cy: number }) => {
    const color = node(id);
    return color === 'carrier' ? (
      <g transform={`translate(${cx - 20}, ${cy - 20})`}>
        <circle cx="20" cy="20" r="20" fill="white" stroke="#374151" strokeWidth="3" />
        <path d="M 20 0 A 20 20 0 0 0 20 40 Z" fill="#f87171" />
      </g>
    ) : (
      <circle cx={cx} cy={cy} r="20" className={color} strokeWidth="3" />
    );
  };

  return (
    <div className="w-full flex flex-col items-center space-y-6">
      <svg viewBox="0 0 500 240" className="w-full max-w-xl h-auto select-none border-2 border-dashed border-neutral-300 bg-white/70 p-4 rounded-2xl">
        {/* Generation Labels */}
        <text x="20" y="45" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="Fredoka">I</text>
        <text x="20" y="125" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="Fredoka">II</text>
        <text x="20" y="205" fill="#94a3b8" fontSize="12" fontWeight="bold" fontFamily="Fredoka">III</text>

        {/* Connective lines */}
        <line x1="200" y1="40" x2="300" y2="40" stroke="#374151" strokeWidth="2.5" />
        <line x1="250" y1="40" x2="250" y2="80" stroke="#374151" strokeWidth="2.5" />
        <line x1="120" y1="80" x2="380" y2="80" stroke="#374151" strokeWidth="2.5" />
        <line x1="120" y1="80" x2="120" y2="100" stroke="#374151" strokeWidth="2.5" />
        <line x1="250" y1="80" x2="250" y2="100" stroke="#374151" strokeWidth="2.5" />
        <line x1="380" y1="80" x2="380" y2="100" stroke="#374151" strokeWidth="2.5" />
        <line x1="380" y1="120" x2="440" y2="120" stroke="#374151" strokeWidth="2.5" />
        <line x1="410" y1="120" x2="410" y2="160" stroke="#374151" strokeWidth="2.5" />
        <line x1="330" y1="160" x2="480" y2="160" stroke="#374151" strokeWidth="2.5" />
        <line x1="330" y1="160" x2="330" y2="180" stroke="#374151" strokeWidth="2.5" />
        <line x1="480" y1="160" x2="480" y2="180" stroke="#374151" strokeWidth="2.5" />

        {/* Gen 1 */}
        <MaleNode id="G1_M" x={200} y={40} />
        <FemaleNode id="G1_F" cx={300} cy={40} />
        {/* Gen 2 */}
        <MaleNode id="G2_C1" x={120} y={120} />
        <FemaleNode id="G2_C2" cx={250} cy={120} />
        <MaleNode id="G2_C3" x={380} y={120} />
        <FemaleNode id="G2_Spouse" cx={440} cy={120} />
        {/* Gen 3 */}
        <FemaleNode id="G3_C1" cx={330} cy={200} />
        <MaleNode id="G3_C2" x={480} y={200} />
      </svg>

      <div className="flex gap-6 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5" style={{ border: '2px solid rgb(38,38,38)' }} /> Male
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full" style={{ border: '2px solid rgb(38,38,38)' }} /> Female
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-[#f87171] border border-neutral-800" /> Affected
        </div>
        {(pedigree === 'AR' || pedigree === 'XLR') && (
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-gradient-to-r from-[#f87171] to-white border border-neutral-800" /> Carrier
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Controls ──────────────────────────────────────────────────────

export function PedigreeInspectorControls({ pedigree, setPedigree }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest font-['Fredoka']">Select Inheritance Pattern</h3>
      <div className="grid grid-cols-2 gap-2">
        {(['AD', 'AR', 'XLR', 'Mito'] as PedigreeType[]).map((type) => (
          <button
            key={type}
            onClick={() => setPedigree(type)}
            className={`text-xs py-2 rounded-xl border transition-all ${pedigree === type ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]' : 'border-neutral-200 hover:bg-white/30'}`}
          >
            {type === 'AD' && 'Autosomal Dom'}
            {type === 'AR' && 'Autosomal Rec'}
            {type === 'XLR' && 'X-Linked Rec'}
            {type === 'Mito' && 'Mitochondrial'}
          </button>
        ))}
      </div>
      <div className="border-t border-neutral-300 pt-3 mt-3 space-y-2">
        <h4 className="text-xs font-bold text-neutral-700 font-['Fredoka']">Board Exam Clues:</h4>
        <ul className="text-[11px] text-neutral-600 space-y-1.5 list-disc pl-4 leading-relaxed">
          {pedigree === 'AD' && (<><li>No skipped generations (vertical).</li><li>Both males and females transmit/inherit.</li><li>Male-to-male transmission confirms autosomal.</li></>)}
          {pedigree === 'AR' && (<><li>Skips generations (horizontal).</li><li>Look for consanguineous parents.</li><li>Healthy parents can have affected children.</li></>)}
          {pedigree === 'XLR' && (<><li>Significantly more affected males than females.</li><li>Never passes from father to son (no male-to-male).</li><li>Affected father passes carrier gene to all daughters.</li></>)}
          {pedigree === 'Mito' && (<><li>All children of affected mother are affected.</li><li>Affected father has ZERO affected children.</li><li>Variable expressivity is due to heteroplasmy.</li></>)}
        </ul>
      </div>
    </div>
  );
}

// ─── Bottom Metadata ───────────────────────────────────────────────────────

export function PedigreeInspectorMeta({ pedigree }: { pedigree: PedigreeType }) {
  return (
    <>
      <div>
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Inheritance Mode</span>
        <span className="text-sm font-bold text-neutral-800">
          {pedigree === 'AD' ? 'Autosomal Dominant' : pedigree === 'AR' ? 'Autosomal Recessive' : pedigree === 'XLR' ? 'X-Linked Recessive' : 'Mitochondrial'}
        </span>
      </div>
      <div className="text-left md:text-right">
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Core Pedigree Rule</span>
        <span className="text-xs font-bold text-emerald-700">
          {pedigree === 'AD' && 'Vertical transmission. Male-to-male transmission IS present.'}
          {pedigree === 'AR' && 'Horizontal transmission. Typically skips generations. Parents are carriers.'}
          {pedigree === 'XLR' && 'Predominantly affected males. NO male-to-male transmission.'}
          {pedigree === 'Mito' && 'Maternal inheritance. Affected male transmits to 0% of offspring.'}
        </span>
      </div>
    </>
  );
}
