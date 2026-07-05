'use client';

import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

type Pathway = 'camp-gs' | 'camp-gi' | 'ip3-gq' | 'rtk' | 'jak-stat' | 'nuclear';

export default function SecondMessengerSimulator() {
  const [pathway, setPathway] = useState<Pathway>('camp-gs');

  let activeMessenger = 'cAMP (Gs)';
  let clinicalPearl = 'cAMP is upregulated. Activates Protein Kinase A (PKA). Used by TSH, LH, FSH, Glucagon, ACTH, and Beta-adrenergic receptors.';
  let visualState = 'cAMP Up';

  switch (pathway) {
    case 'camp-gs':
      activeMessenger = 'cAMP (Gs)';
      clinicalPearl = 'Gs path: Adénylyl Cyclase converts ATP to cAMP → upregulates PKA. Promoted by Gs signaling (e.g. epinephrine on β1/β2).';
      visualState = 'cAMP ▲';
      break;
    case 'camp-gi':
      activeMessenger = 'cAMP (Gi)';
      clinicalPearl = 'Gi path: Inhibits Adenylyl Cyclase → decreases intracellular cAMP. Triggered by α2-adrenergic receptors, M2 receptors, D2 receptors.';
      visualState = 'cAMP ▼';
      break;
    case 'ip3-gq':
      activeMessenger = 'IP3 & DAG (Gq)';
      clinicalPearl = 'Gq path: Phospholipase C (PLC) cleaves PIP2 into IP3 and DAG. IP3 triggers Ca2+ release from ER. Mnemonic: "HAV 1 M&M" (H1, alpha1, V1, M1, M3).';
      visualState = 'Ca2+ / DAG ▲';
      break;
    case 'rtk':
      activeMessenger = 'Receptor Tyrosine Kinase (MAPK/PI3K)';
      clinicalPearl = 'RTK path: Autophosphorylation of tyrosine residues triggers Ras/MAPK or PI3K/Akt pathways. Used by Insulin, IGF-1, FGF, PDGF.';
      visualState = 'Tyrosine-P ▲';
      break;
    case 'jak-stat':
      activeMessenger = 'JAK/STAT Pathway';
      clinicalPearl = 'JAK/STAT path: Receptor binds ligand, recruits JAKs, phosphorylates STATs. STATs dimerize and enter nucleus. Used by Prolactin, Growth Hormone, EPO, G-CSF.';
      visualState = 'STAT Dimer ▲';
      break;
    case 'nuclear':
      activeMessenger = 'Intracellular Receptor (Zinc Finger)';
      clinicalPearl = 'Nuclear/Cytoplasmic receptors act directly as transcription factors binding DNA via Zinc Fingers. Used by Steroids (Cortisol, Aldosterone), Thyroid Hormone (T3/T4), Vitamin D.';
      visualState = 'DNA Binding';
      break;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#EEF2FF] border-4 border-neutral-800 rounded-[30px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold text-neutral-900 font-['Fredoka']">Endocrine Second Messengers Lab</h3>
        <p className="text-neutral-600 text-xs mt-1">Map extracellular hormones to their intracellular cascades. Master high-yield second messenger associations.</p>
      </div>

      {/* Main Visual Cascade */}
      <div className="lg:col-span-2 bg-white border-3 border-neutral-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px]">
        <div className="relative border border-neutral-200 bg-neutral-50/50 rounded-xl p-4 flex flex-col justify-center items-center h-44 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-neutral-800 bg-indigo-100 flex items-center justify-center font-bold text-xs font-mono mb-2">
            {visualState}
          </div>
          <span className="text-xs font-bold text-neutral-700">Active Intracellular Signal:</span>
          <span className="text-sm font-bold text-indigo-900 font-mono mt-1">{activeMessenger}</span>
        </div>

        {/* Clinical Notes */}
        <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex gap-2">
          <InformationCircleIcon className="w-5 h-5 text-indigo-700 shrink-0" />
          <p className="text-xs text-indigo-850 leading-normal">{clinicalPearl}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white border-3 border-neutral-800 rounded-2xl p-4 space-y-4">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">Select Signaling Cascade</span>
          <div className="space-y-1.5">
            {[
              { id: 'camp-gs', name: 'Gs Pathway (cAMP Up)' },
              { id: 'camp-gi', name: 'Gi Pathway (cAMP Down)' },
              { id: 'ip3-gq', name: 'Gq Pathway (PLC / IP3)' },
              { id: 'rtk', name: 'Receptor Tyrosine Kinase' },
              { id: 'jak-stat', name: 'JAK / STAT (Prolactin/GH)' },
              { id: 'nuclear', name: 'Intracellular (Steroids/T3)' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPathway(item.id as Pathway)}
                className={`w-full py-2 px-3 text-xs font-bold rounded-lg border transition-all text-left ${
                  pathway === item.id
                    ? 'bg-indigo-600 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
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
