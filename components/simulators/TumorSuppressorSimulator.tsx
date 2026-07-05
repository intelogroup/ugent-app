'use client';

import React, { useState } from 'react';
import {
  ShieldCheckIcon,
  InformationCircleIcon,
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

type SubMode = 'checkpoints' | 'pathways' | 'lymphoma';

export default function TumorSuppressorSimulator() {
  const [subMode, setSubMode] = useState<SubMode>('checkpoints');

  // ─── CHECKPOINTS STATE ───
  const [dnaDamage, setDnaDamage] = useState<number>(20); // 0 to 100%
  const [rbMutated, setRbMutated] = useState<boolean>(false);
  const [growthSignals, setGrowthSignals] = useState<boolean>(false);

  // ─── PATHWAYS STATE ───
  const [apcMutated, setApcMutated] = useState<boolean>(false);
  const [nf1Mutated, setNf1Mutated] = useState<boolean>(false);
  const [vhlMutated, setVhlMutated] = useState<boolean>(false);
  const [oxygenLevel, setOxygenLevel] = useState<number>(100); // 0 to 100%

  // ─── LYMPHOMA STATE ───
  const [follicularPreset, setFollicularPreset] = useState<'reactive' | 'lymphoma'>('reactive');

  // Derived p53 kinetics
  const p53Level = Math.min(100, dnaDamage * 1.2);
  const p21Level = Math.min(100, p53Level * 0.9);
  const baxLevel = Math.max(0, p53Level - 40);
  const bcl2Blocked = baxLevel > 20;
  const isApoptosis = p53Level > 70;

  // Derived Rb kinetics
  const isRbPhosphorylated = growthSignals || rbMutated; // Phosphorylated is inactive
  const isE2fFree = isRbPhosphorylated; 

  // Derived VHL kinetics
  const hif1aAccumulation = (oxygenLevel < 30 || vhlMutated) ? 100 : 10;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 bg-[#FFF7ED] border-4 border-neutral-800 rounded-[30px] shadow-[8px_8px_0px_0px_rgba(31,41,55,1)]">
      
      {/* Header bar */}
      <div className="lg:col-span-3 pb-6 border-b-2 border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 font-['Fredoka'] flex items-center gap-2">
            <ShieldCheckIcon className="w-7 h-7 text-orange-650 animate-pulse" />
            Tumor Suppressor Genes &amp; Checkpoints Lab
          </h2>
          <p className="text-neutral-600 text-sm mt-2 leading-relaxed max-w-3xl">
            Explore the mechanisms of cell cycle checkpoints, tumor suppressors, and apoptosis evasion. Master p53, Rb, APC, and translocation-driven lymphomas.
          </p>
        </div>

        {/* Sub-lab Mode selector */}
        <div className="flex bg-[#FFE6D5] p-1.5 rounded-2xl border-3 border-neutral-800 self-start md:self-auto shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {[
            { id: 'checkpoints', name: 'Checkpoints (p53 / Rb)' },
            { id: 'pathways',    name: 'Pathways (APC / VHL)' },
            { id: 'lymphoma',    name: 'Lymphoma t(14;18)' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSubMode(mode.id as SubMode)}
              className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl border transition-all duration-200 ${
                subMode === mode.id
                  ? 'bg-white border-neutral-800 text-orange-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'border-transparent text-neutral-700 hover:bg-white/40'
              }`}
            >
              {mode.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Screen */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* SUB-LAB 1: CHECKPOINTS */}
        {subMode === 'checkpoints' && (
          <div className="bg-white border-4 border-neutral-800 rounded-3xl p-6 relative min-h-[460px] flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-900 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">
                  Interactive Checkpoints: p53 &amp; Rb
                </span>
              </div>

              {/* p53 Apoptosis Cascade Visualization */}
              <div className="border-2 border-neutral-800 rounded-2xl p-4 mb-6 bg-[#FAF8F2] relative">
                <h4 className="text-xs font-bold text-neutral-800 uppercase mb-3">p53 DNA Damage Checkpoint</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center items-center">
                  
                  {/* Step 1: DNA Damage & p53 */}
                  <div className="bg-white p-3 rounded-xl border border-neutral-300 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">DNA Damage</span>
                    <div className="w-16 h-8 border-2 border-dashed border-red-400 rounded-lg flex items-center justify-center my-2 bg-red-50/50">
                      <span className="text-xs font-mono font-bold text-red-650 animate-pulse">{dnaDamage}%</span>
                    </div>
                    <span className="text-xs font-bold text-neutral-900">p53 Active: {Math.round(p53Level)}%</span>
                  </div>

                  {/* Step 2: Intermediate Upregulation */}
                  <div className="bg-white p-3 rounded-xl border border-neutral-300 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Kinetic Regulators</span>
                    <div className="mt-2 space-y-1.5 w-full">
                      <div className="flex justify-between text-xs px-2">
                        <span>p21 (CDK Inhibit):</span>
                        <span className="font-bold text-blue-650">{Math.round(p21Level)}%</span>
                      </div>
                      <div className="flex justify-between text-xs px-2">
                        <span>BAX (Pro-Apoptotic):</span>
                        <span className="font-bold text-red-650">{Math.round(baxLevel)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Mitochondrial Cytochrome c & Apoptosis */}
                  <div className={`p-3 rounded-xl border transition-all duration-300 ${
                    isApoptosis ? 'bg-red-50 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-emerald-50 border-emerald-400'
                  } flex flex-col items-center`}>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Cellular Outcome</span>
                    <div className="relative w-12 h-12 my-1 flex items-center justify-center">
                      {isApoptosis ? (
                        <div className="text-2xl animate-bounce">💀</div>
                      ) : (
                        <div className="text-2xl">💖</div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-neutral-900">
                      {isApoptosis ? 'Apoptosis (Caspases)' : 'DNA Repaired / Healthy'}
                    </span>
                  </div>
                </div>

                {/* Microdiagram explaining Bcl-2 block */}
                <div className="mt-4 p-2.5 bg-white rounded-lg border border-neutral-200 text-xs flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-800 font-bold font-mono rounded">Pathoma</span>
                  <p className="text-neutral-600 leading-normal">
                    {bcl2Blocked 
                      ? 'BAX has inactivated Bcl-2. Mitochondrial membrane permeabilized → Cytochrome c released into cytosol.' 
                      : 'Bcl-2 is active, stabilizing the outer mitochondrial membrane preventing Cytochrome c leakage.'
                    }
                  </p>
                </div>
              </div>

              {/* Rb Checkpoint Cycle */}
              <div className="border-2 border-neutral-800 rounded-2xl p-4 bg-[#FAF8F2]">
                <h4 className="text-xs font-bold text-neutral-800 uppercase mb-3">Rb (Retinoblastoma) Gatekeeper</h4>
                
                <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                  
                  {/* Gatekeeper visual */}
                  <div className="relative w-48 h-32 bg-white rounded-xl border border-neutral-300 flex items-center justify-center">
                    <svg viewBox="0 0 200 120" className="w-full h-full">
                      {/* Active / Inactive Rb */}
                      <rect 
                        x="10" 
                        y="30" 
                        width="80" 
                        height="40" 
                        rx="8" 
                        fill={isRbPhosphorylated ? '#fca5a5' : '#86efac'} 
                        stroke="#1f2937" 
                        strokeWidth="2"
                      />
                      <text x="50" y="55" textAnchor="middle" className="text-xs font-bold fill-neutral-900">
                        {isRbPhosphorylated ? 'Rb-P (Inactive)' : 'Rb (Active)'}
                      </text>

                      {/* Binding Lock */}
                      {!isE2fFree && (
                        <path d="M 90 50 L 110 50" stroke="#1f2937" strokeWidth="3" strokeDasharray="3 2" />
                      )}

                      {/* E2F */}
                      <rect 
                        x="110" 
                        y="30" 
                        width="70" 
                        height="40" 
                        rx="8" 
                        fill={isE2fFree ? '#93c5fd' : '#e5e7eb'} 
                        stroke="#1f2937" 
                        strokeWidth="2"
                        className={isE2fFree ? 'animate-bounce' : ''}
                      />
                      <text x="145" y="55" textAnchor="middle" className="text-xs font-bold fill-neutral-900">E2F</text>

                      {/* Pathway arrow */}
                      {isE2fFree ? (
                        <>
                          <path d="M 145 75 L 145 100" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow)" />
                          <text x="145" y="98" textAnchor="middle" className="text-[9px] fill-emerald-700 font-bold">To S-Phase (Dividing)</text>
                        </>
                      ) : (
                        <text x="145" y="90" textAnchor="middle" className="text-[9px] fill-neutral-400 font-bold">Blocked (G1 Arrest)</text>
                      )}
                    </svg>
                  </div>

                  {/* High Yield Vignette Target */}
                  <div className="flex-1 space-y-2 text-xs">
                    <p className="font-bold text-neutral-800">Rb Pathology Correlations:</p>
                    <ul className="list-disc pl-4 space-y-1 text-neutral-600">
                      <li><strong>Active state:</strong> Hypophosphorylated state prevents entry into S-phase by holding E2F.</li>
                      <li><strong>Phosphorylation:</strong> Stimulated by Cyclin D-CDK4 complex, releasing E2F.</li>
                      <li><strong>Bilateral Retinoblastoma:</strong> Hereditary germline mutation (1st hit inherited, 2nd hit somatic). Associated with secondary osteosarcoma.</li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUB-LAB 2: PATHWAYS */}
        {subMode === 'pathways' && (
          <div className="bg-white border-4 border-neutral-800 rounded-3xl p-6 relative min-h-[460px] flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-900 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">
                  Pathways: APC, NF1, &amp; VHL
                </span>
              </div>

              {/* APC Pathway block */}
              <div className="border-2 border-neutral-800 rounded-2xl p-4 bg-[#FAF8F2] grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="col-span-1">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">Wnt Pathway</span>
                  <h5 className="font-bold text-sm text-neutral-800 mt-1">APC Complex</h5>
                  <p className="text-xs text-neutral-500 mt-1">Degrades β-catenin to inhibit uncontrolled growth.</p>
                </div>
                
                <div className="col-span-1 flex justify-center py-2 bg-white rounded-xl border border-neutral-200">
                  <div className="text-center font-mono">
                    <span className="text-[10px] text-neutral-400 block font-sans">β-Catenin state</span>
                    <span className={`text-sm font-bold ${apcMutated ? 'text-red-650 animate-pulse' : 'text-neutral-400'}`}>
                      {apcMutated ? '⚠️ Nuclear Entry' : '✅ Degraded'}
                    </span>
                  </div>
                </div>

                <div className="col-span-1 text-xs text-neutral-600 space-y-1">
                  <p className="font-bold text-neutral-700">FAP Colon Sequence:</p>
                  <p className="leading-snug">Loss of APC (Hyperproliferation) → KRAS (Adenoma) → TP53 (Carcinoma).</p>
                </div>
              </div>

              {/* NF1 Pathway block */}
              <div className="border-2 border-neutral-800 rounded-2xl p-4 bg-[#FAF8F2] grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="col-span-1">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">Ras Pathway</span>
                  <h5 className="font-bold text-sm text-neutral-800 mt-1">NF1 (Neurofibromin)</h5>
                  <p className="text-xs text-neutral-500 mt-1">Acts as GAP, turning active Ras-GTP into inactive Ras-GDP.</p>
                </div>
                
                <div className="col-span-1 flex justify-center py-2 bg-white rounded-xl border border-neutral-200">
                  <div className="text-center font-mono">
                    <span className="text-[10px] text-neutral-400 block font-sans">Ras Activation</span>
                    <span className={`text-sm font-bold ${nf1Mutated ? 'text-red-650 animate-ping' : 'text-emerald-650'}`}>
                      {nf1Mutated ? 'Ras-GTP (Active)' : 'Ras-GDP (Off)'}
                    </span>
                  </div>
                </div>

                <div className="col-span-1 text-xs text-neutral-600 space-y-1">
                  <p className="font-bold text-neutral-700">NF-1 Presentation:</p>
                  <p className="leading-snug">Café-au-lait spots, cutaneous neurofibromas, bilateral Lisch nodules, optic gliomas.</p>
                </div>
              </div>

              {/* VHL Pathway block */}
              <div className="border-2 border-neutral-800 rounded-2xl p-4 bg-[#FAF8F2] grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="col-span-1">
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-bold">Angiogenesis</span>
                  <h5 className="font-bold text-sm text-neutral-800 mt-1">VHL &amp; HIF-1α</h5>
                  <p className="text-xs text-neutral-500 mt-1">Degrades HIF-1α to prevent transcription of VEGF/PDGF.</p>
                </div>
                
                <div className="col-span-1 flex justify-center py-2 bg-white rounded-xl border border-neutral-200">
                  <div className="text-center font-mono">
                    <span className="text-[10px] text-neutral-400 block font-sans">VEGF/PDGF</span>
                    <span className={`text-sm font-bold ${hif1aAccumulation > 50 ? 'text-red-650 animate-pulse' : 'text-neutral-400'}`}>
                      {hif1aAccumulation > 50 ? '⚠️ High Angiogenesis' : '✅ Inhibited'}
                    </span>
                  </div>
                </div>

                <div className="col-span-1 text-xs text-neutral-600 space-y-1">
                  <p className="font-bold text-neutral-700">VHL Syndromes:</p>
                  <p className="leading-snug">Hemangioblastomas (retina/cerebellum), bilateral Renal Cell Carcinoma, pheochromocytomas.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SUB-LAB 3: LYMPHOMA */}
        {subMode === 'lymphoma' && (
          <div className="bg-white border-4 border-neutral-800 rounded-3xl p-6 relative min-h-[460px] flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-900 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">
                  t(14;18) Translocation &amp; Apoptosis Evasion
                </span>
              </div>

              {/* Interactive Translocation Diagram */}
              <div className="bg-[#FAF8F2] border-2 border-neutral-800 rounded-2xl p-4 mb-4">
                <h4 className="text-xs font-bold text-neutral-800 uppercase mb-2">Translocation Sequence</h4>
                
                <div className="flex items-center justify-around gap-4 text-center bg-white p-3 rounded-xl border border-neutral-200">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Chr 18 (BCL2)</span>
                    <div className="w-12 h-6 bg-red-200 border border-neutral-800 rounded flex items-center justify-center font-bold text-xs mt-1">BCL2</div>
                  </div>
                  
                  <div className="text-xl animate-pulse">⚡ t(14;18) ⚡</div>

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Chr 14 (Ig Heavy Chain)</span>
                    <div className="w-12 h-6 bg-blue-200 border border-neutral-800 rounded flex items-center justify-center font-bold text-xs mt-1">IgH</div>
                  </div>

                  <div className="border-l border-neutral-300 pl-4 text-left">
                    <span className="text-[10px] font-bold text-red-600 uppercase">Outcome</span>
                    <p className="text-xs font-bold text-neutral-900 leading-snug">Constitutive BCL2 overexpression blocks B-cell apoptosis</p>
                  </div>
                </div>
              </div>

              {/* Reactive Hyperplasia vs. Follicular Lymphoma Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Reactive Hyperplasia */}
                <div className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                  follicularPreset === 'reactive' ? 'border-neutral-800 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'border-neutral-200 bg-neutral-50/50'
                }`}>
                  <h5 className="font-bold text-xs text-emerald-800 uppercase mb-2">1. Reactive Hyperplasia</h5>
                  <div className="h-24 bg-[#EAF7ED] rounded-xl border border-emerald-300 relative overflow-hidden flex items-center justify-around p-2">
                    {/* Apoptotic cells & tingible body macrophage */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-emerald-600 bg-white flex items-center justify-center text-[10px] font-bold text-emerald-800 text-center leading-none">
                        Tingible Mac
                      </div>
                      <span className="text-[9px] text-emerald-750 font-bold mt-1">Apoptotic Debris (+)</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-neutral-600">
                      <p>✅ Debris is eaten by macrophages</p>
                      <p>✅ Cells with bad BCRs die</p>
                    </div>
                  </div>
                </div>

                {/* Follicular Lymphoma */}
                <div className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                  follicularPreset === 'lymphoma' ? 'border-neutral-800 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'border-neutral-200 bg-neutral-50/50'
                }`}>
                  <h5 className="font-bold text-xs text-red-800 uppercase mb-2">2. Follicular Lymphoma</h5>
                  <div className="h-24 bg-[#FDF2F2] rounded-xl border border-red-300 relative overflow-hidden flex items-center justify-around p-2">
                    {/* Packed B-cells, no tingible body macrophages */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full border-2 border-red-300 bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-800 text-center leading-none">
                        Blocked Apopt.
                      </div>
                      <span className="text-[9px] text-red-750 font-bold mt-1">No Tingible Mac</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-neutral-600">
                      <p>❌ Bcl-2 overexpression protects cells</p>
                      <p>❌ Germinal centers lack apoptotic debris</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* Control Panel / Sliders & Statistics */}
      <div className="space-y-6">
        
        {/* CHECKPOINTS CONTROLS */}
        {subMode === 'checkpoints' && (
          <div className="bg-white border-4 border-neutral-800 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-bold text-neutral-900 font-['Fredoka'] mb-4 flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-neutral-800" />
              Checkpoint Controls
            </h3>

            <div className="space-y-5">
              {/* DNA Damage Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                  <span>DNA Damage Level</span>
                  <span className="text-orange-650">{dnaDamage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={dnaDamage}
                  onChange={(e) => setDnaDamage(Number(e.target.value))}
                  className="w-full accent-orange-600 cursor-pointer"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">Increasing damage triggers p53-dependent repair, and apoptosis if excessive.</span>
              </div>

              {/* Rb Mutation status */}
              <div className="pt-2 border-t border-neutral-100">
                <span className="text-xs font-bold text-neutral-700 block mb-2">Rb Retinoblastoma State</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRbMutated(false);
                      setGrowthSignals(false);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      !rbMutated && !growthSignals ? 'bg-emerald-100 border-neutral-800 text-emerald-900' : 'bg-white border-neutral-200'
                    }`}
                  >
                    Resting (Locked)
                  </button>
                  <button
                    onClick={() => {
                      setRbMutated(false);
                      setGrowthSignals(true);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      growthSignals ? 'bg-blue-100 border-neutral-800 text-blue-900' : 'bg-white border-neutral-200'
                    }`}
                  >
                    Growth (P-Rb)
                  </button>
                  <button
                    onClick={() => {
                      setRbMutated(true);
                      setGrowthSignals(false);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      rbMutated ? 'bg-red-100 border-neutral-800 text-red-900 animate-pulse' : 'bg-white border-neutral-200'
                    }`}
                  >
                    Two-Hit Mut
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PATHWAYS CONTROLS */}
        {subMode === 'pathways' && (
          <div className="bg-white border-4 border-neutral-800 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-bold text-neutral-900 font-['Fredoka'] mb-4 flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-neutral-800" />
              Pathway Controls
            </h3>

            <div className="space-y-4">
              {/* APC Mutation Toggle */}
              <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                <div>
                  <span className="text-xs font-bold text-neutral-700 block">APC Tumor Suppressor</span>
                  <span className="text-[10px] text-neutral-400 block">FAP polyp risk sequence</span>
                </div>
                <button
                  onClick={() => setApcMutated(!apcMutated)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                    apcMutated ? 'bg-red-100 border-neutral-800 text-red-900' : 'bg-emerald-100 border-neutral-200 text-emerald-900'
                  }`}
                >
                  {apcMutated ? 'Mutated (Off)' : 'Active (On)'}
                </button>
              </div>

              {/* NF1 Mutation Toggle */}
              <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                <div>
                  <span className="text-xs font-bold text-neutral-700 block">NF1 (Neurofibromin)</span>
                  <span className="text-[10px] text-neutral-400 block">GTPase-activating protein</span>
                </div>
                <button
                  onClick={() => setNf1Mutated(!nf1Mutated)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                    nf1Mutated ? 'bg-red-100 border-neutral-800 text-red-900' : 'bg-emerald-100 border-neutral-200 text-emerald-900'
                  }`}
                >
                  {nf1Mutated ? 'Mutated (Off)' : 'Active (On)'}
                </button>
              </div>

              {/* VHL Oxygen level & Mutation Controls */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-neutral-700 block">VHL Status</span>
                  <button
                    onClick={() => setVhlMutated(!vhlMutated)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                      vhlMutated ? 'bg-red-100 border-neutral-800 text-red-900' : 'bg-emerald-100 border-neutral-200 text-emerald-900'
                    }`}
                  >
                    {vhlMutated ? 'Mutated' : 'Normal'}
                  </button>
                </div>
                
                <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                  <span>Oxygen Level</span>
                  <span className="text-blue-650">{oxygenLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={oxygenLevel}
                  onChange={(e) => setOxygenLevel(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* LYMPHOMA CONTROLS */}
        {subMode === 'lymphoma' && (
          <div className="bg-white border-4 border-neutral-800 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-lg font-bold text-neutral-900 font-['Fredoka'] mb-4 flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-neutral-800" />
              Lymph Node Selector
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => setFollicularPreset('reactive')}
                className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-all text-left px-3 ${
                  follicularPreset === 'reactive' ? 'bg-emerald-55 border-neutral-800 text-emerald-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white border-neutral-200 text-neutral-600'
                }`}
              >
                <span className="block font-bold">Reactive Follicular Hyperplasia</span>
                <span className="text-[10px] text-neutral-500 font-normal mt-0.5 block">Polyclonal B-cell response, apoptotic debris swallowed by tingible body macrophages.</span>
              </button>

              <button
                onClick={() => setFollicularPreset('lymphoma')}
                className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-all text-left px-3 ${
                  follicularPreset === 'lymphoma' ? 'bg-red-55 border-neutral-800 text-red-955 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white border-neutral-200 text-neutral-600'
                }`}
              >
                <span className="block font-bold">Follicular Lymphoma t(14;18)</span>
                <span className="text-[10px] text-neutral-500 font-normal mt-0.5 block">Monoclonal expansion, Bcl-2 overexpressed, absence of apoptotic debris / tingible body macrophages.</span>
              </button>
            </div>
          </div>
        )}

        {/* High Yield Key Clinical Notes */}
        <div className="bg-[#FAF8F2] border-4 border-neutral-800 rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mb-2">High Yield Pearls (USMLE)</h4>
          <ul className="text-xs text-neutral-600 space-y-2 list-disc pl-4 leading-normal font-medium">
            <li><strong>Li-Fraumeni Syndrome:</strong> Germline mutation in TP53. SBLA cancer types (Sarcoma, Breast/Brain, Lung/Leukemia, Adrenal).</li>
            <li><strong>VHL Disease:</strong> Lost ubiquitin ligase prevents HIF-1α degradation, causing hemangioblastomas and RCC.</li>
            <li><strong>Lynch Syndrome (HNPCC):</strong> Mismatch repair gene mutations (MLH1/MSH2) leading to microsatellite instability (MSI).</li>
            <li><strong>APC Mutation:</strong> Colorectal cancer Adenoma-to-carcinoma sequence driver.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
