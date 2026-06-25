import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MetricsComparisonChart } from '../components/charts/MetricsComparisonChart';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { useEvaluate, useExperiments } from '../hooks/useExperiments';
import { irApi } from '../api/irApi';
import { useQuery } from '@tanstack/react-query';
import { downloadText, rowsToCsv } from '../utils/export';

export function RetrievalComparisonPage() {
  const { t } = useTranslation();
  const evaluate = useEvaluate();
  const experiments = useExperiments();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const comparison = useQuery({
    queryKey: ['experiment-compare', selectedIds],
    queryFn: () => irApi.compare(selectedIds),
    enabled: selectedIds.length > 0,
  });
  const rows = useMemo(() => {
    const source = comparison.data?.length ? comparison.data : evaluate.data ? [{ experiment_id: evaluate.data.experiment_id, name: evaluate.data.experiment_id, retriever_name: 'latest', status: 'completed', config_json: '{}', metrics: evaluate.data.metrics }] : [];
    return source.flatMap((exp) => Object.entries(exp.metrics).map(([metric, value]) => ({ experiment: exp.experiment_id, retriever: exp.retriever_name, metric, value })));
  }, [comparison.data, evaluate.data]);
  const chartData = rows.filter((row) => ['recall@10', 'ndcg@10', 'mrr', 'latency_ms', 'zero_result_rate'].includes(row.metric)).map((row) => ({ metric: `${row.retriever}:${row.metric}`, value: row.value }));
  const keyRows = rows.filter((row) => ['recall@10', 'ndcg@10', 'mrr', 'latency_ms', 'zero_result_rate'].includes(row.metric));
  const bestByMetric = new Map<string, number>();
  const worstByMetric = new Map<string, number>();
  for (const metric of new Set(keyRows.map((row) => row.metric))) {
    const values = keyRows.filter((row) => row.metric === metric).map((row) => Number(row.value));
    bestByMetric.set(metric, metric === 'latency_ms' || metric === 'zero_result_rate' ? Math.min(...values) : Math.max(...values));
    worstByMetric.set(metric, metric === 'latency_ms' || metric === 'zero_result_rate' ? Math.max(...values) : Math.min(...values));
  }
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">{t('navigation.retrievalComparison')}</h2>
      <div className="flex flex-wrap gap-2">
        {(['bm25', 'dense', 'hybrid', 'rerank'] as const).map((mode) => (
          <button key={mode} className="rounded bg-accent px-3 py-2 text-sm text-white" onClick={() => evaluate.mutate(mode)}>
            {t('common.run')} {t(`retrieval.${mode}`)}
          </button>
        ))}
      </div>
      <section className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold">{t('navigation.experimentRuns')}</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {(experiments.data ?? []).map((experiment) => (
            <label key={experiment.experiment_id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedIds.includes(experiment.experiment_id)}
                onChange={(event) =>
                  setSelectedIds((ids) => event.target.checked ? [...ids, experiment.experiment_id] : ids.filter((id) => id !== experiment.experiment_id))
                }
              />
              {experiment.name}
            </label>
          ))}
        </div>
      </section>
      {evaluate.isPending && <LoadingState />}
      {evaluate.isError && <ErrorState message={t('errors.evaluationFailed')} />}
      <div className="flex gap-2">
        <button className="rounded border bg-white px-3 py-2 text-sm" onClick={() => downloadText('retrieval-comparison.csv', rowsToCsv(rows), 'text/csv')}>{t('common.exportCsv')}</button>
        <button className="rounded border bg-white px-3 py-2 text-sm" onClick={() => downloadText('retrieval-comparison.json', JSON.stringify(rows, null, 2), 'application/json')}>{t('common.exportJson')}</button>
      </div>
      <MetricsComparisonChart data={chartData.length ? chartData : [{ metric: 'recall@10', value: 0 }]} />
      <table className="rounded-lg border bg-white text-left text-sm">
        <thead><tr><th className="p-3">Experiment</th><th className="p-3">Retriever</th><th className="p-3">{t('charts.metric')}</th><th className="p-3">{t('charts.value')}</th><th className="p-3">Rank</th></tr></thead>
        <tbody>{rows.map((row) => {
          const value = Number(row.value);
          const isBest = bestByMetric.get(row.metric) === value;
          const isWorst = worstByMetric.get(row.metric) === value;
          return (
            <tr key={`${row.experiment}-${row.metric}`} className="border-t">
              <td className="p-3 font-mono text-xs">{row.experiment}</td>
              <td className="p-3">{row.retriever}</td>
              <td className="p-3">{row.metric}</td>
              <td className="p-3">{value.toFixed(4)}</td>
              <td className="p-3">{isBest && <span className="rounded bg-teal-50 px-2 py-1 text-xs text-teal-800">{t('comparison.best')}</span>} {isWorst && <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{t('comparison.worst')}</span>}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
