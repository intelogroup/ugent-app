import Link from 'next/link';

type Props = {
  rank: number;
  diseaseName: string;
  frequency: number;
  userSuccessRate: number;
  priorityScore: number;
};

export default function DiseasePriorityRow({ rank, diseaseName, frequency, userSuccessRate, priorityScore }: Props) {
  const badgeColor =
    priorityScore > 70
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : priorityScore > 40
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  const label = priorityScore > 70 ? 'High' : priorityScore > 40 ? 'Medium' : 'Low';

  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
      <td className="py-3 px-4 text-sm text-neutral-400 font-mono w-10">{rank}</td>
      <td className="py-3 px-4">
        <Link
          href={`/strategy/${encodeURIComponent(diseaseName)}`}
          className="text-sm font-medium text-primary-700 hover:text-primary-900 hover:underline"
        >
          {diseaseName}
        </Link>
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
