import { useTranslation } from 'react-i18next';
import { RetrievalModeSelector } from '../components/search/RetrievalModeSelector';
import { useState } from 'react';
import type { RetrievalMode } from '../api/types';
import { useDatasetSelection } from '../hooks/useDatasetSelection';
import { LoadingState } from '../components/common/LoadingState';
import { ConfigViewer } from '../components/common/ConfigViewer';
import { useMutation } from '@tanstack/react-query';
import { irApi } from '../api/irApi';
import { ImportJobPanel } from '../components/datasets/ImportJobPanel';

export function ExperimentWorkflowPage() {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const [mode, setMode] = useState<RetrievalMode>('bm25');
  const [retrievers, setRetrievers] = useState<RetrievalMode[]>(['bm25', 'dense', 'hybrid', 'rerank']);
  const [kValues, setKValues] = useState('1,3,5,10');
  const [alpha, setAlpha] = useState(0.5);
  const [denseBackend, setDenseBackend] = useState('auto');
  const batch = useMutation({
    mutationFn: () => irApi.runBatch({
      dataset_id: datasetId,
      retrievers,
      k_values: kValues.split(',').map((item) => Number(item.trim())).filter(Boolean),
      alpha,
      dense_backend: denseBackend,
    }),
  });
  const toggleRetriever = (value: RetrievalMode) => {
    setRetrievers((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    setMode(value);
  };
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">{t('workflow.title')}</h2>
      <section data-tour-id="workflow-config" className="grid gap-4 rounded-lg border bg-white p-4 lg:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-slate-500">{t('workflow.selectDataset')}</p>
          <p className="mt-2 font-mono text-sm">{datasetId}</p>
        </div>
        <div className="lg:col-span-2">
          <p className="mb-2 text-xs uppercase text-slate-500">{t('workflow.retrievers')}</p>
          <div className="flex flex-wrap gap-2">
            {(['bm25', 'dense', 'hybrid', 'rerank'] as RetrievalMode[]).map((retriever) => (
              <button key={retriever} type="button" className={`rounded border px-3 py-2 text-sm ${retrievers.includes(retriever) ? 'border-teal-700 bg-teal-50 text-teal-900' : 'bg-white'}`} onClick={() => toggleRetriever(retriever)}>
                {t(`retrieval.${retriever}`)}
              </button>
            ))}
          </div>
        </div>
        <label className="grid gap-1 text-sm">
          {t('workflow.kValues')}
          <input className="rounded border px-2 py-1" value={kValues} onChange={(event) => setKValues(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          {t('retrieval.alpha')}
          <input type="range" min={0} max={1} step={0.1} value={alpha} onChange={(event) => setAlpha(Number(event.target.value))} />
        </label>
        <label className="grid gap-1 text-sm">
          {t('workflow.denseBackend')}
          <select className="rounded border px-2 py-1" value={denseBackend} onChange={(event) => setDenseBackend(event.target.value)}>
            <option value="auto">auto</option>
            <option value="mock">mock</option>
            <option value="sentence-transformers">sentence-transformers</option>
          </select>
        </label>
        <button className="rounded bg-accent px-4 py-2 text-white" onClick={() => batch.mutate()}>
          {t('workflow.runAndCompare')}
        </button>
      </section>
      {batch.isPending && <LoadingState />}
      {batch.data && <ConfigViewer value={batch.data} />}
      <ImportJobPanel />
    </div>
  );
}
