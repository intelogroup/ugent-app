'use client';

import { useState } from 'react';
import {
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  UsersIcon,
  BeakerIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

import { GeneticsTab, PedigreeType, AgeStage, ChromosomalMode, MicrodeletionType } from './genetics/types';

import { MutationFactoryPanel, MutationFactoryControls, MutationFactoryMeta } from './genetics/MutationFactory';
import { PenetranceGridPanel, PenetranceGridControls, PenetranceGridMeta } from './genetics/PenetranceGrid';
import { PedigreeInspectorPanel, PedigreeInspectorControls, PedigreeInspectorMeta } from './genetics/PedigreeInspector';
import { HardyWeinbergPanel, HardyWeinbergControls, HardyWeinbergMeta } from './genetics/HardyWeinberg';
import { AgeOnsetMapPanel, AgeOnsetMapControls, AgeOnsetMapMeta } from './genetics/AgeOnsetMap';
import {
  ChromosomalErrorsPanel,
  ChromosomalErrorsControls,
  ChromosomalErrorsMeta,
} from './genetics/ChromosomalErrors';
import {
  MicrodeletionsPanel,
  MicrodeletionsControls,
  MicrodeletionsMeta,
} from './genetics/Microdeletions';
import {
  DiagnosticLabPanel,
  DiagnosticLabControls,
  DiagnosticLabMeta,
  DiagnosticMode,
  TargetMolecule,
  ProbeType,
  FlowPatient,
  FishPatient,
} from './genetics/DiagnosticLab';
import {
  CancerGeneticsPanel,
  CancerGeneticsControls,
  CancerGeneticsMeta,
  CancerMode,
} from './genetics/CancerGenetics';
import {
  NonClassicalPanel,
  NonClassicalControls,
  NonClassicalMeta,
  NonClassicalMode,
  ImprintingState,
  TrinucleotideDisease,
} from './genetics/NonClassical';

const TAB_LABELS: Record<GeneticsTab, string> = {
  mutation:    'Mutation Factory',
  penetrance:  'Penetrance Grid',
  pedigree:    'Pedigree Inspector',
  hardy:       'Hardy-Weinberg',
  ageMap:      'Age of Onset Map',
  chromosomal: 'Chromosomal Errors',
  microdeletion: 'Microdeletions',
  diagnostic: 'Diagnostic Lab',
  cancer: 'Cancer Genetics',
  nonclassical: 'Non-Classical Genetics',
};

export default function GeneticsSimulator() {
  const [activeTab, setActiveTab] = useState<GeneticsTab>('mutation');

  // Per-tab state
  const [mutationType, setMutationType] = useState('wild-type');
  const [penetrance, setPenetrance] = useState(70);
  const [expressivity, setExpressivity] = useState(2);
  const [pedigree, setPedigree] = useState<PedigreeType>('AD');
  const [qValue, setQValue] = useState(0.1);
  const [selectedAge, setSelectedAge] = useState<AgeStage>('fetus');
  const [selectedDisease, setSelectedDisease] = useState(0);
  const [chromosomalMode, setChromosomalMode] = useState<ChromosomalMode>('robertsonian');
  const [robertsonStep, setRobertsonStep] = useState(0);
  const [mosaicReveal, setMosaicReveal] = useState(false);
  const [microdeletionMode, setMicrodeletionMode] = useState<MicrodeletionType>('williams');
  const [microdeletionDeleted, setMicrodeletionDeleted] = useState(false);
  const [activeCatchSymptom, setActiveCatchSymptom] = useState<string | null>(null);
  const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticMode>('blot');
  const [targetMolecule, setTargetMolecule] = useState<TargetMolecule>('dna');
  const [probeType, setProbeType] = useState<ProbeType>('dna-probe');
  const [gelRunning, setGelRunning] = useState(false);
  const [gelProgress, setGelProgress] = useState(0);
  const [flowPatient, setFlowPatient] = useState<FlowPatient>('normal');
  const [selectedGate, setSelectedGate] = useState<'none' | 'lymphocytes' | 'granulocytes'>('none');
  const [fishPatient, setFishPatient] = useState<FishPatient>('normal');
  const [showFishProbe, setShowFishProbe] = useState(false);
  const [cancerMode, setCancerMode] = useState<CancerMode>('oncogene');
  const [mutatedCount, setMutatedCount] = useState(0);
  const [cellState, setCellState] = useState<'normal' | 'carrier' | 'cancerous'>('normal');

  // Non-Classical state
  const [nonClassicalMode, setNonClassicalMode] = useState<NonClassicalMode>('imprinting');
  const [imprintingState, setImprintingState] = useState<ImprintingState>('normal');
  const [heteroplasmyPct, setHeteroplasmyPct] = useState(30);
  const [trinucleotideDisease, setTrinucleotideDisease] = useState<TrinucleotideDisease>('huntington');
  const [trinucleotideRepeats, setTrinucleotideRepeats] = useState(45);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* ── LEFT/CENTER: Lab Notebook ─────────────────────────────── */}
      <div className="lg:col-span-2 bg-[#FAF8F2] border-4 border-neutral-800 rounded-[30px] p-6 relative overflow-hidden flex flex-col justify-between min-h-[550px] shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
        {/* Notebook grid background */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#000 1.5px, transparent 1.5px), linear-gradient(90deg, #000 1.5px, transparent 1.5px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Header badges */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-900 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">
            Genetics Lab Notebook
          </span>
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-neutral-800 text-white uppercase tracking-widest font-['Fredoka']">
            {TAB_LABELS[activeTab]}
          </span>
        </div>

        {/* Interactive workspace */}
        <div className="flex-grow flex flex-col items-center justify-center my-10 z-10">
          {activeTab === 'mutation'    && <MutationFactoryPanel    mutationType={mutationType} />}
          {activeTab === 'penetrance'  && <PenetranceGridPanel      penetrance={penetrance} expressivity={expressivity} />}
          {activeTab === 'pedigree'    && <PedigreeInspectorPanel   pedigree={pedigree} />}
          {activeTab === 'hardy'       && <HardyWeinbergPanel       qValue={qValue} />}
          {activeTab === 'ageMap'      && (
            <AgeOnsetMapPanel
              selectedAge={selectedAge} setSelectedAge={setSelectedAge}
              selectedDisease={selectedDisease} setSelectedDisease={setSelectedDisease}
            />
          )}
          {activeTab === 'chromosomal' && (
            <ChromosomalErrorsPanel
              chromosomalMode={chromosomalMode}
              robertsonStep={robertsonStep} setRobertsonStep={setRobertsonStep}
              mosaicReveal={mosaicReveal} setMosaicReveal={setMosaicReveal}
            />
          )}
          {activeTab === 'microdeletion' && (
            <MicrodeletionsPanel
              microdeletionMode={microdeletionMode}
              isDeleted={microdeletionDeleted}
              setIsDeleted={setMicrodeletionDeleted}
              activeCatchSymptom={activeCatchSymptom}
              setActiveCatchSymptom={setActiveCatchSymptom}
            />
          )}
          {activeTab === 'diagnostic' && (
            <DiagnosticLabPanel
              mode={diagnosticMode}
              target={targetMolecule}
              probe={probeType}
              gelRunning={gelRunning} setGelRunning={setGelRunning}
              gelProgress={gelProgress} setGelProgress={setGelProgress}
              flowPatient={flowPatient}
              selectedGate={selectedGate} setSelectedGate={setSelectedGate}
              fishPatient={fishPatient}
              showFishProbe={showFishProbe}
            />
          )}
          {activeTab === 'cancer' && (
            <CancerGeneticsPanel
              mode={cancerMode}
              mutatedCount={mutatedCount} setMutatedCount={setMutatedCount}
              cellState={cellState} setCellState={setCellState}
            />
          )}
          {activeTab === 'nonclassical' && (
            <NonClassicalPanel
              mode={nonClassicalMode}
              imprintingState={imprintingState}
              heteroplasmyPct={heteroplasmyPct}
              trinucleotideDisease={trinucleotideDisease}
              trinucleotideRepeats={trinucleotideRepeats}
            />
          )}
        </div>

        {/* Bottom metadata bar */}
        <div className="bg-[#E5F1FF] border-4 border-neutral-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          {activeTab === 'mutation'    && <MutationFactoryMeta    mutationType={mutationType} />}
          {activeTab === 'penetrance'  && <PenetranceGridMeta      penetrance={penetrance} expressivity={expressivity} />}
          {activeTab === 'pedigree'    && <PedigreeInspectorMeta   pedigree={pedigree} />}
          {activeTab === 'hardy'       && <HardyWeinbergMeta       qValue={qValue} />}
          {activeTab === 'ageMap'      && <AgeOnsetMapMeta         selectedAge={selectedAge} selectedDisease={selectedDisease} />}
          {activeTab === 'chromosomal' && <ChromosomalErrorsMeta   chromosomalMode={chromosomalMode} />}
          {activeTab === 'microdeletion' && (
            <MicrodeletionsMeta
              microdeletionMode={microdeletionMode}
              isDeleted={microdeletionDeleted}
            />
          )}
          {activeTab === 'diagnostic' && (
            <DiagnosticLabMeta
              mode={diagnosticMode}
              target={targetMolecule}
              probe={probeType}
              flowPatient={flowPatient}
              selectedGate={selectedGate}
              fishPatient={fishPatient}
              showFishProbe={showFishProbe}
            />
          )}
          {activeTab === 'cancer' && (
            <CancerGeneticsMeta mode={cancerMode} cellState={cellState} />
          )}
          {activeTab === 'nonclassical' && (
            <NonClassicalMeta
              mode={nonClassicalMode}
              imprintingState={imprintingState}
              heteroplasmyPct={heteroplasmyPct}
              trinucleotideDisease={trinucleotideDisease}
              trinucleotideRepeats={trinucleotideRepeats}
            />
          )}
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
      <div className="flex flex-col space-y-6">

        {/* Tab switcher */}
        <div className="bg-[#E0F2FE] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[-1deg]">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center mb-4 gap-2 font-['Fredoka']">
            <BeakerIcon className="w-5 h-5 text-blue-700" /> Genetics Sub-labs
          </h2>
          <div className="space-y-2">
            {(
              [
                { tab: 'mutation',    icon: <SparklesIcon className="w-4 h-4" />,                              label: 'Mutation Factory' },
                { tab: 'penetrance',  icon: <AdjustmentsHorizontalIcon className="w-4 h-4" />,                 label: 'Penetrance & Expressivity' },
                { tab: 'pedigree',    icon: <UsersIcon className="w-4 h-4" />,                                 label: 'Pedigree Inspector' },
                { tab: 'hardy',       icon: <AdjustmentsHorizontalIcon className="w-4 h-4 text-indigo-700" />, label: 'Hardy-Weinberg' },
                { tab: 'ageMap',      icon: <ClockIcon className="w-4 h-4 text-emerald-700" />,               label: 'Age of Onset Map' },
                { tab: 'chromosomal', icon: <SparklesIcon className="w-4 h-4 text-violet-700" />,             label: 'Chromosomal Errors' },
                { tab: 'microdeletion', icon: <SparklesIcon className="w-4 h-4 text-rose-700" />,             label: 'Microdeletions' },
                { tab: 'diagnostic', icon: <BeakerIcon className="w-4 h-4 text-indigo-700" />,                label: 'Diagnostic Lab' },
                { tab: 'cancer', icon: <SparklesIcon className="w-4 h-4 text-red-600" />,                     label: 'Cancer Genetics' },
                { tab: 'nonclassical', icon: <SparklesIcon className="w-4 h-4 text-amber-600" />,             label: 'Non-Classical Genetics' },
              ] as { tab: GeneticsTab; icon: React.ReactNode; label: string }[]
            ).map(({ tab, icon, label }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all duration-300 flex items-center gap-2 text-sm font-medium ${
                  activeTab === tab
                    ? 'border-neutral-800 bg-white shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]'
                    : 'border-transparent hover:bg-white/50'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Per-tab controls */}
        <div className="bg-[#E5F1FF] border-4 border-neutral-800 rounded-[30px] p-6 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] rotate-[1deg]">
          {activeTab === 'mutation' && (
            <MutationFactoryControls mutationType={mutationType} setMutationType={setMutationType} />
          )}
          {activeTab === 'penetrance' && (
            <PenetranceGridControls
              penetrance={penetrance} setPenetrance={setPenetrance}
              expressivity={expressivity} setExpressivity={setExpressivity}
            />
          )}
          {activeTab === 'pedigree' && (
            <PedigreeInspectorControls pedigree={pedigree} setPedigree={setPedigree} />
          )}
          {activeTab === 'hardy' && (
            <HardyWeinbergControls qValue={qValue} setQValue={setQValue} />
          )}
          {activeTab === 'ageMap' && (
            <AgeOnsetMapControls
              selectedAge={selectedAge} setSelectedAge={setSelectedAge}
              setSelectedDisease={setSelectedDisease}
            />
          )}
          {activeTab === 'chromosomal' && (
            <ChromosomalErrorsControls
              chromosomalMode={chromosomalMode} setChromosomalMode={setChromosomalMode}
              setRobertsonStep={setRobertsonStep} setMosaicReveal={setMosaicReveal}
            />
          )}
          {activeTab === 'microdeletion' && (
            <MicrodeletionsControls
              microdeletionMode={microdeletionMode} setMicrodeletionMode={setMicrodeletionMode}
              setIsDeleted={setMicrodeletionDeleted} setActiveCatchSymptom={setActiveCatchSymptom}
            />
          )}
          {activeTab === 'diagnostic' && (
            <DiagnosticLabControls
              mode={diagnosticMode} setMode={setDiagnosticMode}
              target={targetMolecule} setTarget={setTargetMolecule}
              probe={probeType} setProbe={setProbeType}
              gelRunning={gelRunning} setGelRunning={setGelRunning}
              gelProgress={gelProgress} setGelProgress={setGelProgress}
              flowPatient={flowPatient} setFlowPatient={setFlowPatient}
              selectedGate={selectedGate} setSelectedGate={setSelectedGate}
              fishPatient={fishPatient} setFishPatient={setFishPatient}
              showFishProbe={showFishProbe} setShowFishProbe={setShowFishProbe}
            />
          )}
          {activeTab === 'cancer' && (
            <CancerGeneticsControls
              mode={cancerMode} setMode={setCancerMode}
              mutatedCount={mutatedCount} setMutatedCount={setMutatedCount}
              cellState={cellState} setCellState={setCellState}
            />
          )}
          {activeTab === 'nonclassical' && (
            <NonClassicalControls
              mode={nonClassicalMode} setMode={setNonClassicalMode}
              imprintingState={imprintingState} setImprintingState={setImprintingState}
              heteroplasmyPct={heteroplasmyPct} setHeteroplasmyPct={setHeteroplasmyPct}
              trinucleotideDisease={trinucleotideDisease} setTrinucleotideDisease={setTrinucleotideDisease}
              trinucleotideRepeats={trinucleotideRepeats} setTrinucleotideRepeats={setTrinucleotideRepeats}
            />
          )}
        </div>
      </div>
    </div>
  );
}
