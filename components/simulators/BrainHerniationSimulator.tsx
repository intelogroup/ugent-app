'use client';

import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type Herniation = 'none' | 'subfalcine' | 'uncal' | 'tonsillar';

export default function BrainHerniationSimulator() {
  const [mode, setMode] = useState<Herniation>('none');

  let clinicalPearl = 'Intracranial pressure (ICP) rise pushes brain parenchyma across rigid dural folds.';
  let compressedStructure = 'None';
  let symptomText = 'Normal mental status, pupil symmetric.';
  let visualState = 'ICP Normal';

  switch (mode) {
    case 'subfalcine':
      compressedStructure = 'Cingulate Gyrus beneath Falx Cerebri';
      symptomText = 'Contralateral lower limb weakness (ACA compression)';
      visualState = 'Falx Shift';
      clinicalPearl = 'Subfalcine herniation pushes the cingulate gyrus under the falx cerebri. Can compress the Anterior Cerebral Artery (ACA) leading to lower extremity motor deficit.';
      break;
    case 'uncal':
      compressedStructure = 'Medial Temporal Lobe (Uncus) over Tentorium Cerebelli';
      symptomText = 'Ipsilateral blown pupil (CN III), contralateral hemiparesis, PCA stroke';
      visualState = 'Tentorial Shift';
      clinicalPearl = 'Uncal herniation compresses CN III (blown pupil, "down and out"), the PCA (occipital lobe infarction), and the contralateral crus cerebri (causing ipsilateral hemiparesis via Kernohan notch).';
      break;
    case 'tonsillar':
      compressedStructure = 'Cerebellar Tonsils through Foramen Magnum';
      symptomText = 'Coma, cardiorespiratory arrest, death';
      visualState = 'Foramen Magnum Shift';
      clinicalPearl = 'Tonsillar herniation forces cerebellar tonsils into the foramen magnum. Compresses the brainstem medulla leading to respiratory depression and death.';
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#FFF7ED] border-4 border-neutral-800 rounded-[30px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-neutral-900 font-['Fredoka']">Brain Herniation &amp; Meninges Lab</h3>
        <p className="text-neutral-600 text-xs mt-1">Simulate dural shift patterns and identify key cranial nerve/vessel compressions tested on Step 1.</p>
      </div>

      {/* Main visual display */}
      <div className="lg:col-span-2 bg-white border-3 border-neutral-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
        <div className="relative border border-neutral-200 bg-neutral-50/50 rounded-xl p-4 flex flex-col justify-center items-center h-44 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-neutral-800 bg-orange-100 flex items-center justify-center font-bold text-xs mb-2">
            {visualState}
          </div>
          <span className="text-xs font-bold text-neutral-700">Compressed Structure:</span>
          <span className="text-sm font-bold text-orange-900 font-mono mt-1">{compressedStructure}</span>
        </div>

        {/* Clinical Note */}
        <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-200 flex gap-2">
          <InformationCircleIcon className="w-5 h-5 text-orange-700 shrink-0" />
          <p className="text-xs text-orange-850 leading-normal">{clinicalPearl}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white border-3 border-neutral-800 rounded-2xl p-4 space-y-4">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">Select Herniation Mode</span>
          <div className="flex flex-col gap-2">
            {[
              { id: 'none', name: 'ICP Baseline' },
              { id: 'subfalcine', name: 'Subfalcine Herniation' },
              { id: 'uncal', name: 'Uncal Herniation' },
              { id: 'tonsillar', name: 'Tonsillar Herniation' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMode(item.id as Herniation)}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-left ${
                  mode === item.id
                    ? 'bg-orange-650 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Clinical Symptom Outcomes */}
        <div className="pt-3 border-t border-neutral-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Clinical Signs</span>
            <span className="font-mono font-bold text-neutral-900 text-right">{symptomText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
