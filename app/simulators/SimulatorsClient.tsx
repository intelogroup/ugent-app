'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  AcademicCapIcon,
  CpuChipIcon,
  TrashIcon,
  BoltIcon,
  BeakerIcon,
  Squares2X2Icon,
  SparklesIcon,
  CalculatorIcon,
  HeartIcon,
  ShieldCheckIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';

import EtcSimulator          from '@/components/simulators/EtcSimulator';
import GpcrSimulator         from '@/components/simulators/GpcrSimulator';
import LysosomeSimulator     from '@/components/simulators/LysosomeSimulator';
import DnaReplicationSimulator from '@/components/simulators/DnaReplicationSimulator';
import UreaCycleSimulator    from '@/components/simulators/UreaCycleSimulator';
import AssetEvaluationLab   from '@/components/simulators/AssetEvaluationLab';
import GeneticsSimulator     from '@/components/simulators/GeneticsSimulator';
import BiostatsSimulator     from '@/components/simulators/BiostatsSimulator';
import CardiologySimulator   from '@/components/simulators/CardiologySimulator';
import TumorSuppressorSimulator from '@/components/simulators/TumorSuppressorSimulator';
import NephronSimulator     from '@/components/simulators/NephronSimulator';
import CoagulationSimulator from '@/components/simulators/CoagulationSimulator';
import SecondMessengerSimulator from '@/components/simulators/SecondMessengerSimulator';
import SpirometrySimulator  from '@/components/simulators/SpirometrySimulator';
import BaroreceptorSimulator from '@/components/simulators/BaroreceptorSimulator';
import GastricAcidSimulator from '@/components/simulators/GastricAcidSimulator';
import AntiarrhythmicSimulator from '@/components/simulators/AntiarrhythmicSimulator';
import ComplementSimulator  from '@/components/simulators/ComplementSimulator';
import BrainHerniationSimulator from '@/components/simulators/BrainHerniationSimulator';
import BacterialToxinSimulator from '@/components/simulators/BacterialToxinSimulator';

type Tab =
  | 'etc'
  | 'gpcr'
  | 'lysosomes'
  | 'replication'
  | 'ureacycle'
  | 'evaluation'
  | 'genetics'
  | 'biostats'
  | 'cardio'
  | 'suppressors'
  | 'nephron'
  | 'coagulation'
  | 'messengers'
  | 'spirometry'
  | 'baroreceptors'
  | 'gastric'
  | 'arrhythmias'
  | 'complement'
  | 'herniations'
  | 'toxins';

const TABS = [
  { id: 'etc',        name: 'ETC Dam',      icon: BoltIcon,        color: 'bg-amber-100 text-amber-900'   },
  { id: 'gpcr',       name: 'GPCR Cascade', icon: CpuChipIcon,     color: 'bg-rose-100 text-rose-900'     },
  { id: 'lysosomes',  name: 'Lysosome Plant', icon: TrashIcon,      color: 'bg-teal-100 text-teal-900'    },
  { id: 'replication', name: 'DNA Fork',    icon: BeakerIcon,      color: 'bg-blue-100 text-blue-900'     },
  { id: 'ureacycle',  name: 'Urea Cycle',   icon: Squares2X2Icon,  color: 'bg-emerald-100 text-emerald-900' },
  { id: 'evaluation', name: 'Asset Lab',    icon: AcademicCapIcon, color: 'bg-purple-100 text-purple-900' },
  { id: 'genetics',   name: 'Genetics Lab', icon: SparklesIcon,    color: 'bg-indigo-100 text-indigo-900' },
  { id: 'biostats',   name: 'Biostats Lab', icon: CalculatorIcon,  color: 'bg-cyan-100 text-cyan-900' },
  { id: 'cardio',     name: 'PV Loops Lab', icon: HeartIcon,       color: 'bg-red-100 text-red-900' },
  { id: 'suppressors', name: 'Tumor Lab',   icon: ShieldCheckIcon, color: 'bg-orange-100 text-orange-900' },
  { id: 'nephron',    name: 'Nephron Lab',  icon: ListBulletIcon,  color: 'bg-yellow-100 text-yellow-900' },
  { id: 'coagulation', name: 'Coagulation Lab', icon: ListBulletIcon, color: 'bg-rose-100 text-rose-900' },
  { id: 'messengers', name: 'Messengers Lab', icon: ListBulletIcon, color: 'bg-indigo-100 text-indigo-900' },
  { id: 'spirometry', name: 'Spirometry Lab', icon: ListBulletIcon, color: 'bg-sky-100 text-sky-900' },
  { id: 'baroreceptors', name: 'Baroreceptors', icon: ListBulletIcon, color: 'bg-teal-100 text-teal-900' },
  { id: 'gastric',    name: 'Gastric Acid', icon: ListBulletIcon,  color: 'bg-amber-100 text-amber-900' },
  { id: 'arrhythmias', name: 'Arrhythmias', icon: ListBulletIcon,  color: 'bg-red-100 text-red-900' },
  { id: 'complement', name: 'Complement',   icon: ListBulletIcon,  color: 'bg-purple-100 text-purple-900' },
  { id: 'herniations', name: 'Brain Hernia', icon: ListBulletIcon,  color: 'bg-orange-100 text-orange-900' },
  { id: 'toxins',     name: 'Toxins Lab',   icon: ListBulletIcon,  color: 'bg-emerald-100 text-emerald-900' },
] as const;

