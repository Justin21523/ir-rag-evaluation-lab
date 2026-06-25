import type { SearchResult } from '../../api/types';
import { ScoreBadge } from '../common/ScoreBadge';
import { ScoreBreakdown } from './ScoreBreakdown';

export function SearchResultCard({ result, relevant }: { result: SearchResult; relevant: boolean }) {
  return (
    <article className={`rounded-lg border bg-white p-4 ${relevant ? 'border-teal-600' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{result.rank}. {result.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{result.doc_id}</p>
        </div>
        <ScoreBadge score={result.score} />
      </div>
      <p className="mt-2 text-sm text-slate-700">{result.text}</p>
      <div className="mt-3 grid gap-1">
        {Object.entries(result.score_breakdown).filter(([, value]) => typeof value === 'number').map(([key, value]) => (
          <div key={key} className="grid grid-cols-[90px_1fr_64px] items-center gap-2 text-xs">
            <span className="text-slate-500">{key}</span>
            <div className="h-2 rounded bg-slate-100">
              <div className="h-2 rounded bg-teal-600" style={{ width: `${Math.max(4, Math.min(100, Math.abs(value) * 100))}%` }} />
            </div>
            <span className="text-right font-mono">{value.toFixed(3)}</span>
          </div>
        ))}
      </div>
      <ScoreBreakdown breakdown={result.score_breakdown} />
    </article>
  );
}
