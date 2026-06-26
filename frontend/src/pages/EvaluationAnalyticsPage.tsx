import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, AlertTriangle, Clock, Target } from 'lucide-react';
import { QueryDiagnosticsDrawer } from '../components/analytics/QueryDiagnosticsDrawer';
import { QueryDiagnosticsCanvas } from '../components/analytics/QueryDiagnosticsCanvas';
import { EChartMetricExplorer } from '../components/charts/EChartMetricExplorer';
import { DatasetTreemap, DistributionBarChart, LatencyRecallScatter, MetricCurveChart, MetricLeaderboardChart, QueryDifficultyDonut, QueryScatterChart } from '../components/charts/AnalyticsCharts';
import { FailureHeatmapChart, MetricMatrixHeatmap, RankMovementChart, RetrieverBattleChart } from '../components/charts/InteractiveAnalyticsCharts';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { MetricCard } from '../components/common/MetricCard';
import { useAnalyticsOverview, useAnalyticsQueryMetrics, useCorrelations, useDatasetProfile, useFailureHeatmap, useInsights, useMetricMatrix, usePairwiseComparison, useQueryDiagnostics, useRankMovement, useRetrieverBattle } from '../hooks/useAnalytics';
import { useDatasetSelection } from '../hooks/useDatasetSelection';
import { useEvaluationSuites, useExperiments } from '../hooks/useExperiments';

function pct(value?: number) {
  return `${((value ?? 0) * 100).toFixed(1)}%`;
}

function ms(value?: number) {
  return `${(value ?? 0).toFixed(1)} ms`;
}

