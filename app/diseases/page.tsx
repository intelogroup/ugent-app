'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import type { SystemDiseaseGroup } from '@/lib/curriculum/disease-reference';

export default function DiseaseReferencePage() {
  const [data, setData] = useState<SystemDiseaseGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  const [expandedDiseases, setExpandedDiseases] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/disease-reference')
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setData(json);
        if (json.length > 0) {
          setExpandedSystems(new Set([json[0].system]));
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleSystem = (sys: string) => {
    setExpandedSystems(prev => {
      const next = new Set(prev);
      if (next.has(sys)) next.delete(sys);
      else next.add(sys);
      return next;
    });
  };

  const toggleDisease = (key: string) => {
    setExpandedDiseases(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = data
    .map(sys => ({
      ...sys,
      diseases: sys.diseases.filter(d =>
        d.diseaseName.toLowerCase().includes(search.toLowerCase()) ||
        d.keySymptoms.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
        d.mechanism.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(sys => sys.diseases.length > 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[#0E7490] border-t-transparent rounded-full" />
          <span className="ml-3 text-neutral-500">Loading disease reference...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Disease Manifestations by System</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {data.reduce((s, sys) => s + sys.diseases.length, 0)} diseases across {data.length} systems
          </p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search disease, symptom, or mechanism..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0E7490] focus:border-transparent"
          />
        </div>

        <div className="space-y-3">
          {filtered.map(sys => (
            <div key={sys.system} className="card overflow-hidden">
              <button
                onClick={() => toggleSystem(sys.system)}
                className="w-full p-4 text-left hover:bg-neutral-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs text-neutral-400 transition-transform ${expandedSystems.has(sys.system) ? 'rotate-90' : ''}`}>
                    &#9654;
                  </span>
                  <div>
                    <span className="text-base font-semibold text-neutral-900">{sys.system}</span>
                    <span className="text-xs text-neutral-500 ml-2">
                      {sys.diseases.length} diseases, {sys.totalQuestions} questions
                    </span>
                  </div>
                </div>
              </button>

              {expandedSystems.has(sys.system) && (
                <div className="border-t border-neutral-100 px-4 pb-4 pt-2 space-y-2">
                  {sys.diseases.map(disease => {
                    const key = `${sys.system}::${disease.diseaseName}`;
                    const isExpanded = expandedDiseases.has(key);

                    return (
                      <div key={key} className="border border-neutral-100 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleDisease(key)}
                          className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs text-neutral-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                              &#9654;
                            </span>
                            <span className="text-sm font-medium text-neutral-800 truncate">
                              {disease.diseaseName}
                            </span>
                            <span className="text-xs text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                              {disease.questionCount}x
                            </span>
                            {disease.topicType !== 'DISEASE' && (
                              <span className="text-xs text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                                {disease.topicType}
                              </span>
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2 text-xs">
                            {disease.mechanism && (
                              <div>
                                <span className="font-semibold text-neutral-600">Mechanism:</span>
                                <span className="text-neutral-600 ml-1">{disease.mechanism}</span>
                              </div>
                            )}

                            {disease.keySymptoms.length > 0 && (
                              <div>
                                <span className="font-semibold text-neutral-600">Key Findings:</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {disease.keySymptoms.map((s, i) => (
                                    <span key={i} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {disease.discriminators.length > 0 && (
                              <div>
                                <span className="font-semibold text-neutral-600">Key Discriminators:</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {disease.discriminators.map((d, i) => (
                                    <span key={i} className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {disease.highLeverageClues.length > 0 && (
                              <div>
                                <span className="font-semibold text-neutral-600">High-Yield Clues:</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {disease.highLeverageClues.map((c, i) => (
                                    <span key={i} className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
