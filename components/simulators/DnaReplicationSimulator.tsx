'use client';

import React, { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, AcademicCapIcon, CpuChipIcon } from '@heroicons/react/24/outline';

type ReplicationInhibitor = 'none' | 'fluoroquinolones' | 'etoposide' | 'acyclovir';

export default function DnaReplicationSimulator() {
  const [inhibitor, setInhibitor] = useState<ReplicationInhibitor>('none');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    if (!isRunning || inhibitor !== 'none') return;
    const interval = setInterval(() => {
      setElapsedTime(prev => (prev + 100) % 12000);
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning, inhibitor]);

  const pauseClass = (!isRunning || inhibitor !== 'none') ? ' rep-paused' : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-[#ECF5FF] border-4 border-neutral-800 rounded-[30px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[520px] shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="absolute top-4 left-4 z-10">
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-900 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">Textbook Notebook: Replication Fork</span>
        </div>
        <div className="absolute top-4 right-4 z-10">
          {inhibitor === 'none'             && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-950 border-2 border-neutral-800">Elongating</span>}
          {inhibitor === 'fluoroquinolones' && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-950 border-2 border-neutral-800">Gyrase Blocked</span>}
          {inhibitor === 'etoposide'        && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-950 border-2 border-neutral-800">Topo II Locked</span>}
          {inhibitor === 'acyclovir'        && <span className="flex items-center px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-950 border-2 border-neutral-800">Chain Terminated</span>}
        </div>

        <div className="flex-grow flex items-center justify-center my-6 z-10">
          <svg viewBox="0 0 600 340" className="w-full max-w-2xl h-auto select-none" id="replication-svg-canvas">
            <style>{`
              @keyframes flow-helix { 0% { transform: translateX(0px); } 100% { transform: translateX(-100px); } }
              .rep-helix-group-flow { animation: flow-helix 3.5s infinite linear; }
              @keyframes supercoil-shake { 0%, 100% { transform: translate(0px, 0px) rotate(0deg); } 20% { transform: translate(-1px, 1px) rotate(-0.5deg); } 40% { transform: translate(1px, -1px) rotate(0.5deg); } 60% { transform: translate(-1.5px, 0.5px) rotate(-1deg); } 80% { transform: translate(1px, 1.5px) rotate(0.5deg); } }
              .rep-supercoil-shake { animation: supercoil-shake 0.1s infinite linear; }
              @keyframes etoposide-shake-1 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(-1px, 1.5px); } }
              @keyframes etoposide-shake-2 { 0%, 100% { transform: translate(0px, 0px); } 50% { transform: translate(1px, -1.5px); } }
              .rep-etop-broken-1 { animation: etoposide-shake-1 0.25s infinite linear; }
              .rep-etop-broken-2 { animation: etoposide-shake-2 0.25s infinite linear; }
              @keyframes bond-snap-1 { 0% { transform: scaleY(1); opacity: 0.9; } 30% { transform: scaleY(1.25); opacity: 0.9; } 55% { transform: scaleY(0.2); opacity: 0.2; } 100% { transform: scaleY(0); opacity: 0; } }
              @keyframes bond-snap-2 { 0% { transform: scaleY(1); opacity: 0.9; } 20% { transform: scaleY(1.3); opacity: 0.9; } 45% { transform: scaleY(0.15); opacity: 0.15; } 100% { transform: scaleY(0); opacity: 0; } }
              .rep-bond-snap-1 { animation: bond-snap-1 1.6s infinite linear; transform-origin: 310px 165px; }
              .rep-bond-snap-2 { animation: bond-snap-2 1.6s infinite linear; animation-delay: 0.8s; transform-origin: 295px 165px; }
              @keyframes dntp-stream-lead { 0% { transform: translate(110px, 30px); opacity: 0; } 15% { opacity: 0.95; } 80% { opacity: 0.95; } 100% { transform: translate(195px, 99px); opacity: 0; } }
              .rep-dntp-lead-1 { animation: dntp-stream-lead 2.2s infinite linear; }
              .rep-dntp-lead-2 { animation: dntp-stream-lead 2.2s infinite linear; animation-delay: 0.55s; }
              .rep-dntp-lead-3 { animation: dntp-stream-lead 2.2s infinite linear; animation-delay: 1.1s; }
              .rep-dntp-lead-4 { animation: dntp-stream-lead 2.2s infinite linear; animation-delay: 1.65s; }
              @keyframes dntp-bounce-lead { 0% { transform: translate(110px, 30px); opacity: 0; } 15% { opacity: 0.9; } 45% { transform: translate(175px, 99px); opacity: 0.9; } 70% { transform: translate(145px, 60px); opacity: 0.7; } 100% { transform: translate(110px, 30px); opacity: 0; } }
              .rep-dntp-bounce-1 { animation: dntp-bounce-lead 2s infinite linear; }
              .rep-dntp-bounce-2 { animation: dntp-bounce-lead 2s infinite linear; animation-delay: 0.65s; }
              .rep-dntp-bounce-3 { animation: dntp-bounce-lead 2s infinite linear; animation-delay: 1.3s; }
              @keyframes helicase-shiver { 0% { transform: translate(255px, 130px); } 50% { transform: translate(257px, 129px); } 100% { transform: translate(255px, 130px); } }
              @keyframes pol-shiver { 0% { transform: translate(160px, 80px); } 50% { transform: translate(161px, 81px); } 100% { transform: translate(160px, 80px); } }
              @keyframes warning-ping { 0% { transform: scale(0.95); opacity: 0.5; } 50% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.5; } }
              @keyframes primase-cycle { 0% { transform: translate(280px, 260px); opacity: 0; } 5% { opacity: 1; } 12% { transform: translate(210px, 219px); opacity: 1; } 22% { transform: translate(210px, 219px); opacity: 1; } 27% { transform: translate(160px, 260px); opacity: 0; } 100% { transform: translate(160px, 260px); opacity: 0; } }
              @keyframes primer-cycle { 0% { opacity: 0; } 18% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 1; } }
              @keyframes lagging-pol-cycle { 0% { transform: translate(260px, 260px); opacity: 0; } 23% { opacity: 0; } 26% { transform: translate(205px, 219px); opacity: 1; } 60% { transform: translate(135px, 219px); opacity: 1; } 65% { transform: translate(90px, 260px); opacity: 0; } 100% { transform: translate(90px, 260px); opacity: 0; } }
              @keyframes fragment-cycle { 0% { stroke-dashoffset: 70; } 26% { stroke-dashoffset: 70; } 60% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 0; } }
              @keyframes ligase-cycle { 0% { transform: translate(90px, 260px); opacity: 0; } 65% { opacity: 0; } 69% { transform: translate(135px, 219px); opacity: 1; } 88% { transform: translate(135px, 219px); opacity: 1; } 93% { transform: translate(90px, 260px); opacity: 0; } 100% { transform: translate(90px, 260px); opacity: 0; } }
              @keyframes ligase-glow { 0%, 74% { filter: none; } 78% { filter: drop-shadow(0 0 10px #10b981) drop-shadow(0 0 4px #10b981); } 84% { filter: drop-shadow(0 0 10px #10b981) drop-shadow(0 0 4px #10b981); } 88%, 100% { filter: none; } }
              .rep-template-flow { stroke-dasharray: 10 10; animation: flow-helix 3.5s infinite linear; }
              .rep-helicase-active { animation: helicase-shiver 0.15s infinite linear; }
              .rep-pol-active { animation: pol-shiver 0.2s infinite linear; }
              .rep-warning { animation: warning-ping 0.8s infinite alternate; }
              .rep-primase-cycle { animation: primase-cycle 12s infinite ease-in-out; }
              .rep-primer-cycle { animation: primer-cycle 12s infinite ease-in-out; }
              .rep-lagging-pol-cycle { animation: lagging-pol-cycle 12s infinite ease-in-out; }
              .rep-fragment-cycle { animation: fragment-cycle 12s infinite ease-in-out; }
              .rep-ligase-cycle { animation: ligase-cycle 12s infinite ease-in-out; }
              .rep-paused { animation-play-state: paused !important; }
            `}</style>
            <defs>
              <clipPath id="helix-clip"><rect x="315" y="80" width="285" height="170" /></clipPath>
            </defs>

            {/* DNA strands */}
            <g filter="url(#hand-drawn-wiggle-fine)">
              {inhibitor === 'etoposide' ? (<>
                <g transform="rotate(3 300 165)">
                  <g className="rep-etop-broken-1">
                    <path d="M 300,165 Q 325,120 350,165 T 400,165 T 440,165" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
                    <path d="M 300,165 Q 325,210 350,165 T 400,165 T 440,165" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
                    {Array.from({ length: 3 }).map((_, k) => { const base = 300 + k * 50; return (<g key={k}><line x1={base + 25} y1="133" x2={base + 25} y2="197" stroke="#b91c1c" opacity="0.6" strokeWidth="2.5" /><line x1={base + 12.5} y1="148" x2={base + 12.5} y2="182" stroke="#b91c1c" opacity="0.5" strokeWidth="2" /><line x1={base + 37.5} y1="148" x2={base + 37.5} y2="182" stroke="#b91c1c" opacity="0.5" strokeWidth="2" /></g>); })}
                  </g>
                </g>
                <g transform="translate(15, -8) rotate(-3 480 165)">
                  <g className="rep-etop-broken-2">
                    <path d="M 480,165 Q 505,120 530,165 T 580,165 T 630,165 T 660,165" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
                    <path d="M 480,165 Q 505,210 530,165 T 580,165 T 630,165 T 660,165" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
                    {Array.from({ length: 4 }).map((_, k) => { const base = 480 + k * 50; return (<g key={k}><line x1={base + 25} y1="133" x2={base + 25} y2="197" stroke="#b91c1c" opacity="0.6" strokeWidth="2.5" /><line x1={base + 12.5} y1="148" x2={base + 12.5} y2="182" stroke="#b91c1c" opacity="0.5" strokeWidth="2" /><line x1={base + 37.5} y1="148" x2={base + 37.5} y2="182" stroke="#b91c1c" opacity="0.5" strokeWidth="2" /></g>); })}
                  </g>
                </g>
                <g transform="translate(458, 165)">
                  <g className="rep-warning">
                    <path d="M -12,-35 L 8,-8 L -8,8 L 12,35" fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
                    <path d="M -12,-35 L 8,-8 L -8,8 L 12,35" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                    <text x="0" y="-42" fill="#ef4444" fontSize="9" fontWeight="950" textAnchor="middle" fontFamily="Fredoka">DS BREAK!</text>
                  </g>
                </g>
              </>) : inhibitor === 'fluoroquinolones' ? (
                <g className="rep-supercoil-shake">
                  <path d="M 300,165 Q 312.5,110 325,165 T 350,165 T 375,165 T 400,165 T 425,165 T 450,165 T 475,165 T 500,165 T 525,165 T 550,165 T 575,165 T 600,165 T 625,165 T 650,165" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 300,165 Q 312.5,220 325,165 T 350,165 T 375,165 T 400,165 T 425,165 T 450,165 T 475,165 T 500,165 T 525,165 T 550,165 T 575,165 T 600,165 T 625,165 T 650,165" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
                  {Array.from({ length: 14 }).map((_, k) => { const base = 300 + k * 25; return <line key={k} x1={base + 12.5} y1="125" x2={base + 12.5} y2="205" stroke="#ef4444" opacity="0.8" strokeWidth="2.5" />; })}
                </g>
              ) : (
                <g clipPath="url(#helix-clip)">
                  <g className={`rep-helix-group-flow${pauseClass}`}>
                    <path d="M 300,165 Q 325,120 350,165 T 400,165 T 450,165 T 500,165 T 550,165 T 600,165 T 650,165 T 700,165" fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
                    <path d="M 300,165 Q 325,210 350,165 T 400,165 T 450,165 T 500,165 T 550,165 T 600,165 T 650,165 T 700,165" fill="none" stroke="#f43f5e" strokeWidth="6" strokeLinecap="round" />
                    {Array.from({ length: 9 }).map((_, k) => { const base = 300 + k * 50; return (<g key={k}><line x1={base + 25} y1="133" x2={base + 25} y2="197" stroke="#ea580c" opacity="0.6" strokeWidth="2.5" /><line x1={base + 12.5} y1="148" x2={base + 12.5} y2="182" stroke="#d97706" opacity="0.5" strokeWidth="2" /><line x1={base + 37.5} y1="148" x2={base + 37.5} y2="182" stroke="#d97706" opacity="0.5" strokeWidth="2" /></g>); })}
                  </g>
                </g>
              )}
            </g>

            {/* Snapping H-bonds */}
            {inhibitor === 'none' && isRunning && (
              <g strokeWidth="2.5" strokeLinecap="round" opacity="0.85" filter="url(#hand-drawn-wiggle-fine)">
                <g className="rep-bond-snap-1"><line x1="310" y1="145" x2="310" y2="155" stroke="#ea580c" /><line x1="310" y1="185" x2="310" y2="175" stroke="#ea580c" /></g>
                <g className="rep-bond-snap-2"><line x1="295" y1="132" x2="295" y2="142" stroke="#eab308" /><line x1="295" y1="198" x2="295" y2="188" stroke="#eab308" /></g>
              </g>
            )}

            {/* Template strands */}
            <path d="M 270,110 L 80,110" fill="none" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" className={`rep-template-flow${pauseClass}`} filter="url(#hand-drawn-wiggle)" />
            <path d="M 270,220 L 80,220" fill="none" stroke="#f43f5e" strokeWidth="4.5" strokeLinecap="round" className={`rep-template-flow${pauseClass}`} filter="url(#hand-drawn-wiggle)" />

            {/* Leading strand */}
            {inhibitor === 'acyclovir' ? (<>
              <path d="M 230,122 L 175,122" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" filter="url(#hand-drawn-wiggle)" />
              <g transform="translate(175, 122)">
                <g className="rep-warning">
                  <circle cx="0" cy="0" r="5.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
                  <text x="0" y="-10" fill="#ef4444" fontSize="8" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">ACV (No 3&apos;-OH)</text>
                </g>
              </g>
            </>) : (<>
              <path d="M 230,122 L 80,122" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="12 8" className={`rep-template-flow${pauseClass}`} filter="url(#hand-drawn-wiggle)" />
              <polygon points="80,118 72,122 80,126" fill="#10b981" />
              <text x="65" y="125" fill="#047857" fontSize="8" fontWeight="bold">5&apos;</text>
              <text x="240" y="125" fill="#047857" fontSize="8" fontWeight="bold">3&apos;</text>
            </>)}

            {/* Helicase */}
            <g transform="translate(255, 130)" className={isRunning && inhibitor === 'none' ? 'rep-helicase-active' : ''} filter="url(#hand-drawn-wiggle)">
              <polygon points="0,0 45,35 0,70" fill="#e9d5ff" stroke="#374151" strokeWidth="2.5" />
              <text x="12" y="40" fill="#581c87" fontSize="9" fontWeight="black" fontFamily="Fredoka">HELI</text>
            </g>

            {/* Topoisomerase */}
            <g transform="translate(380, 132)" filter="url(#hand-drawn-wiggle)">
              <circle cx="22" cy="22" r="25" fill={inhibitor === 'none' ? '#ccfbf1' : '#fecaca'} stroke="#374151" strokeWidth="2.5" />
              <text x="22" y="26" fill="#1e293b" fontSize="9" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">{inhibitor === 'none' ? 'TOPO' : 'LOCKED'}</text>
            </g>

            {/* DNA Pol III */}
            <g transform="translate(160, 80)" className={isRunning && inhibitor === 'none' ? 'rep-pol-active' : ''} filter="url(#hand-drawn-wiggle)">
              <rect x="0" y="0" width="75" height="38" rx="8" fill="#dbeafe" stroke="#374151" strokeWidth="2.5" />
              <text x="37.5" y="22" fill="#1e40af" fontSize="9" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">DNA POL III</text>
              {inhibitor === 'acyclovir' && (<g transform="translate(-10, -5)"><g className="rep-warning"><circle cx="0" cy="0" r="10" fill="#ef4444" /><text x="0" y="3.5" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">X</text></g></g>)}
            </g>

            {/* dNTP stream */}
            {isRunning && (<g filter="url(#hand-drawn-wiggle-fine)">
              {inhibitor === 'acyclovir' ? (<>
                <g className="rep-dntp-bounce-1"><circle cx="0" cy="0" r="5" fill="#f97316" stroke="#ffffff" strokeWidth="1" /><text x="0" y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="Fredoka">A</text></g>
                <g className="rep-dntp-bounce-2"><circle cx="0" cy="0" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" /><text x="0" y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="Fredoka">C</text></g>
                <g className="rep-dntp-bounce-3"><circle cx="0" cy="0" r="5" fill="#eab308" stroke="#ffffff" strokeWidth="1" /><text x="0" y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="Fredoka">G</text></g>
              </>) : inhibitor === 'none' ? (<>
                <g className="rep-dntp-lead-1"><circle cx="0" cy="0" r="5" fill="#f97316" stroke="#ffffff" strokeWidth="1" /><text x="0" y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="Fredoka">A</text></g>
                <g className="rep-dntp-lead-2"><circle cx="0" cy="0" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1" /><text x="0" y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="Fredoka">T</text></g>
                <g className="rep-dntp-lead-3"><circle cx="0" cy="0" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" /><text x="0" y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="Fredoka">C</text></g>
                <g className="rep-dntp-lead-4"><circle cx="0" cy="0" r="5" fill="#eab308" stroke="#ffffff" strokeWidth="1" /><text x="0" y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="Fredoka">G</text></g>
              </>) : null}
            </g>)}

            {/* Lagging strand loop */}
            <g>
              <g filter="url(#hand-drawn-wiggle-fine)">
                <rect x="75" y="213" width="10" height="12" fill="#86efac" stroke="#374151" strokeWidth="1.5" rx="2" />
                <line x1="30" y1="219" x2="75" y2="219" stroke="#f59e0b" strokeWidth="3" />
              </g>
              <rect x="205" y="213" width="10" height="12" fill="#86efac" stroke="#374151" strokeWidth="1.5" rx="2" className={`rep-primer-cycle${pauseClass}`} filter="url(#hand-drawn-wiggle-fine)" />
              <line x1="205" y1="219" x2="135" y2="219" stroke="#f59e0b" strokeWidth="3" strokeDasharray="70" strokeDashoffset="70" className={`rep-fragment-cycle${pauseClass}`} filter="url(#hand-drawn-wiggle-fine)" />
              <g className={`rep-primase-cycle${pauseClass}`}><circle cx="0" cy="0" r="13" fill="#fef08a" stroke="#374151" strokeWidth="2" filter="url(#hand-drawn-wiggle-fine)" /><text x="0" y="3" fill="#854d0e" fontSize="7" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">PRIME</text></g>
              <g className={`rep-lagging-pol-cycle${pauseClass}`}><rect x="-18" y="-11" width="36" height="22" rx="5" fill="#bfdbfe" stroke="#374151" strokeWidth="2" filter="url(#hand-drawn-wiggle-fine)" /><text x="0" y="3" fill="#1e3a8a" fontSize="7" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">POL III</text></g>
              <g className={`rep-ligase-cycle${pauseClass}`}><g className={`rep-ligase-glow${pauseClass}`} filter="url(#hand-drawn-wiggle-fine)"><rect x="-18" y="-11" width="36" height="22" rx="5" fill="#fca5a5" stroke="#374151" strokeWidth="2" /><text x="0" y="3" fill="#7f1d1d" fontSize="7" fontWeight="black" textAnchor="middle" fontFamily="Fredoka">LIGASE</text></g></g>
              <text x="145" y="200" fill="#475569" fontSize="8" fontWeight="bold">Lagging Strand Loop</text>
            </g>
          </svg>
        </div>

        <div className="bg-[#E5F1FF] border-4 border-neutral-800 p-4 rounded-2xl min-h-[72px] flex items-center justify-center">
          <p className="text-sm font-semibold text-center text-neutral-750">
            {inhibitor === 'none' ? (
              <span className="flex flex-col gap-1">
                <span>Replication fork moving smoothly. DNA Topoisomerase prevents supercoiling; Helicase unzips strands.</span>
                <span className="text-xs text-blue-700 font-bold uppercase tracking-wider font-['Fredoka'] animate-pulse">
                  {elapsedTime <  3000 && 'Lagging Strand Step 1: Primase binds & deposits RNA Primer (green block)'}
                  {elapsedTime >= 3000 && elapsedTime < 8000  && 'Lagging Strand Step 2: DNA Polymerase III synthesizes Okazaki fragment (orange line)'}
                  {elapsedTime >= 8000 && elapsedTime < 11000 && 'Lagging Strand Step 3: DNA Ligase seals the nick between fragments (green glow)'}
                  {elapsedTime >= 11000 && 'Lagging Strand Step 4: Resetting active replication complex for next loop'}
                </span>
              </span>
            ) : (<>
              {inhibitor === 'fluoroquinolones' && 'Fluoroquinolones lock prokaryotic DNA Gyrase/Topo IV → Supercoils choke fork, causing double-strand breaks.'}
              {inhibitor === 'etoposide'        && 'Etoposide inhibits eukaryotic Topoisomerase II, inducing permanent DNA breaks and cancer cell death.'}
              {inhibitor === 'acyclovir'        && "Acyclovir incorporates into elongating viral DNA, acting as a chain terminator due to lack of 3'-OH group."}
            </>)}
          </p>
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        <div className="bg-[#E0F2FE] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[1deg]">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center mb-4 gap-2 font-['Fredoka']"><CpuChipIcon className="w-5 h-5 text-blue-700" />Inhibitor Console</h2>
          <div className="space-y-3">
            {[
              { id: 'none',             title: 'Normal Replication',     desc: 'No pharmacological blocks. High speed copying.' },
              { id: 'fluoroquinolones', title: 'Fluoroquinolones',       desc: 'Inhibits prokaryotic Gyrase. Induces double-strand breaks.' },
              { id: 'etoposide',        title: 'Etoposide / Teniposide', desc: 'Inhibits eukaryotic Topo II. Used as cancer chemotherapeutic.' },
              { id: 'acyclovir',        title: 'Acyclovir / Ganciclovir', desc: "Nucleoside analog chain terminator. Lacks 3'-OH." },
            ].map((i) => (
              <label key={i.id} className={`flex items-start p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 ${inhibitor === i.id ? 'border-neutral-800 bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]' : 'border-transparent hover:bg-neutral-50/50'}`}>
                <input type="radio" name="repInhibitor" checked={inhibitor === i.id} onChange={() => setInhibitor(i.id as ReplicationInhibitor)} className="mt-1.5 mr-3 text-blue-600 focus:ring-blue-500 bg-white border-neutral-400" />
                <div>
                  <span className="text-sm font-bold text-neutral-900 block font-['Fredoka']">{i.title}</span>
                  <span className="text-xs text-neutral-600 mt-1 block leading-relaxed font-medium">{i.desc}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setIsRunning(!isRunning)} className="flex-grow flex items-center justify-center gap-1.5 py-2.5 px-3 border-2 border-neutral-800 hover:bg-neutral-50 text-xs font-bold rounded-xl text-neutral-800 transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]">
              {isRunning ? <><PauseIcon className="w-4 h-4 text-neutral-500" />Pause</> : <><PlayIcon className="w-4 h-4 text-neutral-500" />Resume</>}
            </button>
          </div>
        </div>

        <div className="bg-[#E5F1FF] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[-1deg]">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest flex items-center gap-1.5 mb-3 font-['Fredoka']"><AcademicCapIcon className="w-4 h-4" />Replisome Metaphor</h3>
          <p className="text-neutral-700 text-xs md:text-sm leading-relaxed font-medium">
            <strong>The DNA Copy Factory:</strong> Helicase acts as a zipper tearing down the double helix. Topoisomerase acts as an untwister ahead of the zipper to stop it from choking. DNA Pol III is the high-speed print head laying down ink. Ligase is the glue sealing trailing loose paper sheets (Okazaki fragments).
          </p>
        </div>
      </div>
    </div>
  );
}
