type ClinicalContext = {
  age?: string;
  gender?: string;
  physiologyState?: string;
  onsetPattern?: string;
};

type Pattern = {
  diseaseName: string;
  mechanism: string;
  keySymptoms: string[];
  clinicalContext: ClinicalContext;
  questionText?: string;
};

type Props = {
  pattern: Pattern;
  isRevealed: boolean;
  onReveal: () => void;
};

export default function ClueCard({ pattern, isRevealed, onReveal }: Props) {
  const ctx = pattern.clinicalContext;
  const contextChips = [ctx.age, ctx.gender, ctx.physiologyState, ctx.onsetPattern].filter(Boolean);

  return (
    <div className="card p-6 space-y-4">
      {/* Always visible: clinical context */}
      {contextChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {contextChips.map((c, i) => (
            <span key={i} className="px-2.5 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full">{c}</span>
          ))}
        </div>
      )}

      {/* Always visible: symptoms */}
      {pattern.keySymptoms.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">Presentation</p>
          <div className="flex flex-wrap gap-2">
            {pattern.keySymptoms.map((s, i) => (
              <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">{s}</span>
            ))}
          </div>
        </div>
      )}

      {!isRevealed ? (
        <button
          onClick={onReveal}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Reveal Diagnosis
        </button>
      ) : (
        <div className="space-y-3 border-t border-neutral-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Diagnosis</p>
            <p className="text-lg font-bold text-neutral-900">{pattern.diseaseName}</p>
          </div>
          {pattern.mechanism && pattern.mechanism !== 'Pending further analysis' && (
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">What was tested</p>
              <p className="text-sm text-neutral-700 bg-amber-50 border border-amber-100 rounded-lg p-3">{pattern.mechanism}</p>
            </div>
          )}
          {pattern.questionText && (
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Full Question</p>
              <p className="text-sm text-neutral-600 leading-relaxed">{pattern.questionText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
