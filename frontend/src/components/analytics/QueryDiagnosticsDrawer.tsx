import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { QueryDiagnostics } from '../../api/types';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';

function pct(value?: number) {
  return `${((value ?? 0) * 100).toFixed(1)}%`;
}

export function QueryDiagnosticsDrawer({
  open,
  diagnostics,
  isLoading,
  isError,
  onClose,
}: {
  open: boolean;
  diagnostics?: QueryDiagnostics;
  isLoading: boolean;
  isError: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid bg-slate-950/40 lg:grid-cols-[1fr_920px]">
      <button className="hidden lg:block" aria-label="close diagnostics overlay" onClick={onClose} />
      <aside className="h-full overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h3 className="font-semibold">{t('analytics.queryDiagnostics')}</h3>
            <p className="text-xs text-slate-500">{diagnostics?.query.query_id}</p>
          </div>
          <button type="button" className="rounded border p-2" onClick={onClose} aria-label="close diagnostics">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 p-5">
          {isLoading && <LoadingState />}
          {isError && <ErrorState />}
          {diagnostics && (
            <>
              <section className="rounded-lg border bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{diagnostics.query.query}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {diagnostics.relevant_docs.map((doc) => (
                    <span key={doc.doc_id} className="rounded bg-teal-50 px-2 py-1 text-xs text-teal-800">{doc.doc_id}</span>
                  ))}
                </div>
              </section>
              <section className="grid gap-4 xl:grid-cols-2">
                {diagnostics.experiments.map((experiment) => (
                  <div key={experiment.experiment_id} className="rounded-lg border bg-white">
                    <div className="border-b p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold">{experiment.retriever_name}</h4>
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs">K={experiment.k}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <span>{t('metrics.recallAtK')}: {pct(experiment.metrics.recall)}</span>
                        <span>{t('metrics.ndcgAtK')}: {pct(experiment.metrics.ndcg)}</span>
                        <span>{t('analytics.firstRelevantRank')}: {experiment.metrics.first_relevant_rank ?? '-'}</span>
                      </div>
                      {experiment.missed_relevant_doc_ids.length > 0 && (
                        <p className="mt-2 text-xs text-amber-700">{t('analytics.missedDocs')}: {experiment.missed_relevant_doc_ids.join(', ')}</p>
                      )}
                    </div>
                    <div className="grid gap-2 p-3">
                      {experiment.ranking.map((result) => (
                        <div key={`${experiment.experiment_id}-${result.doc_id}`} className={`rounded border p-3 text-sm ${result.is_relevant ? 'border-teal-300 bg-teal-50' : 'bg-white'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">#{result.rank} {result.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{result.text}</p>
                            </div>
                            <span className="rounded bg-slate-900 px-2 py-1 text-xs text-white">{result.score.toFixed(3)}</span>
                          </div>
                          <div className="mt-2 grid gap-1">
                            {Object.entries(result.score_breakdown ?? {}).map(([key, value]) => (
                              <div key={key} className="grid grid-cols-[90px_1fr_54px] items-center gap-2 text-xs">
                                <span className="text-slate-500">{key}</span>
                                <span className="h-1.5 overflow-hidden rounded bg-slate-100">
                                  <span className="block h-full rounded bg-accent" style={{ width: `${Math.max(4, Math.min(100, Math.abs(Number(value)) * 100))}%` }} />
                                </span>
                                <span className="text-right">{Number(value).toFixed(3)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
