'use client';

import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type Toxin = 'none' | 'diphtheria' | 'cholera' | 'pertussis' | 'tetanus' | 'botulinum' | 'tsst1';

export default function BacterialToxinSimulator() {
  const [toxin, setToxin] = useState<Toxin>('none');

  let targetMolecule = 'Baseline';
  let intracellularImpact = 'Normal homeostasis';
  let clinicalPearl = 'Bacterial toxins are split into ADP-ribosylating A-B toxins, cell-membrane disruptors, superantigens, and protease cleavers.';
  let visualState = 'No Toxin';

  switch (toxin) {
    case 'diphtheria':
      targetMolecule = 'Elongation Factor 2 (EF-2)';
      intracellularImpact = 'ADP-ribosylation inhibits EF-2 → halts protein synthesis';
      clinicalPearl = 'Diphtheria toxin (and Pseudomonas Exotoxin A) ADP-ribosylates EF-2. Causes pharyngeal pseudomembranes and myocarditis.';
      visualState = 'EF-2 Blocked';
      break;
    case 'cholera':
      targetMolecule = 'Gs Alpha Subunit';
      intracellularImpact = 'Constitutive Gs activation → cAMP ▲ → water secretion into gut';
      clinicalPearl = 'Vibrio cholerae toxin ADP-ribosylates Gs, keeping it constitutively active. Intestinal crypt cells pump out Cl- and water, producing "rice-water" diarrhea.';
      visualState = 'Gs Locked On';
      break;
    case 'pertussis':
      targetMolecule = 'Gi Alpha Subunit';
      intracellularImpact = 'ADP-ribosylation disables Gi → cAMP ▲ → blocks immune cells';
      clinicalPearl = 'Bordetella pertussis toxin ADP-ribosylates and disables Gi. Leads to lymphocytosis, whooping cough, and histamine sensitivity.';
      visualState = 'Gi Locked Off';
      break;
    case 'tetanus':
      targetMolecule = 'SNARE proteins (Synaptobrevin)';
      intracellularImpact = 'Cleaves SNARE in Renshaw inhibitory cells → blocks GABA/Glycine';
      clinicalPearl = 'Clostridium tetani toxin travels retrogradely. Cleaves SNARE to block release of inhibitory neurotransmitters (GABA/Glycine) → spastic paralysis (lockjaw/trismus).';
      visualState = 'SNARE Cleaved';
      break;
    case 'botulinum':
      targetMolecule = 'SNARE proteins (Synaptobrevin)';
      intracellularImpact = 'Cleaves SNARE at neuromuscular junction → blocks Acetylcholine';
      clinicalPearl = 'Clostridium botulinum toxin cleaves SNARE at stimulatory motor neurons, blocking Acetylcholine release → flaccid paralysis ("floppy baby").';
      visualState = 'SNARE Cleaved';
      break;
    case 'tsst1':
      targetMolecule = 'MHC Class II & T-Cell Receptor (TCR) Beta chain';
      intracellularImpact = 'Crosslinks variable beta chain to MHC II → cytokine storm';
      clinicalPearl = 'Staph aureus TSST-1 is a superantigen. Bypasses antigen processing, triggering massive release of IFN-gamma and IL-2 → toxic shock syndrome.';
      visualState = 'Superantigen';
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#ECFDF5] border-4 border-neutral-800 rounded-[30px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-neutral-900 font-['Fredoka']">Bacterial Toxins &amp; Mechanisms Lab</h3>
        <p className="text-neutral-600 text-xs mt-1">Simulate molecular action of virulence factors: ADP-ribosylation, superantigens, and SNARE proteases.</p>
      </div>

      {/* Main visual display */}
      <div className="lg:col-span-2 bg-white border-3 border-neutral-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
        <div className="relative border border-neutral-200 bg-neutral-50/50 rounded-xl p-4 flex flex-col justify-center items-center h-44 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-neutral-800 bg-emerald-100 flex items-center justify-center font-bold text-xs mb-2">
            {visualState}
          </div>
          <span className="text-xs font-bold text-neutral-700">Target Macromolecule:</span>
          <span className="text-sm font-bold text-emerald-900 font-mono mt-1">{targetMolecule}</span>
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
          <span className="text-xs font-bold text-neutral-700 block mb-2">Select Virulence Toxin</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'none', name: 'Baseline' },
              { id: 'diphtheria', name: 'Diphtheria Toxin' },
              { id: 'cholera', name: 'Cholera Toxin' },
              { id: 'pertussis', name: 'Pertussis Toxin' },
              { id: 'tetanus', name: 'Tetanus Toxin' },
              { id: 'botulinum', name: 'Botulinum Toxin' },
              { id: 'tsst1', name: 'TSST-1 Superant.' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setToxin(item.id as Toxin)}
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all text-center ${
                  toxin === item.id
                    ? 'bg-emerald-650 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Molecular Outcomes */}
        <div className="pt-3 border-t border-neutral-200 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="font-bold text-neutral-500">Intracellular Impact</span>
            <span className="font-mono font-bold text-neutral-900 text-right">{intracellularImpact}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
