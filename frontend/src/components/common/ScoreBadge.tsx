export function ScoreBadge({ score }: { score: number }) {
  return <span className="rounded bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">{score.toFixed(3)}</span>;
}
