'use client';

import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type AntiarrClass = 'none' | 'class1' | 'class2' | 'class3' | 'class4';

export default function AntiarrhythmicSimulator() {
  const [classType, setClassType] = useState<AntiarrClass>('none');

  let ecgInterval = 'Normal QT / PR';
  let phaseAffected = 'Baseline';
  let clinicalPearl = 'Cardiac non-pacemaker action potential consists of Phase 0 (Na influx), Phase 1 (K efflux), Phase 2 (Ca influx/K efflux), Phase 3 (K efflux), and Phase 4 (K efflux leak).';
  
  // Normal Action Potential path
  // Start 0 -> vertical rise to 40 -> brief drop -> plateau -> drop to baseline
  let pathD = 'M 40 240 L 90 240 L 100 40 L 120 70 L 220 90 Q 250 140, 270 240 L 360 240';

  switch (classType) {
    case 'class1':
      phaseAffected = 'Phase 0 (Slower Upstroke)';
      ecgInterval = 'Prolongs QRS (especially IC)';
      // Slower Phase 0 slope (longer rise time)
      pathD = 'M 40 240 L 90 240 L 125 40 L 140 70 L 220 90 Q 250 140, 270 240 L 360 240';
      clinicalPearl = 'Class I antiarrhythmics block fast sodium channels, slowing Phase 0 depolarization. Shift upstroke slope to the right.';
      break;
    case 'class2':
      phaseAffected = 'Phase 4 (Pacemaker) / AV conduction';
      ecgInterval = 'Prolongs PR interval';
      pathD = 'M 40 240 L 90 240 L 100 40 L 120 70 L 220 90 Q 250 140, 270 240 L 360 240'; // Pacemaker changes mostly
      clinicalPearl = 'Class II agents (Beta-blockers) decrease cAMP, slowing Phase 4 diastolic depolarization in SA/AV nodes. Prolongs PR interval.';
      break;
    case 'class3':
      phaseAffected = 'Phase 3 (Prolonged Repolarization)';
      ecgInterval = 'Prolongs QT interval (Torsades risk)';
      // Prolonged plateau & slower repolarization
      pathD = 'M 40 240 L 90 240 L 100 40 L 120 70 L 260 90 Q 290 140, 310 240 L 380 240';
      clinicalPearl = 'Class III agents (Amiodarone, Sotalol) block K+ channels, prolonging Phase 3 repolarization. Prolongs QT interval.';
      break;
    case 'class4':
      phaseAffected = 'Phase 2 (Plateau shortening in non-pacemakers)';
      ecgInterval = 'Prolongs PR interval (blocks AV)';
      // Shorter plateau due to Ca2+ blockade
      pathD = 'M 40 240 L 90 240 L 100 40 L 115 70 L 180 90 Q 210 140, 240 240 L 360 240';
      clinicalPearl = 'Class IV agents (Verapamil, Diltiazem) block L-type calcium channels. Slows conduction through AV node. Shortens Phase 2 plateau in ventricular myocytes.';
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#FEF2F2] border-4 border-neutral-800 rounded-[30px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-neutral-900 font-['Fredoka']">Cardiac Action Potential &amp; Antiarrhythmics</h3>
        <p className="text-neutral-600 text-xs mt-1">Simulate ventricular myocyte action potential curves and the impact of Vaughan Williams Class I-IV drugs.</p>
      </div>

      {/* SVG AP Plot */}
      <div className="lg:col-span-2 bg-white border-3 border-neutral-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
        <div className="relative flex justify-center items-center">
          <svg viewBox="0 0 400 300" className="w-full max-w-sm" style={{ filter: 'url(#hand-drawn-wiggle-fine)' }}>
            <line x1="40" y1="240" x2="380" y2="240" stroke="#1f2937" strokeWidth="2" /> {/* X axis Time */}
            <line x1="40" y1="20" x2="40" y2="280" stroke="#1f2937" strokeWidth="2" />  {/* Y axis Voltage */}
            
            <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="3" className="transition-all duration-300" />
            
            <text x="350" y="255" className="text-[9px] font-bold">Time</text>
            <text x="12" y="30" className="text-[9px] font-bold rotate-90 origin-left">Membrane Pot. (mV)</text>
          </svg>
        </div>

        {/* Clinical Note */}
        <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200 flex gap-2">
          <InformationCircleIcon className="w-5 h-5 text-red-700 shrink-0" />
          <p className="text-xs text-red-850 leading-normal">{clinicalPearl}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white border-3 border-neutral-800 rounded-2xl p-4 space-y-4">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">Select Antiarrhythmic Class</span>
          <div className="flex flex-col gap-2">
            {[
              { id: 'none', name: 'Baseline Action Potential' },
              { id: 'class1', name: 'Class I (Na+ Blockers)' },
              { id: 'class2', name: 'Class II (Beta-Blockers)' },
              { id: 'class3', name: 'Class III (K+ Blockers)' },
              { id: 'class4', name: 'Class IV (Ca2+ Blockers)' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setClassType(item.id as AntiarrClass)}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-left ${
                  classType === item.id
                    ? 'bg-red-650 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* ECG Outcomes */}
        <div className="pt-3 border-t border-neutral-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Phase Affected</span>
            <span className="font-mono font-bold text-neutral-900">{phaseAffected}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">ECG Interval Impact</span>
            <span className="font-mono font-bold text-red-700">{ecgInterval}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
