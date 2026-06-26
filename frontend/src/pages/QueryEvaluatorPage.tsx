import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import type { RetrievalMode } from '../api/types';
import { irApi } from '../api/irApi';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { RetrievalModeSelector } from '../components/search/RetrievalModeSelector';
import { SearchBox } from '../components/search/SearchBox';
import { SearchResultList } from '../components/search/SearchResultList';
import { useSearch } from '../hooks/useSearch';
import { QueryRewriteSandbox } from '../components/llm/QueryRewriteSandbox';
import { useQueryRewriteExperiment } from '../hooks/useLlm';
import { useDatasetSelection } from '../hooks/useDatasetSelection';
import { useQueries } from '../hooks/useCorpus';

export function QueryEvaluatorPage() {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const queries = useQueries(datasetId);
  const [query, setQuery] = useState('why use BM25 baseline');
  const [mode, setMode] = useState<RetrievalMode>('bm25');
  const [k, setK] = useState(10);
  const [alpha, setAlpha] = useState(0.5);
  const [rewriteLimit, setRewriteLimit] = useState(20);
  const search = useSearch();
  const rewriteExperiment = useQueryRewriteExperiment();
  const allModes = useMutation({
    mutationFn: async () => Promise.all((['bm25', 'dense', 'hybrid', 'rerank'] as RetrievalMode[]).map((item) => irApi.search(query, item, k, alpha, datasetId))),
  });
  const submit = () => search.mutate({ query, mode, k, alpha });

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">{t('navigation.queryEvaluator')}</h2>
      <section data-tour-id="query-evaluator-panel" className="grid gap-3 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="rounded bg-slate-100 px-2 py-1 font-mono">{datasetId}</span>
          <select
            className="rounded border px-2 py-1"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          >
            <option value={query}>{t('query.placeholder')}</option>
            {(queries.data ?? []).map((item) => <option key={item.query_id} value={item.query}>{item.query_id} · {item.query}</option>)}
          </select>
        </div>
        <SearchBox value={query} onChange={setQuery} onSubmit={submit} />
        <RetrievalModeSelector value={mode} onChange={setMode} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">K <input className="ml-2 w-20 rounded border px-2 py-1" type="number" min={1} max={100} value={k} onChange={(event) => setK(Number(event.target.value))} /></label>
          <label className="text-sm">{t('retrieval.alpha')} <input className="ml-2 align-middle" type="range" min={0} max={1} step={0.1} value={alpha} onChange={(event) => setAlpha(Number(event.target.value))} /> {alpha}</label>
        </div>
        <button type="button" className="w-fit rounded border bg-white px-3 py-2 text-sm" onClick={() => allModes.mutate()}>
          {t('retrieval.runAllModes')}
        </button>
      </section>
      {search.isPending && <LoadingState />}
      {search.isError && <ErrorState message={t('errors.noResults')} />}
      <QueryRewriteSandbox query={query} mode={mode} k={k} alpha={alpha} />
      <section className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">{t('llm.rewriteExperiment')}</h3>
            <p className="text-sm text-slate-500">{t('llm.rewriteExperimentHint')}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">
              {t('llm.queryLimit')}
              <input className="ml-2 w-20 rounded border px-2 py-1" type="number" min={1} max={200} value={rewriteLimit} onChange={(event) => setRewriteLimit(Number(event.target.value))} />
            </label>
            <button
              type="button"
              className="rounded bg-slate-950 px-3 py-2 text-sm text-white"
              onClick={() => rewriteExperiment.mutate({ dataset_id: datasetId, limit: rewriteLimit, mode, k, alpha, require_real_llm: true })}
            >
              {t('common.run')}
            </button>
          </div>
        </div>
        {rewriteExperiment.isPending && <div className="mt-3"><LoadingState /></div>}
        {rewriteExperiment.data && (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                [t('llm.improvedQueries'), rewriteExperiment.data.summary.improved_queries],
                [t('llm.worsenedQueries'), rewriteExperiment.data.summary.worsened_queries],
                [t('llm.unchangedQueries'), rewriteExperiment.data.summary.unchanged_queries],
                [t('analytics.recallDelta'), rewriteExperiment.data.summary.average_recall_delta.toFixed(3)],
              ].map(([label, value]) => (
                <div key={label} className="rounded border bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-1 text-xl font-semibold">{value}</div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr><th className="py-2">{t('common.query')}</th><th>{t('llm.bestStrategy')}</th><th>{t('analytics.recallDelta')}</th></tr>
                </thead>
                <tbody>
                  {rewriteExperiment.data.queries.slice(0, 20).map((row) => (
                    <tr key={row.query_id} className="border-t">
                      <td className="max-w-xl py-2">{row.query}</td>
                      <td><span className="rounded bg-teal-50 px-2 py-1 text-xs text-teal-900">{row.best_strategy}</span></td>
                      <td className={row.recall_delta > 0 ? 'text-teal-700' : row.recall_delta < 0 ? 'text-red-700' : 'text-slate-600'}>{row.recall_delta.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      {allModes.isPending && <LoadingState />}
      {allModes.data && (
        <section className="grid gap-4 xl:grid-cols-2">
          {allModes.data.map((response) => (
            <div key={response.mode} className="rounded-lg border bg-slate-50 p-3">
              <h3 className="mb-2 font-semibold">{t(`retrieval.${response.mode}`)}</h3>
              <SearchResultList response={response} />
            </div>
          ))}
        </section>
      )}
      <SearchResultList response={search.data} />
    </div>
  );
}
