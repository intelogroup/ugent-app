'use client';

import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type SpiroMode = 'normal' | 'obstructive' | 'restrictive';

export default function SpirometrySimulator() {
  const [mode, setMode] = useState<SpiroMode>('normal');

  let fev1 = '4.0 L';
  let fvc = '5.0 L';
  let ratio = '80%';
  let tlc = 'Normal';
  let clinicalPearl = 'Normal respiratory mechanics. Lungs scale volumes and flow rates in typical patterns.';

  // SVG Flow Volume loop path
  // Normal: peak flow 8 L/s, FVC 5L.
  // Obstructive: scooped peak flow 3 L/s, FVC 4L (shifted left/right due to air trapping).
  // Restrictive: peak flow 6 L/s, FVC 2.5L (narrower width, normal shape).
  let loopPath = 'M 350 240 C 270 50, 200 40, 100 240 C 180 280, 280 280, 350 240';

  switch (mode) {
    case 'normal':
      fev1 = '4.0 L';
      fvc = '5.0 L';
      ratio = '80%';
      tlc = '6.0 L (Normal)';
      loopPath = 'M 320 240 C 260 40, 190 20, 100 240 C 180 270, 270 270, 320 240';
      clinicalPearl = 'Normal FEV1/FVC ratio is ~80%. Normal Peak Expiratory Flow Rate.';
      break;
    case 'obstructive':
      fev1 = '1.8 L';
      fvc = '3.8 L';
      ratio = '47% (FEV1/FVC < 70%)';
      tlc = '7.5 L (High - Air Trapping)';
      // Scooped expiratory flow
      loopPath = 'M 370 240 C 320 120, 260 170, 150 240 C 200 265, 300 265, 370 240';
      clinicalPearl = 'Obstructive (COPD, Asthma): Airflow limitation. FEV1 decreases much more than FVC, so FEV1/FVC ratio is < 70%. Scooped flow-volume loop, elevated RV and TLC.';
      break;
    case 'restrictive':
      fev1 = '2.2 L';
      fvc = '2.5 L';
      ratio = '88% (Normal or Elevated)';
      tlc = '3.5 L (Low)';
      // Miniaturized loop
      loopPath = 'M 220 240 C 180 90, 150 80, 100 240 C 130 260, 190 260, 220 240';
      clinicalPearl = 'Restrictive (Fibrosis, Scoliosis): Reduced lung compliance. FEV1 and FVC decrease proportionally, so FEV1/FVC is normal or elevated (>80%). TLC and all volumes are reduced.';
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#F0FDF4] border-4 border-neutral-800 rounded-[30px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-neutral-900 font-['Fredoka']">Pulmonary Spirometry &amp; Flow Loops</h3>
        <p className="text-neutral-600 text-xs mt-1">Simulate flow-volume loops and spirometric ratios. Contrast obstructive and restrictive lung diseases.</p>
      </div>

      {/* Main Spirometry Graph */}
      <div className="lg:col-span-2 bg-white border-3 border-neutral-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
        <div className="relative flex justify-center items-center">
          <svg viewBox="0 0 400 300" className="w-full max-w-sm" style={{ filter: 'url(#hand-drawn-wiggle-fine)' }}>
            <line x1="40" y1="240" x2="380" y2="240" stroke="#1f2937" strokeWidth="2" /> {/* X axis Volume */}
            <line x1="40" y1="20" x2="40" y2="280" stroke="#1f2937" strokeWidth="2" />  {/* Y axis Flow */}
            
            {/* Spirometry Loop */}
            <path d={loopPath} fill="rgba(34, 197, 94, 0.08)" stroke="#16a34a" strokeWidth="3" className="transition-all duration-300" />
            
            <text x="350" y="255" className="text-[9px] font-bold">Vol (L)</text>
            <text x="12" y="30" className="text-[9px] font-bold rotate-90 origin-left">Flow (L/s)</text>
          </svg>
        </div>

        {/* Clinical Note */}
        <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex gap-2">
          <InformationCircleIcon className="w-5 h-5 text-emerald-700 shrink-0" />
          <p className="text-xs text-emerald-850 leading-normal">{clinicalPearl}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white border-3 border-neutral-800 rounded-2xl p-4 space-y-4">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">Select Pathology Mode</span>
          <div className="flex flex-col gap-2">
            {[
              { id: 'normal', name: 'Normal Spirometry' },
              { id: 'obstructive', name: 'Obstructive (Asthma/COPD)' },
              { id: 'restrictive', name: 'Restrictive (Fibrosis)' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMode(item.id as SpiroMode)}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-left ${
                  mode === item.id
                    ? 'bg-emerald-600 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Lung Metrics */}
        <div className="pt-3 border-t border-neutral-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">FEV1</span>
            <span className="font-mono font-bold text-neutral-900">{fev1}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">FVC</span>
            <span className="font-mono font-bold text-neutral-900">{fvc}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">FEV1 / FVC Ratio</span>
            <span className="font-mono font-bold text-emerald-700">{ratio}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Total Lung Cap. (TLC)</span>
            <span className="font-mono font-bold text-neutral-900">{tlc}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
