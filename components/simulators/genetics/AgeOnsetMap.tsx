'use client';

import { AgeStage, AGE_STAGES_DATA } from './types';

interface Props {
  selectedAge: AgeStage;
  setSelectedAge: (s: AgeStage) => void;
  selectedDisease: number;
  setSelectedDisease: (i: number) => void;
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function AgeOnsetMapPanel({ selectedAge, setSelectedAge, selectedDisease, setSelectedDisease }: Props) {
  const currentAgeData = AGE_STAGES_DATA[selectedAge];
  const currentDisease = currentAgeData.diseases[selectedDisease] || currentAgeData.diseases[0];

  const stageColors: Record<AgeStage, string> = {
    fetus:   'bg-[#f87171] border-neutral-800',
    neonate: 'bg-[#fbbf24] border-neutral-800',
    infant:  'bg-[#34d399] border-neutral-800',
    child:   'bg-[#60a5fa] border-neutral-800',
    adult:   'bg-[#a78bfa] border-neutral-800',
  };
  const stagePositions: { stage: AgeStage; pos: string; label: string }[] = [
    { stage: 'fetus',   pos: 'absolute top-4 left-6',         label: '1. Fetus' },
    { stage: 'neonate', pos: 'absolute top-28 left-48',       label: '2. Neonate' },
    { stage: 'infant',  pos: 'absolute bottom-24 left-24',    label: '3. Infant' },
    { stage: 'child',   pos: 'absolute bottom-6 left-12',     label: '4. Child' },
    { stage: 'adult',   pos: 'absolute bottom-12 right-6',    label: '5. Adult' },
  ];

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 items-stretch justify-center">
      {/* Sketchbook illustration */}
      <div className="w-full md:w-1/2 flex flex-col items-center">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 font-['Fredoka']">Developmental Sketchbook</span>
        <div className="relative border-4 border-neutral-800 rounded-2xl overflow-hidden bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/developmental_genetics_sketch.png" alt="Developmental genetics sketchbook" className="w-full h-auto" />
          {stagePositions.map(({ stage, pos, label }) => (
            <button
              key={stage}
              onClick={() => { setSelectedAge(stage); setSelectedDisease(0); }}
              className={`${pos} px-2.5 py-1 text-[10px] font-black border-2 rounded-lg transition-all ${
                selectedAge === stage
                  ? `${stageColors[stage]} text-neutral-900 scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
                  : 'bg-white/80 border-neutral-400 text-neutral-700 hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Disease details */}
      <div className="w-full md:w-1/2 flex flex-col justify-between">
        <div className="bg-white border-3 border-neutral-800 p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex-grow">
          <h4 className="text-sm font-extrabold text-neutral-800 uppercase tracking-wider mb-3 font-['Fredoka']">
            {currentAgeData.label} ({currentAgeData.range})
          </h4>
          <p className="text-neutral-500 text-xs mb-4">{currentAgeData.description}</p>
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider">Select Disease:</span>
            <div className="flex flex-wrap gap-2">
              {currentAgeData.diseases.map((dis, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDisease(idx)}
                  className={`text-xs px-3 py-2 rounded-xl border-2 transition-all font-bold ${
                    selectedDisease === idx ? 'bg-[#E5F1FF] border-neutral-800 text-blue-900' : 'bg-neutral-55 border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {dis.name}
                </button>
              ))}
            </div>
            <div className="border-t border-neutral-200 pt-3 mt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-neutral-500">Inheritance:</span>
                <span className="font-black text-neutral-800">{currentDisease.inheritance}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold text-neutral-500">Mutation/Defect:</span>
                <span className="font-black text-neutral-850 text-right">{currentDisease.mutation}</span>
              </div>
              <div className="pt-2">
                <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider mb-1">Clinical Vignette Hooks:</span>
                <ul className="text-[11px] text-neutral-600 space-y-1 list-disc pl-4 leading-relaxed font-semibold">
                  {currentDisease.clues.map((clue, idx) => <li key={idx}>{clue}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Controls ──────────────────────────────────────────────────────

export function AgeOnsetMapControls({ selectedAge, setSelectedAge, setSelectedDisease }: Omit<Props, 'selectedDisease'>) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest font-['Fredoka']">Select Life Stage</h3>
      <div className="flex flex-col gap-2">
        {(['fetus', 'neonate', 'infant', 'child', 'adult'] as AgeStage[]).map((stage) => (
          <button
            key={stage}
            onClick={() => { setSelectedAge(stage); setSelectedDisease(0); }}
            className={`w-full text-left text-xs px-3 py-2 rounded-xl border transition-all capitalize ${
              selectedAge === stage ? 'bg-white border-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold' : 'border-neutral-200 hover:bg-white/30'
            }`}
          >
            {stage === 'fetus' && '1. Fetus (Prenatal)'}
            {stage === 'neonate' && '2. Neonate (0-1m)'}
            {stage === 'infant' && '3. Infant/Toddler (1m-5y)'}
            {stage === 'child' && '4. Child/Adolescent (5-18y)'}
            {stage === 'adult' && '5. Adult (18y+)'}
          </button>
        ))}
      </div>
      <div className="border-t border-neutral-300 pt-3 mt-3">
        <p className="text-[10px] text-neutral-450 leading-relaxed">
          Click on the overlay buttons on the Developmental sketch to change stages, or use the selectors above.
        </p>
      </div>
    </div>
  );
}

// ─── Bottom Metadata ───────────────────────────────────────────────────────

export function AgeOnsetMapMeta({ selectedAge, selectedDisease }: { selectedAge: AgeStage; selectedDisease: number }) {
  const currentAgeData = AGE_STAGES_DATA[selectedAge];
  const currentDisease = currentAgeData.diseases[selectedDisease] || currentAgeData.diseases[0];
  return (
    <>
      <div>
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Age Stage</span>
        <span className="text-sm font-bold text-neutral-800">{currentAgeData.label}</span>
      </div>
      <div className="text-left md:text-right">
        <span className="text-neutral-500 text-[10px] block uppercase font-bold tracking-widest font-['Fredoka']">Primary Concept</span>
        <span className="text-xs font-bold text-indigo-700 block">{currentDisease.concept}</span>
      </div>
    </>
  );
}
