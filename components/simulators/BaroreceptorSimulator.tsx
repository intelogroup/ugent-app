'use client';

import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type Drug = 'none' | 'phenylephrine' | 'norepinephrine' | 'epinephrine' | 'atropine';

export default function BaroreceptorSimulator() {
  const [drug, setDrug] = useState<Drug>('none');

  let mapVal = '93 mmHg (Normal)';
  let hrVal = '72 bpm (Normal)';
  let tprVal = 'Normal';
  let reflexState = 'Steady-state active';
  let clinicalPearl = 'Baroreceptors in carotid sinus (CN IX) and aortic arch (CN X) monitor stretch to modulate autonomic output.';

  switch (drug) {
    case 'phenylephrine':
      mapVal = '▲▲ 120 mmHg';
      hrVal = '▼▼ 48 bpm (Reflex Bradycardia)';
      tprVal = '▲▲ High (Severe Vasoconstriction)';
      reflexState = 'Vagal / Parasympathetic Active';
      clinicalPearl = 'Phenylephrine is a selective α1 agonist. Causes vasoconstriction (MAP ▲) → triggers stretch receptors → reflex increase in vagal tone → bradycardia (HR ▼).';
      break;
    case 'norepinephrine':
      mapVal = '▲▲ 115 mmHg';
      hrVal = '▼ 58 bpm (Reflex Bradycardia)';
      tprVal = '▲▲ High (Vasoconstriction)';
      reflexState = 'Vagal Reflex blunts Beta-1 drive';
      clinicalPearl = 'Norepinephrine stimulates α1 (vasoconstriction) and β1 (heart rate). The severe vasoconstriction triggers a vagal reflex that overrides direct β1 direct stimulation, causing net bradycardia.';
      break;
    case 'epinephrine':
      mapVal = '▲ 105 mmHg';
      hrVal = '▲▲ 95 bpm (Tachycardia)';
      tprVal = '▼ Low-Normal (Beta-2 vasodilation balances Alpha-1)';
      reflexState = 'Direct Beta-1 dominates';
      clinicalPearl = 'Epinephrine stimulates β1 (HR ▲), β2 (vasodilation), and α1. HR increases directly because β1 stimulation overrides reflex tone, and pulse pressure widens.';
      break;
    case 'atropine':
      mapVal = '▲ 98 mmHg';
      hrVal = '▲▲ 110 bpm (Tachycardia)';
      tprVal = 'Normal';
      reflexState = 'Vagal Tone Blocked';
      clinicalPearl = 'Atropine blocks M2 receptors on SA node, removing parasympathetic brake. HR increases. Useful for symptomatic bradycardia.';
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#F0FDFA] border-4 border-neutral-800 rounded-[30px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-neutral-900 font-['Fredoka']">Baroreceptor Reflex &amp; Vasoactive Drugs</h3>
        <p className="text-neutral-600 text-xs mt-1">Simulate arterial baroreceptor feedback loops and direct vs. reflex responses to autonomic drugs.</p>
      </div>

      {/* Visual Autonomic loop */}
      <div className="lg:col-span-2 bg-white border-3 border-neutral-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
        <div className="relative border border-neutral-200 bg-neutral-50/50 rounded-xl p-4 flex flex-col justify-center items-center h-44 text-center">
          <div className="w-14 h-14 rounded-full border-2 border-neutral-800 bg-teal-100 flex items-center justify-center font-bold text-xs mb-2">
            {reflexState}
          </div>
          <span className="text-xs font-bold text-neutral-700">Autonomic Nerve Output:</span>
          <span className="text-sm font-bold text-teal-900 font-mono mt-1">Reflex State: {reflexState}</span>
        </div>

        {/* Clinical Note */}
        <div className="mt-4 p-3 bg-teal-50 rounded-xl border border-teal-200 flex gap-2">
          <InformationCircleIcon className="w-5 h-5 text-teal-700 shrink-0" />
          <p className="text-xs text-teal-850 leading-normal">{clinicalPearl}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white border-3 border-neutral-800 rounded-2xl p-4 space-y-4">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">Inject Vasoactive Agent</span>
          <div className="flex flex-col gap-2">
            {[
              { id: 'none', name: 'Baseline Control' },
              { id: 'phenylephrine', name: 'Phenylephrine (Pure Alpha-1)' },
              { id: 'norepinephrine', name: 'Norepinephrine (Alpha & Beta)' },
              { id: 'epinephrine', name: 'Epinephrine' },
              { id: 'atropine', name: 'Atropine (M2 Antagonist)' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setDrug(item.id as Drug)}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-left ${
                  drug === item.id
                    ? 'bg-teal-650 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Hemodynamic Metrics */}
        <div className="pt-3 border-t border-neutral-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Mean Arterial Pressure (MAP)</span>
            <span className="font-mono font-bold text-neutral-900">{mapVal}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Heart Rate (HR)</span>
            <span className="font-mono font-bold text-neutral-900">{hrVal}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Systemic Resistance (TPR)</span>
            <span className="font-mono font-bold text-teal-700">{tprVal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
