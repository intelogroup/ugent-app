'use client';

import React, { useState, useEffect } from 'react';
import { PlayIcon, ArrowPathIcon, AcademicCapIcon, CpuChipIcon } from '@heroicons/react/24/outline';

type GpcrPathway = 'gs' | 'gi' | 'gq';

export default function GpcrSimulator() {
  const [pathway, setPathway] = useState<GpcrPathway>('gs');
  const [animationStep, setAnimationStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        setAnimationStep((prev) => {
          if (prev >= 3) { setIsPlaying(false); return 3; }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [animationStep, isPlaying]);

  const triggerCascade = () => { setAnimationStep(0); setIsPlaying(true); };
  const resetCascade   = () => { setIsPlaying(false); setAnimationStep(0); };

  const renderGpcrMembrane = (yPos: number, width: number) => {
    const lipids = [];
    const step = 16;
    for (let x = 10; x < width - 10; x += step) {
      if (x > 70 && x < 145) continue;
      lipids.push(
        <g key={x} filter="url(#hand-drawn-wiggle)">
          <circle cx={x} cy={yPos - 12} r="5" fill="#f87171" stroke="#374151" strokeWidth="1.5" />
          <path d={`M ${x - 2},${yPos - 7} Q ${x - 3},${yPos - 2} ${x - 1},${yPos + 2}`} fill="none" stroke="#374151" strokeWidth="1.5" />
          <path d={`M ${x + 2},${yPos - 7} Q ${x + 1},${yPos - 2} ${x + 3},${yPos + 2}`} fill="none" stroke="#374151" strokeWidth="1.5" />
          <circle cx={x} cy={yPos + 12} r="5" fill="#f87171" stroke="#374151" strokeWidth="1.5" />
          <path d={`M ${x - 2},${yPos + 7} Q ${x - 3},${yPos + 2} ${x - 1},${yPos - 2}`} fill="none" stroke="#374151" strokeWidth="1.5" />
          <path d={`M ${x + 2},${yPos + 7} Q ${x + 1},${yPos + 2} ${x + 3},${yPos - 2}`} fill="none" stroke="#374151" strokeWidth="1.5" />
        </g>
      );
    }
    return lipids;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-[#ECF5FF] border-4 border-neutral-800 rounded-[30px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[520px] shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-4 left-4 z-10">
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-900 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">Textbook Notebook: GPCR Signaling</span>
        </div>

        <div className="flex-grow flex items-center justify-center my-6 z-10">
          <svg viewBox="0 0 600 340" className="w-full max-w-2xl h-auto select-none" id="gpcr-svg-canvas">
            <style>{`
              @keyframes float-camp { 0% { transform: translate(0, 0); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(var(--mx), var(--my)); opacity: 0; } }
              @keyframes pulse-calcium { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.4); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
              .gpcr-camp { animation: float-camp 2.2s infinite ease-out; }
              .gpcr-calcium { animation: pulse-calcium 1.2s infinite ease-in-out; }
            `}</style>

            {renderGpcrMembrane(95, 600)}
            <text x="25" y="130" fill="#64748b" fontSize="8" fontWeight="900" letterSpacing="1.5" fontFamily="Fredoka">INTERCELLULAR BILAYER</text>

            {/* Ligand */}
            <g transform={animationStep >= 1 ? "translate(95, 52)" : "translate(95, 12)"} className="transition-all duration-1000" filter="url(#hand-drawn-wiggle)">
              <polygon points="12,0 24,7 24,21 12,28 0,21 0,7" fill="#fca5a5" stroke="#374151" strokeWidth="2" />
              <line x1="24" y1="14" x2="36" y2="14" stroke="#374151" strokeWidth="2" />
              <circle cx="36" cy="14" r="3" fill="#cbd5e1" stroke="#374151" strokeWidth="1.5" />
              <text x="12" y="17" fill="#b91c1c" fontSize="7" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">LIGAND</text>
            </g>

            {/* 7-TM GPCR */}
            <g transform="translate(80, 48)" filter="url(#hand-drawn-wiggle)">
              <path d="M 6,42 C 6,22 18,22 18,42" fill="none" stroke="#8535b0" strokeWidth="2.5" />
              <path d="M 30,42 C 30,22 42,22 42,42" fill="none" stroke="#8535b0" strokeWidth="2.5" />
              <path d="M 54,42 C 54,22 66,22 66,42" fill="none" stroke="#8535b0" strokeWidth="2.5" />
              <path d="M 18,92 C 18,112 30,112 30,92" fill="none" stroke="#8535b0" strokeWidth="2.5" />
              <path d="M 42,92 C 42,112 54,112 54,92" fill="none" stroke="#8535b0" strokeWidth="2.5" />
              <path d="M 66,92 C 66,112 78,112 78,92" fill="none" stroke="#8535b0" strokeWidth="2.5" />
              {[2,14,26,38,50,62,74].map(x => <rect key={x} x={x} y="38" width="8" height="58" rx="4" fill="url(#gpcr-cyl-gradient)" stroke="#374151" strokeWidth="1.5" />)}
              <rect x="14" y="52" width="56" height="24" rx="6" fill="#f3e8ff" stroke="#374151" strokeWidth="1.5" opacity="0.95" />
              <text x="42" y="67" fill="#6b21a8" fontSize="10" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">GPCR</text>
            </g>

            {/* Alpha subunit */}
            <g transform={animationStep === 0 ? "translate(135, 110)" : animationStep === 1 ? "translate(135, 110)" : pathway === 'gq' ? "translate(300, 110)" : "translate(240, 110)"} className="transition-all duration-1000" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="65" height="32" rx="10" fill={pathway === 'gs' ? '#bae6fd' : pathway === 'gi' ? '#e2e8f0' : '#ffedd5'} stroke="#374151" strokeWidth="2.5" />
              <text x="32" y="20" fill="#1e293b" fontSize="11" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">α{pathway === 'gs' ? 's' : pathway === 'gi' ? 'i' : 'q'}</text>
              <rect x="12" y="-12" width="40" height="12" rx="4" fill={animationStep >= 2 ? '#86efac' : '#cbd5e1'} stroke="#374151" strokeWidth="1.5" />
              <text x="32" y="-3" fill="#1e293b" fontSize="8" fontWeight="black" textAnchor="middle">{animationStep >= 2 ? 'GTP' : 'GDP'}</text>
            </g>

            {/* Beta/Gamma */}
            <g transform={animationStep >= 2 ? "translate(125, 98)" : "translate(195, 122)"} className="transition-all duration-1000" filter="url(#hand-drawn-wiggle)">
              <circle cx="8" cy="8" r="8" fill="#d8b4fe" stroke="#374151" strokeWidth="2" />
              <text x="8" y="11" fill="#581c87" fontSize="8" fontWeight="black" textAnchor="middle">β</text>
              <circle cx="20" cy="11" r="7" fill="#c084fc" stroke="#374151" strokeWidth="2" />
              <text x="20" y="14" fill="#581c87" fontSize="8" fontWeight="black" textAnchor="middle">γ</text>
            </g>

            {/* Effector */}
            {pathway === 'gq' ? (
              <g transform="translate(380, 55)" filter="url(#hand-drawn-wiggle)">
                <rect x="0" y="0" width="105" height="75" rx="16" fill="#ccfbf1" stroke="#374151" strokeWidth="2.5" />
                <text x="52.5" y="32" fill="#115e59" fontSize="16" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">PLC</text>
                <text x="52.5" y="52" fill="#0f766e" fontSize="8" textAnchor="middle">Phospholipase C</text>
                <path d="M 85,10 L 95,20 M 95,10 L 85,20" stroke="#0f766e" strokeWidth="2" />
              </g>
            ) : (
              <g transform="translate(350, 55)" filter="url(#hand-drawn-wiggle)">
                <rect x="0" y="0" width="105" height="75" rx="16" fill={pathway === 'gi' && animationStep >= 3 ? '#e2e8f0' : '#e0f2fe'} stroke="#374151" strokeWidth="2.5" />
                <text x="52.5" y="32" fill="#0369a1" fontSize="16" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">AC</text>
                <text x="52.5" y="52" fill="#075985" fontSize="8" textAnchor="middle">Adenylyl Cyclase</text>
                {pathway === 'gi' && animationStep >= 3 && (<g transform="translate(42, 22)"><line x1="0" y1="0" x2="20" y2="20" stroke="#ef4444" strokeWidth="3" /><line x1="20" y1="0" x2="0" y2="20" stroke="#ef4444" strokeWidth="3" /></g>)}
              </g>
            )}

            {/* Downstream */}
            {animationStep >= 3 && (<>
              {pathway === 'gs' && (<g>
                <circle cx="395" cy="145" r="10" fill="#fde047" stroke="#374151" strokeWidth="1.5" className="gpcr-camp" style={{ '--mx': '30px', '--my': '60px' } as React.CSSProperties} />
                <text x="395" y="148" fill="#1e293b" fontSize="7" fontWeight="bold" textAnchor="middle">cAMP</text>
                <circle cx="395" cy="145" r="10" fill="#fde047" stroke="#374151" strokeWidth="1.5" className="gpcr-camp" style={{ '--mx': '-30px', '--my': '80px' } as React.CSSProperties} />
                <text x="395" y="148" fill="#1e293b" fontSize="7" fontWeight="bold" textAnchor="middle">cAMP</text>
                <g transform="translate(330, 240)" filter="url(#hand-drawn-wiggle)">
                  <rect x="0" y="0" width="130" height="42" rx="10" fill="#a7f3d0" stroke="#374151" strokeWidth="2.5" />
                  <text x="65" y="25" fill="#065f46" fontSize="13" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">PKA Activated</text>
                  <circle cx="15" cy="20" r="6" fill="#10b981" />
                  <circle cx="115" cy="20" r="6" fill="#10b981" />
                </g>
              </g>)}
              {pathway === 'gi' && (<g>
                <g transform="translate(330, 240)" filter="url(#hand-drawn-wiggle)">
                  <rect x="0" y="0" width="130" height="42" rx="10" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="2.5" />
                  <text x="65" y="25" fill="#9ca3af" fontSize="11" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">PKA Dormant</text>
                </g>
              </g>)}
              {pathway === 'gq' && (<g>
                <g transform="translate(490, 82)" filter="url(#hand-drawn-wiggle)">
                  <rect x="0" y="0" width="45" height="18" rx="6" fill="#fecaca" stroke="#374151" strokeWidth="1.5" />
                  <text x="22.5" y="12" fill="#991b1b" fontSize="8" fontWeight="bold" textAnchor="middle">DAG</text>
                </g>
                <g transform="translate(425, 140)" filter="url(#hand-drawn-wiggle)">
                  <circle cx="0" cy="0" r="13" fill="#ffedd5" stroke="#374151" strokeWidth="1.5" />
                  <text x="0" y="3" fill="#ea580c" fontSize="8" fontWeight="bold" textAnchor="middle">IP3</text>
                </g>
                <g transform="translate(200, 215)" filter="url(#hand-drawn-wiggle)">
                  <rect x="0" y="0" width="100" height="65" rx="12" fill="#dbeafe" stroke="#374151" strokeWidth="2.5" />
                  <text x="50" y="20" fill="#1e40af" fontSize="11" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">ER Ca²⁺ Pool</text>
                  <rect x="40" y="-8" width="20" height="10" fill="#3b82f6" stroke="#374151" strokeWidth="1.5" />
                  <g className="gpcr-calcium"><polygon points="50, -20 52, -15 57, -15 53, -12 55, -7 50, -10 45, -7 47, -12 43, -15 48, -15" fill="#f59e0b" /></g>
                </g>
                <g transform="translate(410, 215)" filter="url(#hand-drawn-wiggle)">
                  <rect x="0" y="0" width="125" height="65" rx="12" fill="#fca5a5" stroke="#374151" strokeWidth="2.5" />
                  <text x="62.5" y="25" fill="#991b1b" fontSize="13" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">PKC Activated</text>
                  <text x="62.5" y="45" fill="#7f1d1d" fontSize="9" textAnchor="middle">Ca²⁺ + DAG Linked</text>
                </g>
              </g>)}
            </>)}
          </svg>
        </div>

        <div className="bg-[#E5F1FF] border-4 border-neutral-800 p-4 rounded-2xl">
          <p className="text-sm font-semibold text-center text-neutral-750">
            {animationStep === 0 && 'System Idle. Select a pathway and click "Bind Ligand".'}
            {animationStep === 1 && 'Step 1: Extracellular ligand binds receptor, causing 7-TM conformational change.'}
            {animationStep === 2 && 'Step 2: Receptor acts as GEF, replacing alpha subunit GDP with high energy GTP.'}
            {animationStep >= 3 && pathway === 'gs' && 'Step 3: G-αs activates Adenylyl Cyclase → converts ATP to cAMP → activates PKA.'}
            {animationStep >= 3 && pathway === 'gi' && 'Step 3: G-αi inhibits Adenylyl Cyclase → drops cAMP production → PKA remains dormant.'}
            {animationStep >= 3 && pathway === 'gq' && 'Step 3: G-αq activates Phospholipase C → cleaves PIP2 into DAG and IP3. IP3 opens ER channel releasing Ca²⁺; Ca²⁺ + DAG activate PKC.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        <div className="bg-[#E0F2FE] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[1deg]">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center mb-4 gap-2 font-['Fredoka']"><CpuChipIcon className="w-5 h-5 text-blue-700" />Pathway Switch</h2>
          <div className="space-y-3">
            {[
              { id: 'gs', name: 'Gs Pathway (Stimulatory)', recs: 'β₁, β₂, D₁, H₂, V₂' },
              { id: 'gi', name: 'Gi Pathway (Inhibitory)',  recs: 'M₂, α₂, D₂' },
              { id: 'gq', name: 'Gq Pathway (Calcium Spark)', recs: 'H₁, α₁, V₁, M₁, M₃' },
            ].map((p) => (
              <button key={p.id} onClick={() => { setPathway(p.id as GpcrPathway); resetCascade(); }} className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 ${pathway === p.id ? 'border-neutral-800 bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]' : 'border-transparent hover:bg-neutral-50/50'}`}>
                <span className="text-sm font-bold text-neutral-900 block font-['Fredoka']">{p.name}</span>
                <span className="text-xs text-neutral-600 mt-1 block font-medium">Receptors: {p.recs}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={triggerCascade} disabled={isPlaying} className="flex-grow py-3 px-3 disabled:opacity-50 flex items-center justify-center gap-1.5 font-bold text-xs rounded-xl border-2 border-neutral-800 bg-white text-neutral-800 hover:bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]">
              <PlayIcon className="w-4 h-4" />Bind Ligand
            </button>
            <button onClick={resetCascade} className="px-3 py-2 border-2 border-neutral-800 hover:bg-neutral-50 rounded-xl text-neutral-800 transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]">
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-[#E5F1FF] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[-1deg]">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest flex items-center gap-1.5 mb-3 font-['Fredoka']"><AcademicCapIcon className="w-4 h-4" />Cascade Metaphor</h3>
          <p className="text-neutral-700 text-xs md:text-sm leading-relaxed font-medium">
            {pathway === 'gs' && <span><strong>Gs:</strong> The manager (GPCR) triggers Gs, which hands a GTP pass to G-alpha. G-alpha runs to the Adenylyl Cyclase blower, inflating cAMP balloons that float down to activate Worker A (PKA).</span>}
            {pathway === 'gi' && <span><strong>Gi:</strong> Receptors like M₂ (heart rate slowing) trigger Gi. G-alpha clamps a handbrake on Adenylyl Cyclase, dropping cAMP immediately, keeping Worker A (PKA) resting.</span>}
            {pathway === 'gq' && <span><strong>Gq:</strong> The Gq G-alpha protein runs to the PLC scissors. PLC cuts membrane lipids into IP3 keys. These unlock the Calcium cages (ER), releasing Ca²⁺ sparks to fuel Worker C (PKC).</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
