'use client';

import React, { useState } from 'react';
import {
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  AcademicCapIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

type EtcMode = 'normal' | 'rotenone' | 'cyanide' | 'oligomycin' | 'dnp';

export default function EtcSimulator() {
  const [mode, setMode] = useState<EtcMode>('normal');
  const [isRunning, setIsRunning] = useState<boolean>(true);

  const getMetrics = () => {
    switch (mode) {
      case 'normal':     return { atp: 100, o2: 100, heat: 10 };
      case 'rotenone':   return { atp: 15,  o2: 10,  heat: 5  };
      case 'cyanide':    return { atp: 0,   o2: 0,   heat: 2  };
      case 'oligomycin': return { atp: 0,   o2: 8,   heat: 2  };
      case 'dnp':        return { atp: 0,   o2: 180, heat: 200 };
    }
  };

  const metrics = getMetrics();

  const renderBilayer = (yPos: number, width: number) => {
    const lipids = [];
    const step = 16;
    for (let x = 10; x < width - 10; x += step) {
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
      {/* Simulation Screen */}
      <div className="lg:col-span-2 bg-[#ECF5FF] border-4 border-neutral-800 rounded-[30px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[520px] shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="flex justify-between items-center mb-6 z-10">
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-900 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">
            Textbook Notebook: Mitochondria ETC
          </span>
          <div className="flex gap-2">
            {mode === 'normal'     && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-950 border-2 border-neutral-800"><span className="w-2 h-2 rounded-full bg-emerald-550 mr-2 animate-pulse" />Active Flow</span>}
            {mode === 'rotenone'   && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-950 border-2 border-neutral-800 animate-pulse">Complex I Blocked</span>}
            {mode === 'cyanide'    && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-rose-250 text-rose-950 border-2 border-neutral-800 animate-pulse">Complex IV Jammed</span>}
            {mode === 'oligomycin' && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-950 border-2 border-neutral-800">Complex V Jammed</span>}
            {mode === 'dnp'        && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-amber-250 text-amber-950 border-2 border-neutral-800 animate-bounce">Gradient Leaking (Hyperthermia)</span>}
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center my-6 z-10">
          <svg viewBox="0 0 640 340" className="w-full max-w-2xl h-auto select-none" id="etc-svg-canvas">
            <style>{`
              @keyframes gear-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes proton-up { 0% { transform: translateY(80px); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(-50px); opacity: 0; } }
              @keyframes proton-down { 0% { transform: translateY(-30px); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(90px); opacity: 0; } }
              @keyframes electron-dash { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -32; } }
              @keyframes heat-wave { 0%, 100% { transform: scaleY(1); opacity: 0.5; } 50% { transform: scaleY(1.3); opacity: 1; } }
              .etc-gear { animation: gear-spin ${mode === 'normal' ? '2.5s' : mode === 'dnp' ? '0s' : '15s'} linear infinite; transform-origin: 520px 225px; }
              .etc-proton-up { animation: proton-up 2.2s infinite linear; }
              .etc-proton-down { animation: proton-down 2.2s infinite linear; }
              .etc-electron-flow { animation: electron-dash 1.2s infinite linear; }
            `}</style>

            <path d="M 15,10 L 625,10 C 625,10 620,70 580,70 L 50,70 C 20,70 15,10 15,10 Z" fill="#e0f2fe" stroke="#374151" strokeWidth="2.5" filter="url(#hand-drawn-wiggle)" />
            <text x="35" y="32" fill="#0369a1" fontSize="10" fontWeight="900" letterSpacing="1" fontFamily="Fredoka">INTERMEMBRANE SPACE (HIGH [H+])</text>

            {renderBilayer(110, 640)}
            <text x="25" y="113" fill="#ffffff" fontSize="9" fontWeight="950" letterSpacing="2" fontFamily="Fredoka" className="stroke-neutral-800 stroke-[3px] paint-order-markers">MITOCHONDRION INNER MEMBRANE</text>

            <text x="35" y="310" fill="#4b5563" fontSize="10" fontWeight="900" letterSpacing="1" fontFamily="Fredoka">MITOCHONDRIAL MATRIX (LOW [H+] / HIGH NADH)</text>

            {isRunning && mode !== 'cyanide' && mode !== 'rotenone' && (
              <path d="M 95,190 Q 185,160 275,190 T 450,195" fill="none" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" className="etc-electron-flow" />
            )}

            {/* Complex I */}
            <g transform="translate(60, 75)" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="70" height="115" rx="16" fill={mode === 'rotenone' ? '#fecaca' : '#bae6fd'} stroke="#374151" strokeWidth="2.5" />
              <text x="35" y="45" fill="#1e293b" fontSize="24" fontWeight="950" textAnchor="middle" fontFamily="Fredoka">I</text>
              <text x="35" y="75" fill="#0369a1" fontSize="9" fontWeight="bold" textAnchor="middle">NADH Dehyd.</text>
              {isRunning && mode === 'normal' && (<>
                <circle cx="20" cy="85" r="5" fill="#38bdf8" stroke="#374151" strokeWidth="1" className="etc-proton-up" style={{ animationDelay: '0s' }} />
                <circle cx="50" cy="85" r="5" fill="#38bdf8" stroke="#374151" strokeWidth="1" className="etc-proton-up" style={{ animationDelay: '1.1s' }} />
                <text x="20" y="88" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" className="etc-proton-up" style={{ animationDelay: '0s' }}>+</text>
                <text x="50" y="88" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" className="etc-proton-up" style={{ animationDelay: '1.1s' }}>+</text>
              </>)}
              {mode === 'rotenone' && (<g transform="translate(15, 80)"><line x1="0" y1="0" x2="40" y2="20" stroke="#b91c1c" strokeWidth="4" /><line x1="40" y1="0" x2="0" y2="20" stroke="#b91c1c" strokeWidth="4" /></g>)}
            </g>

            {/* Complex II */}
            <g transform="translate(155, 95)" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="60" height="95" rx="14" fill="#fed7aa" stroke="#374151" strokeWidth="2.5" />
              <text x="30" y="40" fill="#1e293b" fontSize="22" fontWeight="950" textAnchor="middle" fontFamily="Fredoka">II</text>
              <text x="30" y="65" fill="#ea580c" fontSize="8" fontWeight="bold" textAnchor="middle">Succinate DH</text>
            </g>

            {/* Complex III */}
            <g transform="translate(235, 75)" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="70" height="115" rx="16" fill="#bfdbfe" stroke="#374151" strokeWidth="2.5" />
              <text x="35" y="45" fill="#1e293b" fontSize="24" fontWeight="950" textAnchor="middle" fontFamily="Fredoka">III</text>
              <text x="35" y="75" fill="#1d4ed8" fontSize="9" fontWeight="bold" textAnchor="middle">Cytoch. b-c1</text>
              {isRunning && (mode === 'normal' || mode === 'dnp') && (<>
                <circle cx="20" cy="85" r="5" fill="#38bdf8" stroke="#374151" strokeWidth="1" className="etc-proton-up" style={{ animationDelay: '0.4s' }} />
                <circle cx="50" cy="85" r="5" fill="#38bdf8" stroke="#374151" strokeWidth="1" className="etc-proton-up" style={{ animationDelay: '1.5s' }} />
                <text x="20" y="88" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" className="etc-proton-up" style={{ animationDelay: '0.4s' }}>+</text>
                <text x="50" y="88" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" className="etc-proton-up" style={{ animationDelay: '1.5s' }}>+</text>
              </>)}
            </g>

            {/* Complex IV */}
            <g transform="translate(325, 75)" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="80" height="115" rx="16" fill={mode === 'cyanide' ? '#fca5a5' : '#dbeafe'} stroke="#374151" strokeWidth="2.5" />
              <text x="40" y="45" fill="#1e293b" fontSize="24" fontWeight="950" textAnchor="middle" fontFamily="Fredoka">IV</text>
              <text x="40" y="70" fill="#1d4ed8" fontSize="9" fontWeight="bold" textAnchor="middle">Cytoch. c Ox.</text>
              <text x="40" y="90" fill="#475569" fontSize="8" textAnchor="middle">O₂ → H₂O</text>
              {isRunning && (mode === 'normal' || mode === 'dnp') && (<>
                <circle cx="25" cy="85" r="5" fill="#38bdf8" stroke="#374151" strokeWidth="1" className="etc-proton-up" style={{ animationDelay: '0.7s' }} />
                <circle cx="55" cy="85" r="5" fill="#38bdf8" stroke="#374151" strokeWidth="1" className="etc-proton-up" style={{ animationDelay: '1.8s' }} />
                <text x="25" y="88" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" className="etc-proton-up" style={{ animationDelay: '0.7s' }}>+</text>
                <text x="55" y="88" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" className="etc-proton-up" style={{ animationDelay: '1.8s' }}>+</text>
              </>)}
              {mode === 'cyanide' && (<g transform="translate(20, 80)"><line x1="0" y1="0" x2="40" y2="20" stroke="#b91c1c" strokeWidth="4" /><line x1="40" y1="0" x2="0" y2="20" stroke="#b91c1c" strokeWidth="4" /></g>)}
            </g>

            {/* DNP pore */}
            {mode === 'dnp' && (
              <g transform="translate(420, 95)" filter="url(#hand-drawn-wiggle)">
                <rect x="0" y="0" width="30" height="60" fill="#ffedd5" rx="8" stroke="#ea580c" strokeWidth="2.5" strokeDasharray="3 3" />
                <circle cx="15" cy="20" r="5" fill="#38bdf8" stroke="#374151" strokeWidth="1" className="etc-proton-down" />
                <text x="15" y="23" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" className="etc-proton-down">+</text>
                <path d="M -5,80 Q 15,60 35,80" stroke="#f97316" strokeWidth="3" fill="none" style={{ animation: 'heat-wave 0.8s infinite alternate' }} />
                <path d="M -15,90 Q 15,70 45,90" stroke="#ef4444" strokeWidth="2.5" fill="none" style={{ animation: 'heat-wave 0.8s infinite alternate 0.2s' }} />
                <text x="15" y="105" fill="#ea580c" fontSize="9" fontWeight="950" textAnchor="middle" fontFamily="Fredoka">HEAT</text>
              </g>
            )}

            {/* Complex V */}
            <g transform="translate(465, 55)" filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="110" height="155" rx="20" fill={mode === 'oligomycin' ? '#ffedd5' : '#ccfbf1'} stroke="#374151" strokeWidth="2.5" />
              <text x="55" y="28" fill="#1e293b" fontSize="24" fontWeight="950" textAnchor="middle" fontFamily="Fredoka">V</text>
              <text x="55" y="48" fill="#0f766e" fontSize="9" fontWeight="bold" textAnchor="middle">ATP Synthase</text>
              <line x1="55" y1="65" x2="55" y2="105" stroke="#374151" strokeWidth="3.5" />
              <g className="etc-gear">
                <circle cx="520" cy="225" r="28" fill="#2dd4bf" stroke="#374151" strokeWidth="2.5" />
                <line x1="492" y1="225" x2="548" y2="225" stroke="#374151" strokeWidth="2.5" />
                <line x1="520" y1="197" x2="520" y2="253" stroke="#374151" strokeWidth="2.5" />
                <circle cx="520" cy="225" r="6" fill="#374151" />
              </g>
              {isRunning && mode === 'normal' && (<>
                <circle cx="55" cy="15" r="5" fill="#38bdf8" stroke="#374151" strokeWidth="1" className="etc-proton-down" />
                <text x="55" y="18" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" className="etc-proton-down">+</text>
              </>)}
              {mode === 'oligomycin' && (<g transform="translate(43, 85)"><rect x="0" y="8" width="24" height="18" rx="4" fill="#ef4444" stroke="#374151" strokeWidth="2" /><path d="M 6,8 V 4 A 6,6 0 0 1 18,4 V 8" fill="none" stroke="#374151" strokeWidth="2" /></g>)}
            </g>
          </svg>
        </div>

        {/* Stats */}
        <div className="bg-[#E5F1FF] border-4 border-neutral-800 p-4 rounded-2xl grid grid-cols-3 gap-4">
          <div className="text-center">
            <span className="text-[11px] text-neutral-500 block uppercase font-bold tracking-wider font-['Fredoka']">ATP Production</span>
            <span className={`text-2xl font-black ${metrics.atp > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{metrics.atp}%</span>
          </div>
          <div className="text-center border-x-2 border-neutral-300">
            <span className="text-[11px] text-neutral-500 block uppercase font-bold tracking-wider font-['Fredoka']">O₂ Consumption</span>
            <span className={`text-2xl font-black ${metrics.o2 > 100 ? 'text-amber-600' : metrics.o2 > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{metrics.o2}%</span>
          </div>
          <div className="text-center">
            <span className="text-[11px] text-neutral-500 block uppercase font-bold tracking-wider font-['Fredoka']">Heat Loss</span>
            <span className={`text-2xl font-black ${metrics.heat > 100 ? 'text-rose-600 font-extrabold animate-pulse' : 'text-neutral-700'}`}>{metrics.heat > 100 ? 'HIGH' : `${metrics.heat}%`}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col space-y-6">
        <div className="bg-[#E0F2FE] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] relative rotate-[1deg]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-28 h-6 bg-neutral-200/80 border-2 border-neutral-800 opacity-60 rotate-[-2deg]" />
          <h2 className="text-lg font-bold text-neutral-900 flex items-center mb-4 gap-2 font-['Fredoka']"><CpuChipIcon className="w-5 h-5 text-blue-700" />Inhibitor Log</h2>
          <div className="space-y-3">
            {[
              { id: 'normal',     title: 'Normal Operation',              desc: 'No blocks. Protons flow down Complex V waterwheel generating ATP.' },
              { id: 'rotenone',   title: 'Rotenone (Complex I Block)',    desc: 'Restricts electron acceptance. Drops ATP synthesis significantly.' },
              { id: 'cyanide',    title: 'Cyanide / CO (Complex IV Block)', desc: 'Binds Fe3+ in heme a3. Complete block of electron transfer.' },
              { id: 'oligomycin', title: 'Oligomycin (Complex V Block)',  desc: 'Blocks F0 subunit of ATP synthase, raising mitochondrial potential.' },
              { id: 'dnp',        title: '2,4-DNP / Thermogenin (Uncoupler)', desc: 'Leaks protons directly across membrane. Burns oxygen, creates heat.' },
            ].map((m) => (
              <label key={m.id} className={`flex items-start p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 ${mode === m.id ? 'border-neutral-800 bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]' : 'border-transparent hover:bg-neutral-50/50'}`}>
                <input type="radio" name="etcMode" checked={mode === m.id} onChange={() => setMode(m.id as EtcMode)} className="mt-1.5 mr-3 text-amber-600 focus:ring-amber-500 bg-white border-neutral-400" />
                <div>
                  <span className="text-sm font-bold text-neutral-900 block font-['Fredoka']">{m.title}</span>
                  <span className="text-xs text-neutral-600 mt-1 block leading-relaxed font-medium">{m.desc}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setIsRunning(!isRunning)} className="flex-grow flex items-center justify-center gap-1.5 py-2 px-3 border-2 border-neutral-800 hover:bg-neutral-50 text-xs font-bold rounded-xl text-neutral-800 transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]">
              {isRunning ? <><PauseIcon className="w-4 h-4 text-neutral-500" />Pause</> : <><PlayIcon className="w-4 h-4 text-neutral-500" />Resume</>}
            </button>
            <button onClick={() => { setMode('normal'); setIsRunning(true); }} className="px-3 py-2 border-2 border-neutral-800 hover:bg-neutral-50 rounded-xl text-neutral-800 transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]" title="Reset">
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-[#E5F1FF] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[-1deg]">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest flex items-center gap-1.5 mb-3 font-['Fredoka']"><AcademicCapIcon className="w-4 h-4" />Metaphor Note</h3>
          <p className="text-neutral-700 text-xs md:text-sm leading-relaxed font-medium">
            {mode === 'normal'     && <span><strong>The Hydroelectric Dam:</strong> Electron flow acts as a rushing river powering the pumps (I, III, IV) to store water (protons) in the reservoir. Gravity draws the water down through the turbine (Complex V) to print ATP.</span>}
            {mode === 'rotenone'   && <span><strong>Upstream Trickle:</strong> Rotenone blocks the river right at the source (Complex I). Very few protons are pumped, leading to a weak gradient and severe ATP loss. Succinate (Complex II) can still feed some electrons.</span>}
            {mode === 'cyanide'    && <span><strong>Jammed River Gate:</strong> Cyanide, CO, and Azide block the exit gate (Complex IV). The entire river stops. No protons pump, the reservoir drains, and ATP drops to absolute zero. O₂ use stops.</span>}
            {mode === 'oligomycin' && <span><strong>Padlocked Turbine:</strong> Oligomycin physically blocks Complex V. Protons can&apos;t return to the matrix, creating massive backup pressure. This backpressure halts the pumps (I, III, IV) and stops electron flow.</span>}
            {mode === 'dnp'        && <span><strong>The Leak:</strong> Uncouplers (2,4-DNP, high-dose Aspirin, Thermogenin) drill a hole in the dam. Protons bypass the turbine. With no pressure, the pumps run at full speed, burning oxygen (O₂ spikes) and dumping the energy as raw heat.</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