export default function SimulatorsClient() {
  const [activeTab, setActiveTab] = useState<Tab>('etc');

  return (
    <DashboardLayout>

      {/* Global SVG filter defs — referenced by all child simulators via filter="url(#...)" */}
      <svg className="hidden">
        <defs>
          <filter id="hand-drawn-wiggle" x="-10%" y="-10%" width="120%" height="120%">
            {/* Creates a natural, organic pencil stroke roughness */}
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={3} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="hand-drawn-wiggle-fine" x="-5%" y="-5%" width="110%" height="110%">
            {/* Fine-tuned, subtle roughness for highly detailed paths */}
            <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves={2} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={1.2} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="hand-drawn-wiggle-coarse" x="-20%" y="-20%" width="140%" height="140%">
            {/* Coarse, wobbly strokes for larger containers/borders */}
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={3} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={6} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <pattern id="pencil-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45 0 0)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#e5e5e5" strokeWidth="1.5" />
          </pattern>
          <linearGradient id="gpcr-cyl-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#c084fc" />
            <stop offset="30%"  stopColor="#e9d5ff" />
            <stop offset="70%"  stopColor="#c084fc" />
            <stop offset="100%" stopColor="#a21caf" />
          </linearGradient>
          <radialGradient id="lysosome-bg-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#fcfbf7" />
            <stop offset="70%"  stopColor="#fae8ff" />
            <stop offset="100%" stopColor="#f3e8ff" />
          </radialGradient>
        </defs>
      </svg>

      <div className="max-w-7xl mx-auto px-4 py-8 font-['Quicksand',sans-serif] text-neutral-800 bg-[#F0F7FF] min-h-screen">

        {/* Cozy Hand-Drawn Notebook Header */}
        <div className="relative mb-12 p-8 rounded-[30px] border-4 border-neutral-800 bg-[#E5F1FF] shadow-[8px_8px_0px_0px_rgba(31,41,55,1)]">
          {/* Notebook Spiral rings decoration */}
          <div className="absolute -top-4 left-10 flex gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-4 h-8 bg-neutral-300 border-2 border-neutral-800 rounded-full" />
            ))}
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mt-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 border-2 border-neutral-800 text-xs font-bold text-blue-800 uppercase tracking-wider">
                <SparklesIcon className="w-3.5 h-3.5" />
                Personal Study Journal
              </div>
              <h1 className="text-4xl font-extrabold text-neutral-900 tracking-tight font-['Fredoka'] mt-2">
                BioRender Sketchbook Labs
              </h1>
              <p className="text-neutral-600 mt-2 text-sm md:text-base max-w-2xl leading-relaxed font-medium">
                Deepen your mechanical intuition. Interact with high-yield medical simulators rendered in a premium hand-drawn textbook style.
              </p>
            </div>

            {/* Tab selector */}
            <div className="flex flex-wrap gap-2 bg-[#D6E8FC] p-2 rounded-2xl border-3 border-neutral-800">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    id={`tab-select-${t.id}`}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold border-2 border-neutral-800 transition-all duration-300 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(31,41,55,1)] ${
                      activeTab === t.id
                        ? `${t.color} ring-2 ring-neutral-800`
                        : 'bg-white hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'etc'         && <EtcSimulator />}
          {activeTab === 'gpcr'        && <GpcrSimulator />}
          {activeTab === 'lysosomes'   && <LysosomeSimulator />}
          {activeTab === 'replication' && <DnaReplicationSimulator />}
          {activeTab === 'ureacycle'   && <UreaCycleSimulator />}
          {activeTab === 'evaluation'  && <AssetEvaluationLab />}
          {activeTab === 'genetics'    && <GeneticsSimulator />}
          {activeTab === 'biostats'    && <BiostatsSimulator />}
          {activeTab === 'cardio'      && <CardiologySimulator />}
          {activeTab === 'suppressors' && <TumorSuppressorSimulator />}
          {activeTab === 'nephron'     && <NephronSimulator />}
          {activeTab === 'coagulation' && <CoagulationSimulator />}
          {activeTab === 'messengers'  && <SecondMessengerSimulator />}
          {activeTab === 'spirometry'  && <SpirometrySimulator />}
          {activeTab === 'baroreceptors' && <BaroreceptorSimulator />}
          {activeTab === 'gastric'     && <GastricAcidSimulator />}
          {activeTab === 'arrhythmias' && <AntiarrhythmicSimulator />}
          {activeTab === 'complement'  && <ComplementSimulator />}
          {activeTab === 'herniations' && <BrainHerniationSimulator />}
          {activeTab === 'toxins'      && <BacterialToxinSimulator />}
        </div>
      </div>
    </DashboardLayout>
  );
}
