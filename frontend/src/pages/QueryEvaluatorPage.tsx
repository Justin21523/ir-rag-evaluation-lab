import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RetrievalMode } from '../api/types';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { RetrievalModeSelector } from '../components/search/RetrievalModeSelector';
import { SearchBox } from '../components/search/SearchBox';
import { SearchResultList } from '../components/search/SearchResultList';
import { useSearch } from '../hooks/useSearch';

export function QueryEvaluatorPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('why use BM25 baseline');
  const [mode, setMode] = useState<RetrievalMode>('bm25');
  const [k, setK] = useState(10);
  const [alpha, setAlpha] = useState(0.5);
  const search = useSearch();
  const submit = () => search.mutate({ query, mode, k, alpha });

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">{t('navigation.queryEvaluator')}</h2>
      <section className="grid gap-3 rounded-lg border bg-white p-4">
        <SearchBox value={query} onChange={setQuery} onSubmit={submit} />
        <RetrievalModeSelector value={mode} onChange={setMode} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">K <input className="ml-2 w-20 rounded border px-2 py-1" type="number" min={1} max={100} value={k} onChange={(event) => setK(Number(event.target.value))} /></label>
          <label className="text-sm">{t('retrieval.alpha')} <input className="ml-2 align-middle" type="range" min={0} max={1} step={0.1} value={alpha} onChange={(event) => setAlpha(Number(event.target.value))} /> {alpha}</label>
        </div>
      </section>
      {search.isPending && <LoadingState />}
      {search.isError && <ErrorState message={t('errors.noResults')} />}
      <SearchResultList response={search.data} />
    </div>
  );
}
