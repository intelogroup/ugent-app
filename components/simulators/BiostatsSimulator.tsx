'use client';

import React, { useState } from 'react';
import {
  CalculatorIcon,
  ChartBarIcon,
  ArrowLongRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

type SubLabMode = 'diagnostic' | 'measures';
type MeasureScenario = 'cohort' | 'case-control' | 'rct';

export default function BiostatsSimulator() {
  const [subLabMode, setSubLabMode] = useState<SubLabMode>('diagnostic');

  // ─── Diagnostic Testing States ───
  const [prevalence, setPrevalence] = useState<number>(10); // 1% to 50%
  const [sensitivity, setSensitivity] = useState<number>(90); // 50% to 100%
  const [specificity, setSpecificity] = useState<number>(85); // 50% to 100%

  // ─── Measures of Effect States ───
  const [scenario, setScenario] = useState<MeasureScenario>('rct');
  const [rateExposed, setRateExposed] = useState<number>(12); // EER or Exposed Rate (1% to 50%)
  const [rateUnexposed, setRateUnexposed] = useState<number>(30); // CER or Unexposed Rate (5% to 60%)
  const [exposureCases, setExposureCases] = useState<number>(45); // Case-Control Exposed Case Rate
  const [exposureControls, setExposureControls] = useState<number>(15); // Case-Control Exposed Control Rate

  // ─── Calculations: Diagnostic testing ───
  const population = 10000;
  const diseasedCount = Math.round(population * (prevalence / 100));
  const healthyCount = population - diseasedCount;

  const truePositives = Math.round(diseasedCount * (sensitivity / 100));
  const falseNegatives = diseasedCount - truePositives;

  const trueNegatives = Math.round(healthyCount * (specificity / 100));
  const falsePositives = healthyCount - trueNegatives;

  const totalTestPositives = truePositives + falsePositives;
  const totalTestNegatives = falseNegatives + trueNegatives;

  const ppv = totalTestPositives > 0 ? (truePositives / totalTestPositives) * 100 : 0;
  const npv = totalTestNegatives > 0 ? (trueNegatives / totalTestNegatives) * 100 : 0;

  const lrPlus = specificity < 100 ? (sensitivity / 100) / (1 - specificity / 100) : 999;
  const lrMinus = specificity > 0 ? (1 - sensitivity / 100) / (specificity / 100) : 0;

  // ─── Calculations: Measures of Effect ───
  const cer = rateUnexposed / 100;
  const eer = rateExposed / 100;

  // Relative Risk (RR)
  const relativeRisk = cer > 0 ? eer / cer : 0;
  // Attributable Risk (AR)
  const attributableRisk = eer - cer;
  // Attributable Risk Percent (ARP)
  const arp = relativeRisk > 1 ? ((relativeRisk - 1) / relativeRisk) * 100 : 0;

  // Odds Ratio (OR)
  const a = exposureCases; // Cases exposed
  const c = 100 - a; // Cases unexposed
  const b = exposureControls; // Controls exposed
  const d = 100 - b; // Controls unexposed
  const oddsRatio = (b * c) > 0 ? (a * d) / (b * c) : 0;

  // RCT metrics
  const isBenefit = eer < cer;
  const arr = Math.abs(cer - eer);
  const rrr = cer > 0 ? (arr / cer) * 100 : 0;
  const nnt = arr > 0 ? Math.ceil(1 / arr) : 0; // Always round up NNT/NNH

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 bg-[#ECF5FF] border-4 border-neutral-800 rounded-[30px] shadow-[8px_8px_0px_0px_rgba(31,41,55,1)]">
      
      {/* Header bar */}
      <div className="lg:col-span-3 pb-6 border-b-2 border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 font-['Fredoka'] flex items-center gap-2">
            <CalculatorIcon className="w-7 h-7 text-cyan-600 animate-pulse" />
            Biostats &amp; Epidemiological Methods Lab
          </h2>
          <p className="text-neutral-600 text-sm mt-2 leading-relaxed max-w-3xl">
            Interact with diagnostic matrices, predictive value curves, and clinical trial cohort metrics. Master the high-yield equations tested on the USMLE Step 1.
          </p>
        </div>

        {/* Sub-lab Mode selector */}
        <div className="flex bg-[#D6E8FC] p-1.5 rounded-2xl border-3 border-neutral-800 self-start md:self-auto shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <button
            onClick={() => setSubLabMode('diagnostic')}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl border transition-all duration-200 ${
              subLabMode === 'diagnostic'
                ? 'bg-white border-neutral-800 text-cyan-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'border-transparent text-neutral-700 hover:bg-white/40'
            }`}
          >
            Diagnostic Matrix
          </button>
          <button
            onClick={() => setSubLabMode('measures')}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl border transition-all duration-200 ${
              subLabMode === 'measures'
                ? 'bg-white border-neutral-800 text-cyan-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'border-transparent text-neutral-700 hover:bg-white/40'
            }`}
          >
            Measures of Effect
          </button>
        </div>
      </div>

      {/* Main Interactive Screen */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* DIAGNOSTIC TESTING MODE */}
        {subLabMode === 'diagnostic' && (
          <div className="bg-[#FAF8F2] border-4 border-neutral-800 rounded-3xl p-6 relative min-h-[460px] flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            
            <div className="z-10">
              <div className="flex justify-between items-center mb-6">
                <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-cyan-100 text-cyan-900 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">
                  Lab Notebook: 2x2 Contingency Table
                </span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Population: N = 10,000</span>
              </div>

              {/* 2x2 Table Layout */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs md:text-sm font-mono max-w-lg mx-auto bg-white p-4 rounded-2xl border-2 border-neutral-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]">
                {/* Headers */}
                <div className="col-span-1" />
                <div className="bg-red-50 text-red-950 font-bold py-1.5 rounded-lg border border-red-200">Disease (+)</div>
                <div className="bg-emerald-50 text-emerald-950 font-bold py-1.5 rounded-lg border border-emerald-200">Disease (-)</div>
                <div className="bg-neutral-100 font-bold py-1.5 rounded-lg border border-neutral-300">Total</div>

                {/* Row 1: Test Positive */}
                <div className="bg-cyan-50 text-cyan-950 font-bold flex items-center justify-center rounded-lg border border-cyan-200">Test (+)</div>
                <div className="bg-emerald-100/50 p-2.5 rounded-xl border border-neutral-800 flex flex-col justify-center shadow-sm">
                  <span className="text-sm font-bold text-emerald-900">{truePositives.toLocaleString()}</span>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-sans font-bold">True Pos (TP)</span>
                </div>
                <div className="bg-red-100/50 p-2.5 rounded-xl border border-neutral-800 flex flex-col justify-center shadow-sm">
                  <span className="text-sm font-bold text-red-900">{falsePositives.toLocaleString()}</span>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-sans font-bold">False Pos (FP)</span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-300 flex flex-col justify-center">
                  <span className="text-sm font-bold text-neutral-600">{totalTestPositives.toLocaleString()}</span>
                </div>

                {/* Row 2: Test Negative */}
                <div className="bg-cyan-50 text-cyan-950 font-bold flex items-center justify-center rounded-lg border border-cyan-200">Test (-)</div>
                <div className="bg-red-100/50 p-2.5 rounded-xl border border-neutral-800 flex flex-col justify-center shadow-sm">
                  <span className="text-sm font-bold text-red-900">{falseNegatives.toLocaleString()}</span>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-sans font-bold">False Neg (FN)</span>
                </div>
                <div className="bg-emerald-100/50 p-2.5 rounded-xl border border-neutral-800 flex flex-col justify-center shadow-sm">
                  <span className="text-sm font-bold text-emerald-900">{trueNegatives.toLocaleString()}</span>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-sans font-bold">True Neg (TN)</span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-300 flex flex-col justify-center">
                  <span className="text-sm font-bold text-neutral-600">{totalTestNegatives.toLocaleString()}</span>
                </div>

                {/* Column Totals */}
                <div className="font-bold py-1.5 text-right flex items-center justify-end pr-2">Total</div>
                <div className="bg-neutral-50 p-1.5 rounded-lg border border-neutral-300 font-bold">{diseasedCount.toLocaleString()}</div>
                <div className="bg-neutral-50 p-1.5 rounded-lg border border-neutral-300 font-bold">{healthyCount.toLocaleString()}</div>
                <div className="bg-neutral-800 text-white p-1.5 rounded-lg font-bold">10,000</div>
              </div>
            </div>

            {/* Interactive Visual Population Cohort (100 dots) */}
            <div className="bg-white p-4 rounded-2xl border-2 border-neutral-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] my-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-neutral-600 uppercase tracking-wide">100-Patient Screen (Visual Mapping)</span>
                <div className="flex gap-3 text-[10px] font-bold">
                  <span className="text-red-650">🔴 Diseased</span>
                  <span className="text-emerald-650">🟢 Healthy</span>
                  <span className="text-neutral-500 font-mono">[+] = Glowing Outline</span>
                </div>
              </div>

              {/* Dot Grid: Left half are Diseased (prevalence), Right half are Healthy */}
              <div className="flex gap-4 p-2 bg-[#EAF4FF]/40 rounded-xl border border-neutral-200 justify-around">
                {/* Diseased Cohort Container */}
                <div className="flex flex-col items-center w-1/2 border-r border-dashed border-neutral-300 pr-2">
                  <span className="text-[9px] font-bold text-red-500 mb-1">Diseased (n = {prevalence})</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 50 }).map((_, i) => {
                      if (i >= prevalence) return <div key={i} className="w-2.5 h-2.5 bg-transparent border border-dashed border-neutral-300 rounded-full" />;
                      const testPositive = i < Math.round(prevalence * (sensitivity / 100));
                      return (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full bg-red-500 border border-neutral-800 transition-all ${
                            testPositive ? 'ring-2 ring-cyan-500 ring-offset-1 shadow-[0_0_6px_rgba(6,182,212,0.8)]' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Healthy Cohort Container */}
                <div className="flex flex-col items-center w-1/2 pl-2">
                  <span className="text-[9px] font-bold text-emerald-600 mb-1">Healthy (n = {100 - prevalence})</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 50 }).map((_, i) => {
                      const healthyLimit = 100 - prevalence;
                      // Determine fill
                      if (i >= healthyLimit - 50) {
                        // Beyond total healthy count, draw empty placeholder
                        const idx = i - (healthyLimit - 50);
                        if (idx >= 0 && idx < 50 - healthyLimit) {
                          return <div key={i} className="w-2.5 h-2.5 bg-transparent border border-dashed border-neutral-300 rounded-full" />;
                        }
                      }
                      
                      // Check if test positive (false positive)
                      const totalHealthyRepresented = Math.max(0, 100 - prevalence);
                      const falsePositiveLimit = Math.round(totalHealthyRepresented * (1 - specificity / 100));
                      const testPositive = i < falsePositiveLimit;

                      return (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full bg-emerald-400 border border-neutral-800 transition-all ${
                            testPositive ? 'ring-2 ring-cyan-500 ring-offset-1 shadow-[0_0_6px_rgba(6,182,212,0.8)]' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-neutral-400 text-center mt-2 italic">
                Notice: Observe how increasing test sensitivity adds glow outlines to more red circles (reducing False Negatives), while specificity additions remove glows from green circles (reducing False Positives).
              </p>
            </div>

            {/* Live Explanation Bar */}
            <div className="bg-white p-3 rounded-2xl border-2 border-neutral-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-xs text-neutral-700 leading-relaxed">
                💡 <span className="font-bold underline text-cyan-900">Prevalence Hook</span>: Try decreasing Prevalence to 2%. Observe how the number of False Positives surpasses True Positives. This causes your **PPV to crash to ~{Math.round(ppv)}%** even though Sensitivity ({sensitivity}%) and Specificity ({specificity}%) remain high!
              </p>
            </div>
          </div>
        )}

        {/* MEASURES OF EFFECT MODE */}
        {subLabMode === 'measures' && (
          <div className="bg-[#FAF8F2] border-4 border-neutral-800 rounded-3xl p-6 relative min-h-[460px] flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            
            <div className="z-10">
              <div className="flex justify-between items-center mb-6">
                <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-950 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">
                  Clinical Trial &amp; Risk Simulator
                </span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase">
                  Active Scenario: {scenario === 'cohort' ? 'Cohort Study' : scenario === 'case-control' ? 'Case-Control Study' : 'RCT Interventions'}
                </span>
              </div>

              {/* Cohort Grid Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border-2 border-neutral-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]">
                
                {/* Cohort 1: Treatment / Exposed */}
                <div className="p-3 bg-cyan-50/50 rounded-xl border border-neutral-200">
                  <h4 className="text-xs font-black uppercase text-neutral-600 mb-2 flex justify-between">
                    <span>{scenario === 'cohort' ? 'Exposed (Smoking)' : scenario === 'case-control' ? 'Cases (Diseased)' : 'Treatment Group'}</span>
                    <span className="text-red-650 font-mono">{scenario === 'case-control' ? `${exposureCases}% Exposed` : `${rateExposed}% Events`}</span>
                  </h4>
                  
                  {/* Grid of 50 stick-figure dots */}
                  <div className="grid grid-cols-10 gap-1 my-2">
                    {Array.from({ length: 50 }).map((_, i) => {
                      const limit = scenario === 'case-control' ? Math.round(50 * (exposureCases / 100)) : Math.round(50 * (rateExposed / 100));
                      const isAffected = i < limit;
                      return (
                        <div
                          key={i}
                          className={`h-4 w-2 rounded-t-full border border-neutral-800 relative transition-all ${
                            isAffected ? 'bg-red-500' : 'bg-emerald-400'
                          }`}
                          title={isAffected ? 'Outcome (+)' : 'Outcome (-)'}
                        >
                          <div className="absolute -top-1 left-0 w-1.5 h-1.5 rounded-full bg-neutral-800" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cohort 2: Placebo / Unexposed */}
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <h4 className="text-xs font-black uppercase text-neutral-600 mb-2 flex justify-between">
                    <span>{scenario === 'cohort' ? 'Unexposed (Non-Smoking)' : scenario === 'case-control' ? 'Controls (Healthy)' : 'Placebo Group'}</span>
                    <span className="text-neutral-500 font-mono">{scenario === 'case-control' ? `${exposureControls}% Exposed` : `${rateUnexposed}% Events`}</span>
                  </h4>
                  
                  {/* Grid of 50 stick-figure dots */}
                  <div className="grid grid-cols-10 gap-1 my-2">
                    {Array.from({ length: 50 }).map((_, i) => {
                      const limit = scenario === 'case-control' ? Math.round(50 * (exposureControls / 100)) : Math.round(50 * (rateUnexposed / 100));
                      const isAffected = i < limit;
                      return (
                        <div
                          key={i}
                          className={`h-4 w-2 rounded-t-full border border-neutral-800 relative transition-all ${
                            isAffected ? 'bg-red-450' : 'bg-emerald-400'
                          }`}
                          title={isAffected ? 'Outcome (+)' : 'Outcome (-)'}
                        >
                          <div className="absolute -top-1 left-0 w-1.5 h-1.5 rounded-full bg-neutral-800" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Explanation & Math equations details */}
            <div className="bg-white p-4 rounded-2xl border-2 border-neutral-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mt-4 space-y-2.5">
              {scenario === 'cohort' && (
                <>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                    <span className="bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">Relative Risk (RR): {relativeRisk.toFixed(2)}</span>
                    <span className="bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">Attributable Risk (AR): {Math.abs(attributableRisk * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-normal">
                    📈 **Interpretation**: Risk in exposed vs. risk in unexposed. $RR = {relativeRisk.toFixed(2)}$ means smokers are {relativeRisk.toFixed(1)}x as likely to develop the outcome. The $AR$ indicates that {Math.abs(attributableRisk * 100).toFixed(1)} cases of lung disease per 100 smokers are directly attributable to smoking.
                  </p>
                </>
              )}
              {scenario === 'case-control' && (
                <>
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-950">
                    <span className="bg-cyan-100 px-2 py-0.5 rounded border border-cyan-300">Odds Ratio (OR): {oddsRatio.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-normal">
                    🔍 **Interpretation**: Odds of exposure in cases vs. controls. $OR = {oddsRatio.toFixed(2)}$ means patients with the disease have {oddsRatio.toFixed(1)}x higher odds of reporting exposure history. Standard measure of effect for retrospective case-control studies.
                  </p>
                </>
              )}
              {scenario === 'rct' && (
                <>
                  <div className="flex flex-wrap gap-2 text-xs font-bold text-amber-950">
                    <span className="bg-amber-100 px-2 py-0.5 rounded border border-amber-300">ARR: {(arr * 100).toFixed(1)}%</span>
                    <span className="bg-amber-100 px-2 py-0.5 rounded border border-amber-300">RRR: {rrr.toFixed(1)}%</span>
                    <span className="bg-red-100 text-red-950 px-2 py-0.5 rounded border border-red-300 font-extrabold uppercase animate-pulse">NNT: {nnt} Patients</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-normal">
                    ⚡ **High-Yield Clinical Calculation**: You must treat **{nnt}** patients with the new drug to prevent **1** additional adverse outcome.
                    Equation: $NNT = 1 / ARR = 1 / ({(cer - eer).toFixed(2)}) = {nnt}$.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Side Controllers Panel */}
      <div className="space-y-6">
        
        {/* DIAGNOSTIC PANEL SIDEBAR CONTROLS */}
        {subLabMode === 'diagnostic' && (
          <div className="bg-white p-6 rounded-2xl border-3 border-neutral-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-5">
            <h3 className="text-md font-bold text-neutral-800 font-['Fredoka']">Variable Parameters</h3>
            
            {/* Disease Prevalence */}
            <div>
              <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                <span>Disease Prevalence:</span>
                <span className="text-cyan-700">{prevalence}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={prevalence}
                onChange={(e) => setPrevalence(Number(e.target.value))}
                className="w-full accent-cyan-600 cursor-pointer"
              />
              <span className="text-[9px] text-neutral-400 block mt-0.5">Increases the pre-test probability of finding the disease.</span>
            </div>

            {/* Test Sensitivity */}
            <div>
              <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                <span>Sensitivity (True Positive Rate):</span>
                <span className="text-emerald-700">{sensitivity}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[9px] text-neutral-400 block mt-0.5">Reduces False Negatives (TP / Diseased). Used for screening.</span>
            </div>

            {/* Test Specificity */}
            <div>
              <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                <span>Specificity (True Negative Rate):</span>
                <span className="text-rose-700">{specificity}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={specificity}
                onChange={(e) => setSpecificity(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[9px] text-neutral-400 block mt-0.5">Reduces False Positives (TN / Healthy). Used to confirm.</span>
            </div>
          </div>
        )}

        {/* MEASURES OF EFFECT SIDEBAR CONTROLS */}
        {subLabMode === 'measures' && (
          <div className="bg-white p-6 rounded-2xl border-3 border-neutral-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Study Type Selector</h3>
              <div className="grid grid-cols-1 gap-1.5">
                {(
                  [
                    { id: 'rct', label: 'Randomized Controlled Trial (RCT)' },
                    { id: 'cohort', label: 'Cohort Study (Relative Risk)' },
                    { id: 'case-control', label: 'Case-Control Study (Odds Ratio)' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setScenario(s.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs border-2 font-bold transition-all ${
                      scenario === s.id
                        ? 'bg-emerald-50 border-emerald-800 text-emerald-950 shadow-[2px_2px_0px_0px_rgba(6,95,70,1)]'
                        : 'bg-white border-neutral-300 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter Sliders depending on active scenario */}
            {scenario !== 'case-control' ? (
              <div className="space-y-4 pt-2 border-t border-neutral-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Event Rates</h3>
                
                {/* Exposed Event Rate / EER */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                    <span>{scenario === 'cohort' ? 'Exposed Risk (EER):' : 'Experimental Group Risk (EER):'}</span>
                    <span className="text-red-600">{rateExposed}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={rateExposed}
                    onChange={(e) => setRateExposed(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                </div>

                {/* Unexposed Event Rate / CER */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                    <span>{scenario === 'cohort' ? 'Unexposed Risk (CER):' : 'Placebo Group Risk (CER):'}</span>
                    <span className="text-neutral-700">{rateUnexposed}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={rateUnexposed}
                    onChange={(e) => setRateUnexposed(Number(e.target.value))}
                    className="w-full accent-neutral-800 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              // Case-Control exposure parameters
              <div className="space-y-4 pt-2 border-t border-neutral-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">History of Exposure Rates</h3>
                
                {/* Cases Exposure Rate */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                    <span>Exposure in Cases (Diseased):</span>
                    <span className="text-red-600">{exposureCases}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    value={exposureCases}
                    onChange={(e) => setExposureCases(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                </div>

                {/* Controls Exposure Rate */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                    <span>Exposure in Controls (Healthy):</span>
                    <span className="text-emerald-700">{exposureControls}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    value={exposureControls}
                    onChange={(e) => setExposureControls(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* High-Yield Metrics Board */}
        <div className="bg-white p-6 rounded-2xl border-3 border-neutral-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] space-y-4">
          <h3 className="text-md font-bold text-neutral-800 font-['Fredoka']">Math Reference &amp; Board Formulas</h3>
          <div className="space-y-3.5 text-xs text-neutral-700">
            {subLabMode === 'diagnostic' ? (
              <>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <span className="font-mono font-bold block text-cyan-900">Sensitivity:</span>
                  <span className="font-mono text-neutral-500">Sensitivity = TP / (TP + FN)</span>
                  <p className="text-[10px] text-neutral-500 mt-1 leading-normal">Ability of a test to detect disease. SnNout: a Highly **S**ensitive test, when **N**egative, rules **out** disease.</p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <span className="font-mono font-bold block text-rose-900">Specificity:</span>
                  <span className="font-mono text-neutral-500">Specificity = TN / (TN + FP)</span>
                  <p className="text-[10px] text-neutral-500 mt-1 leading-normal">Ability of a test to confirm health. SpPinn: a Highly **S**pecific test, when **P**ositive, rules **in** disease.</p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <span className="font-mono font-bold block text-emerald-900">PPV &amp; NPV:</span>
                  <span className="font-mono text-neutral-500">PPV = TP / (TP + FP) | NPV = TN / (TN + FN)</span>
                  <p className="text-[10px] text-neutral-500 mt-1 leading-normal">Probability that test result matches reality. Highly dependent on population prevalence.</p>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <span className="font-mono font-bold block text-amber-950">Likelihood Ratios:</span>
                  <span className="font-mono text-neutral-500">LR+ = Sens / (1 - Spec) = {lrPlus.toFixed(2)}</span>
                  <span className="font-mono text-neutral-500 block">LR- = (1 - Sens) / Spec = {lrMinus.toFixed(2)}</span>
                  <p className="text-[10px] text-neutral-500 mt-1 leading-normal">Used to calculate post-test probability. Unaffected by prevalence.</p>
                </div>
              </>
            ) : (
              <>
                {scenario === 'cohort' && (
                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="font-mono font-bold block text-emerald-900">Relative Risk (RR):</span>
                    <span className="font-mono text-neutral-500">RR = Risk[exposed] / Risk[unexposed] = EER / CER</span>
                    <p className="text-[10px] text-neutral-500 mt-1 leading-normal">Measures association between exposure and outcome. Used in Prospective and Retrospective Cohort studies.</p>
                  </div>
                )}
                {scenario === 'case-control' && (
                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="font-mono font-bold block text-cyan-900">Odds Ratio (OR):</span>
                    <span className="font-mono text-neutral-500">OR = (A/C) / (B/D) = (A * D) / (B * C)</span>
                    <p className="text-[10px] text-neutral-500 mt-1 leading-normal">Measures exposure history odds in cases vs. controls. Used in retrospective Case-Control studies.</p>
                  </div>
                )}
                {scenario === 'rct' && (
                  <>
                    <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                      <span className="font-mono font-bold block text-amber-900">Absolute Risk Reduction (ARR):</span>
                      <span className="font-mono text-neutral-500">ARR = |CER - EER| = {Math.abs(cer - eer).toFixed(2)}</span>
                      <p className="text-[10px] text-neutral-500 mt-1 leading-normal">Absolute difference in risk between the unexposed (control) and treatment (experimental) groups.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                      <span className="font-mono font-bold block text-red-900 font-extrabold">Number Needed to Treat (NNT):</span>
                      <span className="font-mono text-neutral-500">NNT = 1 / ARR = 1 / {arr.toFixed(3)}</span>
                      <p className="text-[10px] text-neutral-500 mt-1 leading-normal">Number of patients treated to prevent one adverse outcome. Round up to the next integer.</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
