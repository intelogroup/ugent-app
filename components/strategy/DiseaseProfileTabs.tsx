'use client';

import { useState } from 'react';

type ClinicalContext = {
  age?: string;
  gender?: string;
  physiologyState?: string;
  onsetPattern?: string;
};

type Discriminator = {
  distractor: string;
  ruleOutFact: string;
};

type DiseaseProfile = {
  diseaseName: string;
  topicType?: string;
  questionCount: number;
  mechanisms: string[];
  clues: string[];
  keySymptoms: string[];
  discriminators: Discriminator[];
  prerequisites: string[];
  clinicalContexts: ClinicalContext[];
};

type Props = { profile: DiseaseProfile };

const TABS = ['Recognize It', 'Understand It', "Don't Get Fooled"] as const;

export default function DiseaseProfileTabs({ profile }: Props) {
  const [active, setActive] = useState<(typeof TABS)[number]>('Recognize It');

  return (
    <div>
      <div className="flex gap-1 border-b border-neutral-200 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              active === tab
                ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === 'Recognize It' && (
        <div className="space-y-4">
          {profile.keySymptoms.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Key Symptoms</h4>
              <div className="flex flex-wrap gap-2">
                {profile.keySymptoms.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">{s}</span>
                ))}
              </div>
            </div>
          )}
          {profile.clues.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">High-Leverage Clues</h4>
              <ul className="space-y-1">
                {profile.clues.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className="text-primary-500 mt-0.5">→</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {profile.clinicalContexts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Clinical Context</h4>
              <div className="flex flex-wrap gap-2">
                {profile.clinicalContexts.map((ctx, i) => (
                  <div key={i} className="flex gap-1 flex-wrap">
                    {ctx.age && <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">{ctx.age}</span>}
                    {ctx.gender && <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">{ctx.gender}</span>}
                    {ctx.physiologyState && <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">{ctx.physiologyState}</span>}
                    {ctx.onsetPattern && <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">{ctx.onsetPattern}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {active === 'Understand It' && (
        <div className="space-y-4">
          {profile.mechanisms.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">What Gets Tested</h4>
              <ul className="space-y-2">
                {profile.mechanisms.map((m, i) => (
                  <li key={i} className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-neutral-800">{m}</li>
                ))}
              </ul>
            </div>
          )}
          {profile.prerequisites.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Prerequisites</h4>
              <ul className="space-y-1">
                {profile.prerequisites.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {profile.mechanisms.length === 0 && profile.prerequisites.length === 0 && (
            <p className="text-sm text-neutral-400 italic">No mechanism data extracted yet.</p>
          )}
        </div>
      )}

      {active === "Don't Get Fooled" && (
        <div>
          {profile.discriminators.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide w-1/2">Wrong answer (distractor)</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide w-1/2">Why it&apos;s wrong</th>
                </tr>
              </thead>
              <tbody>
                {profile.discriminators.map((d, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="py-2.5 px-3 text-rose-700 font-medium">{d.distractor}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{d.ruleOutFact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-neutral-400 italic">No discriminator data extracted yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
