'use client';

import React, { useState } from 'react';
import { AcademicCapIcon } from '@heroicons/react/24/outline';

type AssetKey = 'mitochondria' | 'dna_double_helix' | 'receptor_ligand' | 'membrane';

const ASSET_DETAILS: Record<AssetKey, { title: string; source: string; desc: string; size: string; paths: number }> = {
  mitochondria: {
    title: 'Mitochondrion Organelle',
    source: 'Bioicons (by jaiganesh, CC0)',
    desc: 'A simple flat 2D mitochondrion silhouette showing outer membrane and inner cristae loops.',
    size: '9.5 KB',
    paths: 2,
  },
  dna_double_helix: {
    title: 'DNA Double Helix',
    source: 'Bioicons (by James-Lloyd, CC0)',
    desc: 'A detailed structural model of B-DNA showing the minor and major grooves with chemical sugar-phosphate backbones.',
    size: '137 KB',
    paths: 86,
  },
  receptor_ligand: {
    title: 'Transmembrane Receptor & Ligand (GPCR)',
    source: 'Bioicons (by Servier, CC BY 3.0)',
    desc: 'A multi-pass transmembrane protein with custom gradients representing receptor domains embedded in a lipid bilayer.',
    size: '174 KB',
    paths: 467,
  },
  membrane: {
    title: 'Detailed Phospholipid Membrane',
    source: 'Bioicons (by Helicase_11, CC BY 4.0)',
    desc: 'A high-fidelity bilayer cross-section. Contains individually defined lipids, tails, and space-filling molecular representations.',
    size: '510 KB',
    paths: 6,
  },
};

export default function AssetEvaluationLab() {
  const [selectedAsset, setSelectedAsset] = useState<AssetKey>('mitochondria');
  const details = ASSET_DETAILS[selectedAsset];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 bg-[#ECF5FF] border-4 border-neutral-800 rounded-[30px] shadow-[8px_8px_0px_0px_rgba(31,41,55,1)]">
      <div className="lg:col-span-3 pb-6 border-b-2 border-neutral-200">
        <h2 className="text-2xl font-bold text-neutral-900 font-['Fredoka'] flex items-center gap-2">
          <AcademicCapIcon className="w-7 h-7 text-purple-700" />
          Bioicons &amp; Scientific Vector Evaluation Lab
        </h2>
        <p className="text-neutral-600 text-sm mt-2 leading-relaxed max-w-4xl">
          Evaluate how pre-made, high-precision scientific assets (from Bioicons, BioRender, or Servier Medical Art) compare to our programmatically generated wobbly sketchbook elements.
        </p>
      </div>

      {/* Selection & Metadata */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border-3 border-neutral-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <h3 className="text-md font-bold text-neutral-800 mb-4 font-['Fredoka']">Select Vector Asset</h3>
          <div className="space-y-2.5">
            {(Object.keys(ASSET_DETAILS) as AssetKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedAsset(key)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 font-bold text-xs md:text-sm transition-all duration-300 ${
                  selectedAsset === key
                    ? 'bg-purple-50 border-purple-800 text-purple-950 shadow-[2px_2px_0px_0px_rgba(107,33,168,1)]'
                    : 'bg-white border-neutral-300 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                {ASSET_DETAILS[key].title}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border-3 border-neutral-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-4">
          <h3 className="text-md font-bold text-neutral-800 font-['Fredoka']">Asset Metadata</h3>
          <div className="space-y-2 text-xs md:text-sm">
            <p className="text-neutral-700"><strong>Source:</strong> <span className="text-neutral-600 font-semibold">{details.source}</span></p>
            <p className="text-neutral-700"><strong>File Size:</strong> <span className="text-neutral-600 font-semibold">{details.size}</span></p>
            <p className="text-neutral-700"><strong>SVG Nodes:</strong> <span className="text-neutral-600 font-semibold">{details.paths} path elements</span></p>
            <p className="text-neutral-600 mt-2 italic leading-relaxed">{details.desc}</p>
          </div>
        </div>
      </div>

      {/* Visual renderings */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: '1. Raw Scientific Asset',  filter: undefined,                     note: 'Precise, rigid vector outline from the catalog.' },
            { label: '2. Standard Wiggle Filter', filter: 'url(#hand-drawn-wiggle)',      note: 'Passed through displacement maps (scale=3) for default wobbly lines.' },
            { label: '3. Fine-Tuned Wiggle',      filter: 'url(#hand-drawn-wiggle-fine)', note: 'Subtle roughness filter (scale=1.2) optimized for high-density assets.' },
          ].map(({ label, filter, note }) => (
            <div key={label} className="bg-white p-4 rounded-2xl border-3 border-neutral-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col items-center">
              <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3 text-center">{label}</h4>
              <div className="w-full aspect-square bg-[#EAF4FF] border-2 border-dashed border-neutral-300 rounded-xl flex items-center justify-center p-3 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/bioicons/${selectedAsset}.svg`}
                  alt={details.title}
                  className="max-w-full max-h-full object-contain"
                  style={filter ? { filter } : undefined}
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-2 text-center leading-normal">{note}</p>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-2xl border-3 border-neutral-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <h3 className="text-lg font-bold text-neutral-900 font-['Fredoka'] mb-4">Scientific Design Comparison &amp; Trade-offs</h3>
          <div className="overflow-x-auto text-xs md:text-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 text-left">
                  <th className="py-2 pr-4 font-bold text-neutral-800">Metric</th>
                  <th className="py-2 px-4 font-bold text-purple-800">Static Scientific Assets</th>
                  <th className="py-2 pl-4 font-bold text-amber-800">Programmatic Hand-Drawn SVGs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="py-3 pr-4 font-bold text-neutral-800">Interactive Control</td>
                  <td className="py-3 px-4 text-neutral-600">Difficult. Subcomponents are grouped/nested with rigid layouts. State changes require separate files or tedious DOM parsing.</td>
                  <td className="py-3 pl-4 text-neutral-600">Excellent. Built directly inside React using inline paths. Easy to attach states, refs, animations, and coordinates.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-bold text-neutral-800">Aesthetic Cohesion</td>
                  <td className="py-3 px-4 text-neutral-600">Medium. Often has flat solid fills, hard gradients, or inconsistent styles. Wobbly filter causes alignment/overlap gaps on high-node vectors.</td>
                  <td className="py-3 pl-4 text-neutral-600">Perfect. Customized styles, light HSL colors, wobbly outlines, and phospholipid double-lines match the journal sketchbook theme.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-bold text-neutral-800">File &amp; DOM Weight</td>
                  <td className="py-3 px-4 text-neutral-600">Heavy. Files range from 10KB up to 510KB+ containing hundreds of verbose nodes, resulting in high load overhead and parsing delay.</td>
                  <td className="py-3 pl-4 text-neutral-600">Light. Programmatic rendering uses clean mathematical equations and reusable inline paths. Zero external network calls.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-bold text-neutral-800">Accuracy Details</td>
                  <td className="py-3 px-4 text-neutral-600">Highest. Receptors, channels, and organelles match official textbook standards with high precision.</td>
                  <td className="py-3 pl-4 text-neutral-600">High. Abstracted to show essential medical/USMLE mechanisms without visual clutter, maximizing memorization.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