export function EvaluationAnalyticsPage() {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const [selectedSuiteId, setSelectedSuiteId] = useState('');
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [leftExperimentId, setLeftExperimentId] = useState('');
  const [rightExperimentId, setRightExperimentId] = useState('');
  const overview = useAnalyticsOverview(datasetId, selectedSuiteId || undefined);
  const profile = useDatasetProfile(datasetId);
  const queryMetrics = useAnalyticsQueryMetrics(datasetId, undefined, selectedSuiteId || undefined);
  const correlations = useCorrelations(datasetId, 10, selectedSuiteId || undefined);
  const insights = useInsights(datasetId, selectedSuiteId || undefined);
  const metricMatrix = useMetricMatrix(datasetId, selectedSuiteId || undefined);
  const failureHeatmap = useFailureHeatmap(datasetId, selectedSuiteId || undefined);
  const rankMovement = useRankMovement(datasetId, selectedSuiteId || undefined, selectedQueryId || undefined);
  const retrieverBattle = useRetrieverBattle(datasetId, selectedSuiteId || undefined);
  const experiments = useExperiments();
  const suites = useEvaluationSuites(datasetId);
  const pairwise = usePairwiseComparison(datasetId, leftExperimentId, rightExperimentId);
  const diagnostics = useQueryDiagnostics(datasetId, selectedQueryId);
  const best = overview.data?.leaderboard[0];
  const datasetExperiments = useMemo(
    () => (experiments.data ?? []).filter((item) => item.dataset_id === datasetId && (!selectedSuiteId || item.suite_id === selectedSuiteId)),
    [experiments.data, datasetId, selectedSuiteId],
  );
  const failedQueries = useMemo(
    () => (queryMetrics.data ?? []).filter((row) => row.k === 10 && row.bad_case_type).slice(0, 12),
    [queryMetrics.data],
  );
  useEffect(() => {
    if (!datasetExperiments.length) return;
    if (leftExperimentId && rightExperimentId && datasetExperiments.some((item) => item.experiment_id === leftExperimentId) && datasetExperiments.some((item) => item.experiment_id === rightExperimentId)) return;
    setLeftExperimentId(datasetExperiments[0]?.experiment_id ?? '');
    setRightExperimentId(datasetExperiments[1]?.experiment_id ?? datasetExperiments[0]?.experiment_id ?? '');
  }, [datasetExperiments, leftExperimentId, rightExperimentId]);

  if (overview.isLoading || profile.isLoading || queryMetrics.isLoading || correlations.isLoading || insights.isLoading || metricMatrix.isLoading || failureHeatmap.isLoading || rankMovement.isLoading || retrieverBattle.isLoading) return <LoadingState />;
  if (overview.isError || profile.isError || queryMetrics.isError || correlations.isError || insights.isError || metricMatrix.isError || failureHeatmap.isError || rankMovement.isError || retrieverBattle.isError) return <ErrorState />;
  if (!overview.data || overview.data.leaderboard.length === 0) return <EmptyState />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-semibold">{t('analytics.title')}</h2>
          <p className="text-sm text-slate-500">{datasetId} · {selectedSuiteId || t('analytics.latestPerRetriever')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded border bg-white px-3 py-2 text-sm" value={selectedSuiteId} onChange={(event) => setSelectedSuiteId(event.target.value)}>
            <option value="">{t('analytics.latestPerRetriever')}</option>
            {(suites.data ?? []).map((suite) => <option key={suite.suite_id} value={suite.suite_id}>{suite.name} · {suite.suite_id}</option>)}
          </select>
          <div className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
            {t('analytics.summary')}: <span className="font-semibold text-slate-900">{best?.retriever_name}</span>
          </div>
        </div>
      </div>

      <section className="grid gap-3 rounded-lg border bg-white p-4 text-sm md:grid-cols-3">
        <div><span className="text-slate-500">{t('datasets.documents')}</span><div className="font-semibold">{profile.data?.document_lengths.reduce((sum, row) => sum + row.count, 0) ?? 0}</div></div>
        <div><span className="text-slate-500">{t('common.metrics')}</span><div className="font-semibold">{(overview.data.experiment_ids ?? []).length} experiments</div></div>
        <div><span className="text-slate-500">Suite</span><div className="font-mono text-xs">{selectedSuiteId || 'latest-per-retriever'}</div></div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('analytics.bestRecall')} value={pct(best?.['recall@10'])} delta={best?.retriever_name} />
        <MetricCard label={t('analytics.bestNdcg')} value={pct(best?.['ndcg@10'])} delta={best?.retriever_name} />
        <MetricCard label={t('metrics.mrr')} value={pct(best?.mrr)} delta={t('analytics.rankSensitive')} />
        <MetricCard label={t('metrics.latency')} value={ms(best?.latency_ms)} delta={t('analytics.avgQuery')} />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(insights.data?.cards ?? []).map((card) => (
          <MetricCard key={card.kind} label={t(`analytics.insight.${card.kind}`, card.title)} value={card.value} />
        ))}
      </section>

      <section data-tour-id="analytics-heatmaps" className="grid gap-4 xl:grid-cols-2">
        <MetricMatrixHeatmap data={metricMatrix.data} />
        <RetrieverBattleChart data={retrieverBattle.data} onPairClick={(left, right) => { setLeftExperimentId(left); setRightExperimentId(right); }} />
        <FailureHeatmapChart data={failureHeatmap.data} onQueryClick={setSelectedQueryId} />
        <RankMovementChart data={rankMovement.data} onQueryClick={setSelectedQueryId} />
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h3 className="font-semibold">{t('analytics.pairwiseComparison')}</h3>
            <p className="text-sm text-slate-500">{t('analytics.pairwiseHint')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="rounded border px-2 py-2 text-sm" value={leftExperimentId} onChange={(event) => setLeftExperimentId(event.target.value)}>
              {datasetExperiments.map((item) => <option key={item.experiment_id} value={item.experiment_id}>{item.retriever_name} · {item.experiment_id}</option>)}
            </select>
            <select className="rounded border px-2 py-2 text-sm" value={rightExperimentId} onChange={(event) => setRightExperimentId(event.target.value)}>
              {datasetExperiments.map((item) => <option key={item.experiment_id} value={item.experiment_id}>{item.retriever_name} · {item.experiment_id}</option>)}
            </select>
          </div>
        </div>
        {pairwise.data && (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 md:grid-cols-5">
              <MetricCard label={t('analytics.wins')} value={pairwise.data.summary.wins} />
              <MetricCard label={t('analytics.losses')} value={pairwise.data.summary.losses} />
              <MetricCard label={t('analytics.ties')} value={pairwise.data.summary.ties} />
              <MetricCard label={t('analytics.recallDelta')} value={pct(pairwise.data.summary.avg_recall_delta)} />
              <MetricCard label={t('analytics.latencyDelta')} value={ms(pairwise.data.summary.avg_latency_delta_ms)} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr><th className="px-3 py-2">{t('common.query')}</th><th className="px-3 py-2">{t('analytics.outcome')}</th><th className="px-3 py-2">{t('analytics.recallDelta')}</th><th className="px-3 py-2">{t('analytics.rankDelta')}</th><th className="px-3 py-2">{t('analytics.latencyDelta')}</th></tr>
                </thead>
                <tbody>
                  {pairwise.data.queries.slice(0, 12).map((row) => (
                    <tr key={row.query_id} className="cursor-pointer border-t hover:bg-slate-50" onClick={() => setSelectedQueryId(row.query_id)}>
                      <td className="px-3 py-2 font-mono text-xs">{row.query_id}</td>
                      <td className="px-3 py-2">{row.outcome}</td>
                      <td className="px-3 py-2">{pct(row.recall_delta)}</td>
                      <td className="px-3 py-2">{row.rank_delta}</td>
                      <td className="px-3 py-2">{ms(row.latency_delta_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MetricLeaderboardChart data={overview.data.leaderboard} />
        <EChartMetricExplorer data={correlations.data} onQueryClick={setSelectedQueryId} />
        <LatencyRecallScatter data={overview.data.latency_recall} />
        <MetricCurveChart title={t('analytics.recallCurve')} data={overview.data.curves.recall} />
        <MetricCurveChart title={t('analytics.ndcgCurve')} data={overview.data.curves.ndcg} />
        <QueryDifficultyDonut data={overview.data.difficulty} />
        <DistributionBarChart title={t('analytics.badCaseDistribution')} data={overview.data.bad_cases} xKey="case_type" yKey="count" />
        <DistributionBarChart title={t('analytics.firstRelevantRank')} data={overview.data.rank_histogram} xKey="rank" yKey="count" />
        <DatasetTreemap data={profile.data?.metadata_treemap ?? []} />
        <DistributionBarChart title={t('analytics.documentLength')} data={profile.data?.document_lengths ?? []} xKey="bucket" yKey="count" />
        <DistributionBarChart title={t('analytics.labelDensity')} data={profile.data?.label_density ?? []} xKey="bucket" yKey="count" />
        <QueryScatterChart title={t('analytics.queryLengthFailure')} data={correlations.data?.query_length_failure ?? []} xKey="query_length" yKey="failed" xLabel={t('analytics.queryLength')} yLabel={t('analytics.failure')} onQueryClick={setSelectedQueryId} />
        <QueryScatterChart title={t('analytics.labelRecall')} data={correlations.data?.label_count_recall ?? []} xKey="label_count" yKey="recall" xLabel={t('analytics.labelDensity')} yLabel={t('metrics.recallAtK')} onQueryClick={setSelectedQueryId} />
        <QueryScatterChart title={t('analytics.ndcgZeroResult')} data={correlations.data?.ndcg_zero_result ?? []} xKey="zero_result_rate" yKey="ndcg" xLabel={t('metrics.zeroResultRate')} yLabel={t('metrics.ndcgAtK')} />
      </section>
      <div data-tour-id="analytics-diagnostics">
        {diagnostics.data ? <QueryDiagnosticsCanvas diagnostics={diagnostics.data} /> : (
          <section className="rounded-lg border border-dashed bg-white p-4 text-sm text-slate-500">{t('analytics.queryDiagnostics')}</section>
        )}
      </div>

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
                <tr key={`${row.experiment_id}-${row.query_id}-${row.k}`} className="cursor-pointer border-t hover:bg-slate-50" onClick={() => setSelectedQueryId(row.query_id)}>
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
      <QueryDiagnosticsDrawer
        open={Boolean(selectedQueryId)}
        diagnostics={diagnostics.data}
        isLoading={diagnostics.isLoading}
        isError={diagnostics.isError}
        onClose={() => setSelectedQueryId(null)}
      />
    </div>
  );
}
