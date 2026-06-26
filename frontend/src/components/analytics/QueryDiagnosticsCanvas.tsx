import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QueryDiagnostics } from '../../api/types';

export function QueryDiagnosticsCanvas({ diagnostics }: { diagnostics?: QueryDiagnostics }) {
  const { t } = useTranslation();
  const [hoverDocId, setHoverDocId] = useState('');
  if (!diagnostics) return null;
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="font-semibold">{t('analytics.queryDiagnostics')}</h3>
      <div className="mt-4 grid gap-4 xl:grid-cols-[260px_1fr_280px]">
        <aside className="rounded border bg-slate-50 p-3">
          <p className="text-sm font-medium">{diagnostics.query.query}</p>
          <p className="mt-3 text-xs text-slate-500">{t('retrieval.relevantDocument')}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {diagnostics.relevant_docs.map((doc) => <span key={doc.doc_id} className="rounded bg-teal-50 px-2 py-1 text-xs text-teal-800">{doc.doc_id}</span>)}
          </div>
        </aside>
        <main className="grid gap-3 md:grid-cols-2">
          {diagnostics.experiments.map((experiment) => (
            <div key={experiment.experiment_id} className="rounded border">
              <div className="border-b px-3 py-2 text-sm font-semibold">{experiment.retriever_name}</div>
              <div className="grid gap-2 p-3">
                {experiment.ranking.map((result) => (
                  <div
                    key={`${experiment.experiment_id}-${result.doc_id}`}
                    onMouseEnter={() => setHoverDocId(result.doc_id)}
                    onMouseLeave={() => setHoverDocId('')}
                    className={`rounded border px-3 py-2 text-sm transition ${result.is_relevant ? 'border-teal-300 bg-teal-50' : hoverDocId === result.doc_id ? 'border-indigo-300 bg-indigo-50' : 'bg-white'}`}
                  >
                    <div className="flex justify-between gap-2"><span>#{result.rank} {result.doc_id}</span><span>{result.score.toFixed(3)}</span></div>
                    <div className="mt-1 h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-accent" style={{ width: `${Math.max(4, Math.min(100, result.score * 100))}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
        <aside className="rounded border bg-slate-50 p-3 text-sm">
          <p className="font-medium">{t('analytics.missedDocs')}</p>
          <div className="mt-2 grid gap-2">
            {diagnostics.experiments.map((experiment) => (
              <div key={experiment.experiment_id} className="rounded bg-white p-2">
                <p className="font-medium">{experiment.retriever_name}</p>
                <p className="text-xs text-slate-500">{experiment.missed_relevant_doc_ids.join(', ') || '-'}</p>
                <div className="mt-2 rounded border border-dashed p-2">
                  <p className="text-xs font-semibold text-slate-600">{t('llm.aiSuggestion')}</p>
                  {experiment.llm_diagnosis ? (
                    <div className="mt-1 grid gap-1 text-xs">
                      <span>{experiment.llm_diagnosis.suggestion.suggested_root_cause ?? experiment.llm_diagnosis.case_type}</span>
                      <span className="text-slate-500">{experiment.llm_diagnosis.suggestion.why_failed ?? experiment.llm_diagnosis.suggestion.rationale ?? '-'}</span>
                      <span className="text-teal-700">{experiment.llm_diagnosis.suggestion.possible_fix ?? '-'}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">{t('llm.noStoredDiagnosis')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
