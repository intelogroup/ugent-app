'use client';

import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type CascadeState = 'normal' | 'hemo-a' | 'hemo-b' | 'hemo-c' | 'heparin' | 'warfarin';

export default function CoagulationSimulator() {
  const [state, setState] = useState<CascadeState>('normal');

  let ptText = 'Normal (~11-13s)';
  let pttText = 'Normal (~25-35s)';
  let clinicalPearl = 'Normal coagulation cascade active. Platelets and clotting factors function in equilibrium.';

  switch (state) {
    case 'hemo-a':
      pttText = '▲ Prolonged';
      clinicalPearl = 'Hemophilia A is an X-linked recessive deficiency of Factor VIII. Intrinsic pathway delayed; PTT is prolonged. PT remains normal.';
      break;
    case 'hemo-b':
      pttText = '▲ Prolonged';
      clinicalPearl = 'Hemophilia B (Christmas Disease) is an X-linked recessive deficiency of Factor IX. Prolongs PTT. Treatment requires Factor IX replacement.';
      break;
    case 'hemo-c':
      pttText = '▲ Prolonged';
      clinicalPearl = 'Hemophilia C is an autosomal codominant deficiency of Factor XI. Most common in Ashkenazi Jews. Prolongs PTT.';
      break;
    case 'heparin':
      pttText = '▲▲ Markedly Prolonged';
      ptText = '▲ Prolonged (Mild)';
      clinicalPearl = 'Heparin activates Antithrombin III, which primarily inactivates Factor IIa (Thrombin) and Factor Xa. Prolongs PTT significantly. Monitor with PTT.';
      break;
    case 'warfarin':
      ptText = '▲▲ Markedly Prolonged';
      pttText = '▲ Prolonged (Mild)';
      clinicalPearl = 'Warfarin inhibits Vitamin K Epoxide Reductase (VKORC1), blocking synthesis of Factors II, VII, IX, X, and Proteins C/S. VII has the shortest half-life, so PT/INR prolongs first and most. Monitor with PT/INR.';
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#FEF2F2] border-4 border-neutral-800 rounded-[30px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-neutral-900 font-['Fredoka']">Coagulation Cascade Lab</h3>
        <p className="text-neutral-600 text-xs mt-1">Simulate clotting factor deficiencies and anticoagulant therapy. Interpret PT and PTT shifts.</p>
      </div>

      {/* Main Visual Pathway */}
      <div className="lg:col-span-2 bg-white border-3 border-neutral-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
        <div className="relative border border-neutral-200 bg-neutral-50/50 rounded-xl p-4 flex flex-col gap-4 text-xs font-mono text-center">
          {/* Intrinsic vs Extrinsic */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
              <span className="font-bold text-indigo-900 block font-sans">Intrinsic Pathway (PTT)</span>
              <div className="mt-1 flex justify-around">
                <span className={state === 'hemo-c' ? 'text-red-500 line-through font-bold' : ''}>XII → XI</span>
                <span className={state === 'hemo-b' ? 'text-red-500 line-through font-bold' : ''}>IX</span>
                <span className={state === 'hemo-a' ? 'text-red-500 line-through font-bold' : ''}>VIII</span>
              </div>
            </div>
            
            <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="font-bold text-orange-900 block font-sans">Extrinsic Pathway (PT)</span>
              <div className="mt-1 flex justify-center">
                <span className={state === 'warfarin' ? 'text-red-500 line-through font-bold' : ''}>TF + VII</span>
              </div>
            </div>
          </div>

          {/* Common Pathway */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg max-w-sm mx-auto w-full">
            <span className="font-bold text-red-900 block font-sans">Common Pathway</span>
            <div className="mt-2 flex justify-around">
              <span className={state === 'warfarin' ? 'text-red-500 line-through font-bold' : ''}>Xa</span>
              <span>→</span>
              <span className={(state === 'heparin' || state === 'warfarin') ? 'text-red-500 line-through font-bold' : ''}>IIa (Thrombin)</span>
              <span>→</span>
              <span>Ia (Fibrin)</span>
            </div>
          </div>
        </div>

        {/* Clinical Note */}
        <div className="mt-4 p-3 bg-red-50/50 rounded-xl border border-red-200 flex gap-2">
          <InformationCircleIcon className="w-5 h-5 text-red-700 shrink-0" />
          <p className="text-xs text-red-900 leading-normal">{clinicalPearl}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white border-3 border-neutral-800 rounded-2xl p-4 space-y-4">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">Select Pathology / Therapy</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'normal', name: 'Normal' },
              { id: 'hemo-a', name: 'Hemophilia A' },
              { id: 'hemo-b', name: 'Hemophilia B' },
              { id: 'hemo-c', name: 'Hemophilia C' },
              { id: 'heparin', name: 'Unfrac. Heparin' },
              { id: 'warfarin', name: 'Warfarin' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setState(item.id as CascadeState)}
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all text-center ${
                  state === item.id
                    ? 'bg-red-650 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Lab Metrics */}
        <div className="pt-3 border-t border-neutral-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Prothrombin Time (PT)</span>
            <span className="font-mono font-bold text-neutral-900">{ptText}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Partial Thromboplastin Time (PTT)</span>
            <span className="font-mono font-bold text-neutral-900">{pttText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
