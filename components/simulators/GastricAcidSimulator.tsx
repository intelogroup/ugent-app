'use client';

import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type AcidTherapy = 'none' | 'ppi' | 'h2-blocker' | 'atropine' | 'octreotide';

export default function GastricAcidSimulator() {
  const [therapy, setTherapy] = useState<AcidTherapy>('none');

  let pHVal = '1.5 (Highly Acidic)';
  let pumpActivity = '100% (Normal)';
  let activeReceptors = 'H2 (Gs), M3 (Gq), CCK2 (Gq) Active';
  let clinicalPearl = 'Parietal cells secrete H+ via the H+/K+ ATPase proton pump in response to Histamine, Gastrin, and Acetylcholine.';

  switch (therapy) {
    case 'ppi':
      pHVal = '4.5 (Suppressed)';
      pumpActivity = '5% (Irreversible inhibition)';
      activeReceptors = 'Receptors Active but Pump Blocked';
      clinicalPearl = 'Proton Pump Inhibitors (Omeprazole) irreversibly block the H+/K+ ATPase pump. Most potent suppressor of gastric acid secretion.';
      break;
    case 'h2-blocker':
      pHVal = '3.0 (Partially Suppressed)';
      pumpActivity = '40% (Reduced)';
      activeReceptors = 'M3, CCK2 Active; H2 Blocked';
      clinicalPearl = 'H2-receptor antagonists (Cimetidine) block Histamine. Reduces both basal and food-stimulated acid secretion.';
      break;
    case 'atropine':
      pHVal = '2.2 (Mild suppression)';
      pumpActivity = '80% (Mildly reduced)';
      activeReceptors = 'H2, CCK2 Active; M3 Blocked';
      clinicalPearl = 'Atropine blocks M3 receptors, preventing direct vagal stimulation of parietal cells. Minimal therapeutic use for acid suppression due to side effects.';
      break;
    case 'octreotide':
      pHVal = '3.8 (Suppressed)';
      pumpActivity = '20% (Low)';
      activeReceptors = 'H2, M3, CCK2 inhibited via Gi';
      clinicalPearl = 'Octreotide (Somatostatin analog) activates Gi to directly inhibit Adenylyl Cyclase in parietal cells and suppress ECL/G-cell hormone release.';
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#FEF3C7] border-4 border-neutral-800 rounded-[30px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-neutral-900 font-['Fredoka']">Parietal Cell Gastric Acid Lab</h3>
        <p className="text-neutral-600 text-xs mt-1">Simulate parietal cell receptors, intracellular messengers (cAMP, IP3), and pharmacological pump blockers.</p>
      </div>

      {/* Main Parietal Cell Visual */}
      <div className="lg:col-span-2 bg-white border-3 border-neutral-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
        <div className="relative border border-neutral-200 bg-neutral-50/50 rounded-xl p-4 flex flex-col justify-center items-center h-44 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-neutral-800 bg-amber-100 flex items-center justify-center font-bold text-xs mb-2">
            pH: {pHVal.split(' ')[0]}
          </div>
          <span className="text-xs font-bold text-neutral-700">Proton Pump H+/K+ ATPase State:</span>
          <span className="text-sm font-bold text-amber-900 font-mono mt-1">{pumpActivity}</span>
        </div>

        {/* Clinical Note */}
        <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex gap-2">
          <InformationCircleIcon className="w-5 h-5 text-amber-700 shrink-0" />
          <p className="text-xs text-amber-850 leading-normal">{clinicalPearl}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white border-3 border-neutral-800 rounded-2xl p-4 space-y-4">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">Select Gastric Therapy</span>
          <div className="flex flex-col gap-2">
            {[
              { id: 'none', name: 'Baseline Stimulation' },
              { id: 'ppi', name: 'PPI (Omeprazole)' },
              { id: 'h2-blocker', name: 'H2 Blocker (Cimetidine)' },
              { id: 'atropine', name: 'Antimuscarinic (Atropine)' },
              { id: 'octreotide', name: 'Octreotide (Somatostatin)' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTherapy(item.id as AcidTherapy)}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-left ${
                  therapy === item.id
                    ? 'bg-amber-650 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Acid Secretion Metrics */}
        <div className="pt-3 border-t border-neutral-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Gastric Lumen pH</span>
            <span className="font-mono font-bold text-neutral-900">{pHVal}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Intracellular Status</span>
            <span className="font-mono font-bold text-amber-700 text-right">{activeReceptors}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
