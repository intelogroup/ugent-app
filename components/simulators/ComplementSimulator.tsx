'use client';

import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type CompDef = 'none' | 'c1-est' | 'c3' | 'c5-c9' | 'daf';

export default function ComplementSimulator() {
  const [deficiency, setDeficiency] = useState<CompDef>('none');

  let activeOutput = 'MAC Complex fully functional';
  let clinicalPearl = 'Complement cascade uses classic, alternative, and lectin pathways to clear pathogens and trigger inflammation.';
  let visualState = 'MAC Active';

  switch (deficiency) {
    case 'c1-est':
      activeOutput = 'Hereditary Angioedema (High Bradykinin)';
      clinicalPearl = 'C1 esterase inhibitor deficiency causes unregulated activation of kallikrein, yielding elevated bradykinin. Characterized by recurrent angioedema. Avoid ACE inhibitors.';
      visualState = 'C1 Inhibitor Def';
      break;
    case 'c3':
      activeOutput = 'Recurrent Pyogenic Infections / Type III HSR';
      clinicalPearl = 'C3 deficiency prevents opsonization (C3b) and clearance of immune complexes. Increases risk of severe infections with S. pneumoniae, H. influenzae, and glomerulonephritis.';
      visualState = 'C3 Def';
      break;
    case 'c5-c9':
      activeOutput = 'Neisseria Bacteremia Susceptibility';
      clinicalPearl = 'C5-C9 deficiency blocks Membrane Attack Complex (MAC) formation. Inability to lyse thin-walled bacteria. Presents as recurrent, disseminated Neisseria infections.';
      visualState = 'MAC Blocked';
      break;
    case 'daf':
      activeOutput = 'Paroxysmal Nocturnal Hemoglobinuria (PNH)';
      clinicalPearl = 'Decay-Accelerating Factor (DAF/CD59) anchors fail due to PIGA gene mutation. Complement-mediated lysis of red cells leads to intravascular hemolytic anemia, dark urine, and thrombosis.';
      visualState = 'PNH Lysis';
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#FAF5FF] border-4 border-neutral-800 rounded-[30px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-neutral-900 font-['Fredoka']">Complement Cascade &amp; Immunodeficiencies</h3>
        <p className="text-neutral-600 text-xs mt-1">Simulate complement pathway triggers, regulatory proteins, and clinical deficiency syndromes.</p>
      </div>

      {/* Pathway Display */}
      <div className="lg:col-span-2 bg-white border-3 border-neutral-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
        <div className="relative border border-neutral-200 bg-neutral-50/50 rounded-xl p-4 flex flex-col justify-center items-center h-44 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-neutral-800 bg-purple-100 flex items-center justify-center font-bold text-xs mb-2">
            {visualState}
          </div>
          <span className="text-xs font-bold text-neutral-700">Complement State:</span>
          <span className="text-sm font-bold text-purple-900 font-mono mt-1">{activeOutput}</span>
        </div>

        {/* Clinical Note */}
        <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-200 flex gap-2">
          <InformationCircleIcon className="w-5 h-5 text-purple-700 shrink-0" />
          <p className="text-xs text-purple-850 leading-normal">{clinicalPearl}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white border-3 border-neutral-800 rounded-2xl p-4 space-y-4">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">Select Deficiency State</span>
          <div className="flex flex-col gap-2">
            {[
              { id: 'none', name: 'Normal / Intact' },
              { id: 'c1-est', name: 'C1 Esterase Inhib. Def.' },
              { id: 'c3', name: 'C3 Deficiency' },
              { id: 'c5-c9', name: 'C5-C9 Deficiency' },
              { id: 'daf', name: 'DAF/CD59 Def. (PNH)' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setDeficiency(item.id as CompDef)}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-left ${
                  deficiency === item.id
                    ? 'bg-purple-650 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
