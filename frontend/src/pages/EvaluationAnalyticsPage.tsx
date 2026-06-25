import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, AlertTriangle, Clock, Target } from 'lucide-react';
import { DatasetTreemap, DistributionBarChart, LatencyRecallScatter, MetricCurveChart, MetricLeaderboardChart, QueryDifficultyDonut } from '../components/charts/AnalyticsCharts';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { MetricCard } from '../components/common/MetricCard';
import { useAnalyticsOverview, useAnalyticsQueryMetrics, useDatasetProfile } from '../hooks/useAnalytics';
import { useDatasetSelection } from '../hooks/useDatasetSelection';

function pct(value?: number) {
  return `${((value ?? 0) * 100).toFixed(1)}%`;
}

function ms(value?: number) {
  return `${(value ?? 0).toFixed(1)} ms`;
}

export function EvaluationAnalyticsPage() {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const overview = useAnalyticsOverview(datasetId);
  const profile = useDatasetProfile(datasetId);
  const queryMetrics = useAnalyticsQueryMetrics(datasetId);
  const best = overview.data?.leaderboard[0];
  const failedQueries = useMemo(
    () => (queryMetrics.data ?? []).filter((row) => row.k === 10 && row.bad_case_type).slice(0, 12),
    [queryMetrics.data],
  );

  if (overview.isLoading || profile.isLoading || queryMetrics.isLoading) return <LoadingState />;
  if (overview.isError || profile.isError || queryMetrics.isError) return <ErrorState />;
  if (!overview.data || overview.data.leaderboard.length === 0) return <EmptyState />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-semibold">{t('analytics.title')}</h2>
          <p className="text-sm text-slate-500">{datasetId}</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          {t('analytics.summary')}: <span className="font-semibold text-slate-900">{best?.retriever_name}</span>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('analytics.bestRecall')} value={pct(best?.['recall@10'])} delta={best?.retriever_name} />
        <MetricCard label={t('analytics.bestNdcg')} value={pct(best?.['ndcg@10'])} delta={best?.retriever_name} />
        <MetricCard label={t('metrics.mrr')} value={pct(best?.mrr)} delta={t('analytics.rankSensitive')} />
        <MetricCard label={t('metrics.latency')} value={ms(best?.latency_ms)} delta={t('analytics.avgQuery')} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MetricLeaderboardChart data={overview.data.leaderboard} />
        <LatencyRecallScatter data={overview.data.latency_recall} />
        <MetricCurveChart title={t('analytics.recallCurve')} data={overview.data.curves.recall} />
        <MetricCurveChart title={t('analytics.ndcgCurve')} data={overview.data.curves.ndcg} />
        <QueryDifficultyDonut data={overview.data.difficulty} />
        <DistributionBarChart title={t('analytics.badCaseDistribution')} data={overview.data.bad_cases} xKey="case_type" yKey="count" />
        <DistributionBarChart title={t('analytics.firstRelevantRank')} data={overview.data.rank_histogram} xKey="rank" yKey="count" />
        <DatasetTreemap data={profile.data?.metadata_treemap ?? []} />
        <DistributionBarChart title={t('analytics.documentLength')} data={profile.data?.document_lengths ?? []} xKey="bucket" yKey="count" />
        <DistributionBarChart title={t('analytics.labelDensity')} data={profile.data?.label_density ?? []} xKey="bucket" yKey="count" />
      </section>

      <section className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">{t('analytics.perQueryTable')}</h3>
          <span className="text-xs text-slate-500">{queryMetrics.data?.length ?? 0}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('common.query')}</th>
                <th className="px-4 py-3">{t('retrieval.retrievedDocument')}</th>
                <th className="px-4 py-3">{t('metrics.recallAtK')}</th>
                <th className="px-4 py-3">{t('metrics.ndcgAtK')}</th>
                <th className="px-4 py-3">{t('metrics.latency')}</th>
                <th className="px-4 py-3">{t('common.type')}</th>
              </tr>
            </thead>
            <tbody>
              {failedQueries.map((row) => (
                <tr key={`${row.experiment_id}-${row.query_id}-${row.k}`} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs">{row.query_id}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs"><Target size={13} />{row.retriever_name}</span>
                  </td>
                  <td className="px-4 py-3">{pct(row.recall)}</td>
                  <td className="px-4 py-3">{pct(row.ndcg)}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Clock size={13} />{ms(row.latency_ms)}</span></td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800"><AlertTriangle size={13} />{row.bad_case_type || row.difficulty_label}</span>
                  </td>
                </tr>
              ))}
              {failedQueries.length === 0 && (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={6}><Activity className="mr-2 inline" size={15} />{t('analytics.noFailedQueries')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
