'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

type ValvularPreset = 'normal' | 'as' | 'ar' | 'ms' | 'mr';

export default function CardiologySimulator() {
  const [preset, setPreset] = useState<ValvularPreset>('normal');

  // Sliders: base values (0 to 100 representing range of interest)
  const [preload, setPreload] = useState<number>(50); // scales EDV
  const [afterload, setAfterload] = useState<number>(50); // scales peak arterial pressure
  const [contractility, setContractility] = useState<number>(50); // scales ESPVR slope

  // When preset changes, lock parameters to textbook values
  useEffect(() => {
    switch (preset) {
      case 'normal':
        setPreload(50);
        setAfterload(50);
        setContractility(50);
        break;
      case 'as': // Aortic Stenosis: High Afterload, Compensatory hypertrophy (Contractility holds or raises, let's keep high afterload)
        setPreload(50);
        setAfterload(95);
        setContractility(65);
        break;
      case 'ar': // Aortic Regurgitation: High Preload (EDV), High Stroke Volume, Low diastolic pressure
        setPreload(95);
        setAfterload(40);
        setContractility(60);
        break;
      case 'ms': // Mitral Stenosis: Low Preload (EDV), low SV
        setPreload(20);
        setAfterload(40);
        setContractility(45);
        break;
      case 'mr': // Mitral Regurgitation: Increased Preload (EDV), decreased ESV
        setPreload(75);
        setAfterload(45);
        setContractility(50);
        break;
    }
  }, [preset]);

  // Dynamic PV Loop calculations based on parameters
  // Map sliders (0-100) to clinical ranges:
  // EDV range: 70mL to 240mL
  const edvVal = 100 + (preload - 50) * 1.8;
  // ESPVR Slope Ees range: 1.0 to 5.0 mmHg/mL
  const eesVal = 2.5 + (contractility - 50) * 0.04;
  // Afterload / Arterial Elastance Ea range: 1.0 to 4.5 mmHg/mL
  const eaVal = 2.0 + (afterload - 50) * 0.04;

  // Let's compute stable intersection points for the loop:
  // Simplified ventricular model:
  // ESV = EDV * (Ea / (Ees + Ea))
  // ESP = EDV * (Ees * Ea / (Ees + Ea))
  let esvVal = edvVal * (eaVal / (eesVal + eaVal));
  let espVal = edvVal * ((eesVal * eaVal) / (eesVal + eaVal));

  // Adjustments for valvular presets to create classic textbook visual loops
  if (preset === 'as') {
    // AS has huge pressure gradient across valve, high ESP inside ventricle
    espVal = espVal * 1.55;
    esvVal = esvVal * 1.2;
  } else if (preset === 'ar') {
    // AR has massive EDV and high SV
    esvVal = esvVal * 0.85; // lower ESV due to hyperdynamic ejection
  } else if (preset === 'ms') {
    // MS has low filling
    esvVal = esvVal * 1.0;
  } else if (preset === 'mr') {
    // MR has lower ESV due to ejection into low pressure LA
    esvVal = esvVal * 0.7;
  }

  // Basic outcomes
  const sv = Math.max(10, Math.round(edvVal - esvVal));
  const ef = Math.max(5, Math.round((sv / edvVal) * 100));
  const cardiacWork = Math.round(sv * espVal * 0.0133); // in Joules approx

  // Coordinate mapping for SVG (width=400, height=300)
  // X-axis: Volume (0 to 250 mL) -> map to (40 to 380 px)
  // Y-axis: Pressure (0 to 220 mmHg) -> map to (260 to 20 px)
  const mapX = (vol: number) => 40 + (vol / 250) * 340;
  const mapY = (pres: number) => 260 - (pres / 220) * 240;

  // Key loop points
  // 1. End-diastolic point (bottom-right)
  const edpDefault = 8 + (preload - 50) * 0.1;
  const edpVal = preset === 'ar' ? edpDefault * 2.2 : preset === 'mr' ? edpDefault * 1.7 : edpDefault;
  const ptED = { x: mapX(edvVal), y: mapY(edpVal) };

  // 2. Aortic valve opening (top-right-ish)
  const avoPres = espVal * 0.65;
  const ptAVO = { x: mapX(edvVal), y: mapY(avoPres) };

  // 3. Peak Systolic Pressure / End-Systolic (top-left)
  const ptES = { x: mapX(esvVal), y: mapY(espVal) };

  // 4. Mitral valve opening (bottom-left)
  const mvpVal = 3 + (afterload - 50) * 0.05;
  const ptMVO = { x: mapX(esvVal), y: mapY(mvpVal) };

  // Build the PV Loop SVG Path
  // Standard loop has vertical isovolumetric phases (contraction, relaxation)
  // Regurgitations break these boundaries (no isovolumetric phases)
  let loopPath = '';
  if (preset === 'ar') {
    // Aortic Regurgitation: Slanted filling, continuous leak, no isovolumetric contraction
    // From MVO to ED: curved filling with high pressures
    // From ED to ES: slanted contraction (ejects as it contracts)
    // From ES to MVO: slanted relaxation (leaks back from aorta)
    loopPath = `
      M ${ptMVO.x} ${ptMVO.y}
      Q ${(ptMVO.x + ptED.x) / 2} ${ptED.y + 10}, ${ptED.x} ${ptED.y}
      C ${ptED.x - 10} ${(ptED.y + ptAVO.y) / 2}, ${ptED.x - 40} ${ptAVO.y - 10}, ${ptES.x + 50} ${ptES.y - 15}
      Q ${ptES.x} ${ptES.y}, ${ptES.x} ${ptES.y}
      C ${ptES.x + 20} ${(ptES.y + ptMVO.y) / 2}, ${ptES.x + 10} ${ptMVO.y + 15}, ${ptMVO.x} ${ptMVO.y}
    `;
  } else if (preset === 'mr') {
    // Mitral Regurgitation: Leaks back into LA during contraction and relaxation
    loopPath = `
      M ${ptMVO.x} ${ptMVO.y}
      Q ${(ptMVO.x + ptED.x) / 2} ${ptED.y + 5}, ${ptED.x} ${ptED.y}
      C ${ptED.x - 15} ${(ptED.y + ptAVO.y) / 2}, ${ptED.x - 30} ${ptAVO.y - 5}, ${ptES.x + 40} ${ptES.y - 10}
      Q ${ptES.x} ${ptES.y}, ${ptES.x} ${ptES.y}
      C ${ptES.x - 10} ${(ptES.y + ptMVO.y) / 2}, ${ptES.x - 5} ${ptMVO.y + 10}, ${ptMVO.x} ${ptMVO.y}
    `;
  } else {
    // Normal, AS, MS: Clean Isovolumetric phases
    loopPath = `
      M ${ptMVO.x} ${ptMVO.y}
      Q ${(ptMVO.x + ptED.x) / 2} ${ptED.y + 5}, ${ptED.x} ${ptED.y}
      L ${ptAVO.x} ${ptAVO.y}
      C ${ptAVO.x - 20} ${ptES.y - 25}, ${ptES.x + 40} ${ptES.y - 15}, ${ptES.x} ${ptES.y}
      L ${ptMVO.x} ${ptMVO.y}
    `;
  }

  // Draw ESPVR Line (slope from origin passing through top-left corner ES point)
  const espvrSlope = (260 - ptES.y) / ptES.x;
  const espvrX2 = 380;
  const espvrY2 = 260 - espvrSlope * espvrX2;

  // Draw EDPVR Line (bottom curves showing filling limits)
  const edpvrPath = `M ${mapX(40)} ${mapY(2)} Q ${mapX(140)} ${mapY(5)}, ${mapX(240)} ${mapY(25)}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 bg-[#FFEFEF] border-4 border-neutral-800 rounded-[30px] shadow-[8px_8px_0px_0px_rgba(31,41,55,1)]">
      
      {/* Header bar */}
      <div className="lg:col-span-3 pb-6 border-b-2 border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 font-['Fredoka'] flex items-center gap-2">
            <HeartIcon className="w-7 h-7 text-red-600 animate-pulse" />
            Cardiology PV Loops &amp; Valvular Simulator
          </h2>
          <p className="text-neutral-600 text-sm mt-2 leading-relaxed max-w-3xl">
            Manipulate ventricular parameters and test presets for high-yield USMLE Step 1 cardiac physiology. Watch how pressure-volume boundaries shift dynamically.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap bg-[#FFDFDF] p-1.5 rounded-2xl border-3 border-neutral-800 gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {[
            { id: 'normal', name: 'Normal' },
            { id: 'as',     name: 'Aortic Stenosis' },
            { id: 'ar',     name: 'Aortic Regurg' },
            { id: 'ms',     name: 'Mitral Stenosis' },
            { id: 'mr',     name: 'Mitral Regurg' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id as ValvularPreset)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all duration-250 ${
                preset === item.id
                  ? 'bg-red-650 border-neutral-800 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'border-transparent text-neutral-800 hover:bg-white/40'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main PV Loop Plot */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border-4 border-neutral-800 rounded-3xl p-6 relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          
          <div className="z-10 flex flex-col md:flex-row md:items-center justify-between mb-4">
            <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-red-105 text-red-950 border-2 border-neutral-800 uppercase tracking-widest font-['Fredoka']">
              Ventricular Pressure-Volume Loop
            </span>
            <span className="text-[10px] font-bold text-neutral-500 font-mono mt-1 md:mt-0">
              Active State: {preset.toUpperCase()}
            </span>
          </div>

          <div className="relative flex justify-center items-center">
            {/* Beating heart visual indicator */}
            <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
              <div className="relative w-4 h-4">
                <HeartIcon className="w-4 h-4 text-red-650 animate-ping absolute" />
                <HeartIcon className="w-4 h-4 text-red-600 absolute" />
              </div>
              <span className="text-[10px] font-bold text-red-900 font-mono">
                {ef > 55 ? 'Hyperdynamic' : ef < 40 ? 'Depressed EF' : 'Normal EF'}
              </span>
            </div>

            {/* SVG Plot */}
            <svg
              viewBox="0 0 400 300"
              className="w-full max-w-lg filter drop-shadow-sm"
              style={{ filter: 'url(#hand-drawn-wiggle-fine)' }}
            >
              {/* Grid Lines */}
              <line x1="40" y1="260" x2="380" y2="260" stroke="#1f2937" strokeWidth="2.5" /> {/* X-axis */}
              <line x1="40" y1="20" x2="40" y2="260" stroke="#1f2937" strokeWidth="2.5" />  {/* Y-axis */}
              
              {/* Reference Lines & Slopes */}
              {/* ESPVR Slope */}
              <line
                x1="40"
                y1="260"
                x2={espvrX2}
                y2={espvrY2}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text x={espvrX2 - 40} y={espvrY2 - 8} className="text-[10px] font-bold text-red-650 font-mono">ESPVR (Ees)</text>

              {/* EDPVR Curve */}
              <path
                d={edpvrPath}
                fill="none"
                stroke="#059669"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text x={mapX(210)} y={mapY(35)} className="text-[10px] font-bold text-emerald-600 font-mono">EDPVR</text>

              {/* Dynamic Loop */}
              <path
                d={loopPath}
                fill="rgba(239, 68, 68, 0.08)"
                stroke="#1f2937"
                strokeWidth="3.5"
                className="transition-all duration-300"
              />

              {/* Markers for Key phases */}
              {/* End-systolic volume point */}
              <circle cx={ptES.x} cy={ptES.y} r="5.5" fill="#ef4444" stroke="#000" strokeWidth="2" />
              <text x={ptES.x - 22} y={ptES.y - 12} className="text-[9px] font-mono font-bold bg-white px-1">ESV</text>

              {/* End-diastolic volume point */}
              <circle cx={ptED.x} cy={ptED.y} r="5.5" fill="#10b981" stroke="#000" strokeWidth="2" />
              <text x={ptED.x - 5} y={ptED.y + 14} className="text-[9px] font-mono font-bold bg-white px-1">EDV</text>

              {/* Valve Points */}
              {/* Aortic Opening */}
              <circle cx={ptAVO.x} cy={ptAVO.y} r="4" fill="#3b82f6" stroke="#000" strokeWidth="1.5" />
              <text x={ptAVO.x + 8} y={ptAVO.y + 3} className="text-[8px] font-bold text-neutral-500">Aortic Opens</text>

              {/* Mitral Opening */}
              <circle cx={ptMVO.x} cy={ptMVO.y} r="4" fill="#8b5cf6" stroke="#000" strokeWidth="1.5" />
              <text x={ptMVO.x - 65} y={ptMVO.y + 3} className="text-[8px] font-bold text-neutral-500">Mitral Opens</text>

              {/* Axis Labels */}
              <text x="350" y="280" className="text-[10px] font-bold font-mono">Vol (mL)</text>
              <text x="10" y="30" className="text-[10px] font-bold font-mono rotate-90 origin-left">Pressure (mmHg)</text>

              {/* Helper ticks */}
              <text x={mapX(50)} y="272" className="text-[8px] font-mono text-neutral-400">50</text>
              <text x={mapX(100)} y="272" className="text-[8px] font-mono text-neutral-400">100</text>
              <text x={mapX(150)} y="272" className="text-[8px] font-mono text-neutral-400">150</text>
              <text x={mapX(200)} y="272" className="text-[8px] font-mono text-neutral-400">200</text>

              <text x="28" y={mapY(50)} className="text-[8px] font-mono text-neutral-400">50</text>
              <text x="24" y={mapY(100)} className="text-[8px] font-mono text-neutral-400">100</text>
              <text x="24" y={mapY(150)} className="text-[8px] font-mono text-neutral-400">150</text>
              <text x="24" y={mapY(200)} className="text-[8px] font-mono text-neutral-400">200</text>
            </svg>
          </div>
        </div>

        {/* Phase Breakdown Card */}
        <div className="bg-[#FAF8F2] border-4 border-neutral-800 rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-white rounded-xl border-2 border-neutral-800 text-center">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Isovolumetric Contrac.</span>
            <p className="text-xs text-neutral-600 mt-1">Mitral closes to Aortic opening. Ventricle squeezes, volume constant.</p>
          </div>
          <div className="p-3 bg-white rounded-xl border-2 border-neutral-800 text-center">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Systolic Ejection</span>
            <p className="text-xs text-neutral-600 mt-1">Aortic opens to Aortic closure. Blood enters aorta; volume drops.</p>
          </div>
          <div className="p-3 bg-white rounded-xl border-2 border-neutral-800 text-center">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Isovolumetric Relax.</span>
            <p className="text-xs text-neutral-600 mt-1">Aortic closes to Mitral opening. Ventricle relaxes, volume constant.</p>
          </div>
          <div className="p-3 bg-white rounded-xl border-2 border-neutral-800 text-center">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Diastolic Filling</span>
            <p className="text-xs text-neutral-600 mt-1">Mitral opens to Mitral closure. Blood fills LV; volume rises.</p>
          </div>
        </div>
      </div>

      {/* Control Panel / Sliders & Statistics */}
      <div className="space-y-6">
        
        {/* Real-time calculated outcomes */}
        <div className="bg-white border-4 border-neutral-800 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-lg font-bold text-neutral-900 font-['Fredoka'] mb-4 flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-neutral-800" />
            Hemodynamics
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-neutral-100">
              <span className="text-xs font-bold text-neutral-500 uppercase">End-Diastolic Vol (EDV)</span>
              <span className="font-mono font-bold text-sm text-neutral-900">{Math.round(edvVal)} mL</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-neutral-100">
              <span className="text-xs font-bold text-neutral-500 uppercase">End-Systolic Vol (ESV)</span>
              <span className="font-mono font-bold text-sm text-neutral-900">{Math.round(esvVal)} mL</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-neutral-100 bg-red-50/50 px-2 rounded-lg">
              <span className="text-xs font-bold text-red-950 uppercase">Stroke Volume (SV)</span>
              <span className="font-mono font-bold text-sm text-red-900">{sv} mL</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-neutral-100 bg-emerald-50/50 px-2 rounded-lg">
              <span className="text-xs font-bold text-emerald-950 uppercase">Ejection Fraction (EF)</span>
              <span className="font-mono font-bold text-sm text-emerald-900">{ef}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs font-bold text-neutral-500 uppercase">Stroke Work</span>
              <span className="font-mono font-bold text-sm text-neutral-900">~{cardiacWork} Joules</span>
            </div>
          </div>
        </div>

        {/* Dynamic Variable Parameters */}
        <div className="bg-white border-4 border-neutral-800 rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-base font-bold text-neutral-950 uppercase tracking-wider mb-4">
            Variable Parameters
          </h3>

          <div className="space-y-5">
            {/* Preload Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                <span>Preload (EDV baseline)</span>
                <span className="text-red-650">{preload}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                value={preload}
                disabled={preset !== 'normal'}
                onChange={(e) => setPreload(Number(e.target.value))}
                className="w-full accent-red-600 cursor-pointer disabled:opacity-50"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Increases filling capacity of the ventricle.</span>
            </div>

            {/* Afterload Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                <span>Afterload (Arterial Pressure)</span>
                <span className="text-red-650">{afterload}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                value={afterload}
                disabled={preset !== 'normal'}
                onChange={(e) => setAfterload(Number(e.target.value))}
                className="w-full accent-red-600 cursor-pointer disabled:opacity-50"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Increases pressure the LV must overcome.</span>
            </div>

            {/* Contractility Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1">
                <span>Inotropy (Contractility)</span>
                <span className="text-red-650">{contractility}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                value={contractility}
                disabled={preset !== 'normal'}
                onChange={(e) => setContractility(Number(e.target.value))}
                className="w-full accent-red-600 cursor-pointer disabled:opacity-50"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">Increases ESPVR slope, enhancing empty-out.</span>
            </div>

            {preset !== 'normal' && (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-start gap-2">
                <InformationCircleIcon className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <span className="text-[10px] text-amber-800 leading-normal">
                  Sliders are disabled under active pathology presets to lock high-yield Step 1 parameters. Toggle back to <strong>Normal</strong> to custom fine-tune.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* High Yield Key Clinical Notes */}
        <div className="bg-[#FAF8F2] border-4 border-neutral-800 rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mb-2">Clinical Pearls (Step 1)</h4>
          <ul className="text-xs text-neutral-600 space-y-2 list-disc pl-4 leading-normal">
            <li><strong>Aortic Stenosis:</strong> Systolic murmur. Compensated by LV hypertrophy (higher ESPVR). LV works harder against huge afterload.</li>
            <li><strong>Aortic Regurgitation:</strong> Decrescendo diastolic murmur. Rapid backflow during diastole creates massive preload and hyperdynamic SV.</li>
            <li><strong>Mitral Stenosis:</strong> Diastolic rumble. Poor filling drops EDV, reducing Cardiac Output.</li>
            <li><strong>Mitral Regurgitation:</strong> Holosystolic murmur. Blood leaks back into LA, eliminating clean isovolumetric phases.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
