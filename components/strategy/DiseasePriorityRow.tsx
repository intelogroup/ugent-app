import Link from 'next/link';

const TOPIC_TYPE_COLORS: Record<string, string> = {
  DISEASE:   'bg-blue-50 text-blue-600 border-blue-200',
  PATHOGEN:  'bg-orange-50 text-orange-600 border-orange-200',
  PRINCIPLE: 'bg-purple-50 text-purple-600 border-purple-200',
  DRUG:      'bg-teal-50 text-teal-600 border-teal-200',
  SYNDROME:  'bg-pink-50 text-pink-600 border-pink-200',
  CONCEPT:   'bg-neutral-100 text-neutral-500 border-neutral-200',
};

type Props = {
  rank: number;
  diseaseName: string;
  topicType?: string;
  topClue?: string;
  frequency: number;
  userSuccessRate: number;
  priorityScore: number;
};

export default function DiseasePriorityRow({ rank, diseaseName, topicType, topClue, frequency, userSuccessRate, priorityScore }: Props) {
  const badgeColor =
    priorityScore > 70
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : priorityScore > 40
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  const label = priorityScore > 70 ? 'High' : priorityScore > 40 ? 'Medium' : 'Low';
  const typeColor = topicType ? TOPIC_TYPE_COLORS[topicType] ?? TOPIC_TYPE_COLORS.CONCEPT : null;

  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
      <td className="py-3 px-4 text-sm text-neutral-400 font-mono w-10">{rank}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/strategy/${encodeURIComponent(diseaseName)}`}
            className="text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline"
          >
            {diseaseName}
          </Link>
          {typeColor && (
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded border ${typeColor}`}>
              {topicType}
            </span>
          )}
        </div>
        {topClue && (
          <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
            <span className="text-neutral-300 mr-1">→</span>{topClue}
          </p>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-neutral-600 text-center">{frequency}</td>
      <td className="py-3 px-4 text-sm text-neutral-600 text-center">
        {userSuccessRate > 0 ? `${Math.round(userSuccessRate)}%` : '—'}
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${badgeColor}`}>
          {label}
        </span>
      </td>
    </tr>
  );
}
