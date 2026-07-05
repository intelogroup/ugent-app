'use client';

import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type Diuretic = 'none' | 'acetazolamide' | 'loop' | 'thiazide' | 'k-sparing';

export default function NephronSimulator() {
  const [diuretic, setDiuretic] = useState<Diuretic>('none');

  // Blood/Urine electrolyte logic based on selected diuretic
  let urineNa = 'Normal';
  let urineK = 'Normal';
  let urineCa = 'Normal';
  let bloodpH = 'Normal (7.40)';
  let clinicalMnemonic = 'Select a diuretic to view USMLE clinical correlations.';

  switch (diuretic) {
    case 'acetazolamide':
      urineNa = '▲ High (Moderate)';
      urineK = '▲ High';
      urineCa = 'Normal';
      bloodpH = '▼ Acidosis (Non-gap metabolic)';
      clinicalMnemonic = 'Acetazolamide inhibits Carbonic Anhydrase in PCT. Prevents HCO3- reabsorption. Leads to proximal renal tubular acidosis (Type 2 RTA).';
      break;
    case 'loop':
      urineNa = '▲▲ Very High';
      urineK = '▲ High';
      urineCa = '▲ High (Causes Hypocalcemia)';
      bloodpH = '▲ Alkalosis (Metabolic)';
      clinicalMnemonic = 'Loops (Furosemide) block Na-K-2Cl cotransporter in TAL. Abolish lumen-positive potential, causing Ca2+ and Mg2+ loss in urine ("Loops Lose Calcium").';
      break;
    case 'thiazide':
      urineNa = '▲ High';
      urineK = '▲ High';
      urineCa = '▼ Low (Causes Hypercalcemia)';
      bloodpH = '▲ Alkalosis (Metabolic)';
      clinicalMnemonic = 'Thiazides block Na-Cl cotransporter in DCT. Enhance distal Ca2+ reabsorption, saving calcium ("Thiazides preserve Calcium").';
      break;
    case 'k-sparing':
      urineNa = '▲ High (Mild)';
      urineK = '▼ Low (Saves Potassium)';
      urineCa = 'Normal';
      bloodpH = '▼ Acidosis (Metabolic)';
      clinicalMnemonic = 'K-sparing agents (Spironolactone, Amiloride) block ENaC or aldosterone in CD. Prevents K+ and H+ secretion. Watch for hyperkalemia.';
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#FEFCE8] border-4 border-neutral-800 rounded-[30px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-neutral-900 font-['Fredoka']">Nephron Transport &amp; Diuretics Lab</h3>
        <p className="text-neutral-600 text-xs mt-1">Simulate nephron segment transporters and the systemic electrolyte impact of major diuretic classes.</p>
      </div>

      {/* Main visual display */}
      <div className="lg:col-span-2 bg-white border-3 border-neutral-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
        {/* Schematic Nephron */}
        <div className="relative border border-neutral-200 bg-neutral-50/50 rounded-xl p-4 flex justify-around items-center">
          <div className={`p-2.5 rounded-lg border-2 text-center text-xs font-bold ${diuretic === 'acetazolamide' ? 'bg-yellow-250 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}>
            <span>PCT</span>
            <span className="block text-[8px] text-neutral-500 font-normal">Na/HCO3 Reabs</span>
            {diuretic === 'acetazolamide' && <span className="block text-[8px] text-red-600 font-bold">BLOCKED</span>}
          </div>
          <div className={`p-2.5 rounded-lg border-2 text-center text-xs font-bold ${diuretic === 'loop' ? 'bg-yellow-250 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}>
            <span>TAL</span>
            <span className="block text-[8px] text-neutral-500 font-normal">Na-K-2Cl</span>
            {diuretic === 'loop' && <span className="block text-[8px] text-red-600 font-bold">BLOCKED</span>}
          </div>
          <div className={`p-2.5 rounded-lg border-2 text-center text-xs font-bold ${diuretic === 'thiazide' ? 'bg-yellow-250 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}>
            <span>DCT</span>
            <span className="block text-[8px] text-neutral-500 font-normal">Na-Cl</span>
            {diuretic === 'thiazide' && <span className="block text-[8px] text-red-600 font-bold">BLOCKED</span>}
          </div>
          <div className={`p-2.5 rounded-lg border-2 text-center text-xs font-bold ${diuretic === 'k-sparing' ? 'bg-yellow-250 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}>
            <span>CD</span>
            <span className="block text-[8px] text-neutral-500 font-normal">ENaC / Aldost</span>
            {diuretic === 'k-sparing' && <span className="block text-[8px] text-red-600 font-bold">BLOCKED</span>}
          </div>
        </div>

        {/* Clinical notes card */}
        <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex gap-2">
          <InformationCircleIcon className="w-5 h-5 text-amber-700 shrink-0" />
          <p className="text-xs text-amber-850 leading-normal">{clinicalMnemonic}</p>
        </div>
      </div>

      {/* Control panel */}
      <div className="bg-white border-3 border-neutral-800 rounded-2xl p-4 space-y-4">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">Select Diuretic Agent</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'none', name: 'Baseline' },
              { id: 'acetazolamide', name: 'Acetazolamide' },
              { id: 'loop', name: 'Loop Diuretic' },
              { id: 'thiazide', name: 'Thiazide' },
              { id: 'k-sparing', name: 'K-Sparing' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setDiuretic(item.id as Diuretic)}
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all text-center ${
                  diuretic === item.id
                    ? 'bg-yellow-600 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Outcome Metrics */}
        <div className="pt-3 border-t border-neutral-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Urine Sodium (Na+)</span>
            <span className="font-mono font-bold text-neutral-900">{urineNa}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Urine Potassium (K+)</span>
            <span className="font-mono font-bold text-neutral-900">{urineK}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Urine Calcium (Ca2+)</span>
            <span className="font-mono font-bold text-neutral-900">{urineCa}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Blood pH (Acid-Base)</span>
            <span className="font-mono font-bold text-neutral-900">{bloodpH}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
