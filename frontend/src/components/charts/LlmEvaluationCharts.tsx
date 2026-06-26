import ReactECharts from 'echarts-for-react';
import { useTranslation } from 'react-i18next';
import type { LlmDashboard } from '../../api/types';

function entries(record: Record<string, number>) {
  return Object.entries(record || {}).map(([name, value]) => ({ name, value }));
}

export function LlmEvaluationCharts({ dashboard }: { dashboard: LlmDashboard }) {
  const { t } = useTranslation();
  const claimData = entries(dashboard.claim_judgment_distribution);
  const rootCauseData = entries(dashboard.root_cause_distribution);
  const judgmentByRetriever = dashboard.judgment_by_retriever ?? [];
  const promptTypeLatency = dashboard.prompt_type_latency ?? [];
  const runModeData = [
    { name: 'real', value: dashboard.real_run_count ?? 0 },
    { name: 'fallback', value: dashboard.fallback_run_count ?? 0 },
    { name: 'failed', value: dashboard.failed_run_count ?? 0 },
  ];
  const latencyData = dashboard.latency_over_time.map((item) => [item.created_at, Number(item.latency_ms.toFixed(1)), item.prompt_type]);
  const rewriteByKind = Object.values(
    dashboard.rewrite_improvement.reduce<Record<string, { rewrite_kind: string; recall_delta: number; ndcg_delta: number; count: number }>>((acc, item) => {
      const row = acc[item.rewrite_kind] || { rewrite_kind: item.rewrite_kind, recall_delta: 0, ndcg_delta: 0, count: 0 };
      row.recall_delta += item.recall_delta;
      row.ndcg_delta += item.ndcg_delta;
      row.count += 1;
      acc[item.rewrite_kind] = row;
      return acc;
    }, {}),
  ).map((item) => ({ ...item, recall_delta: item.count ? item.recall_delta / item.count : 0, ndcg_delta: item.count ? item.ndcg_delta / item.count : 0 }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold">{t('llm.runModeDistribution')}</h3>
        <ReactECharts
          style={{ height: 300 }}
          option={{
            tooltip: { trigger: 'item' },
            legend: { bottom: 0 },
            series: [{ type: 'pie', radius: ['45%', '70%'], data: runModeData }],
          }}
        />
      </section>
      <section className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold">{t('llm.claimJudgments')}</h3>
        <ReactECharts
          style={{ height: 300 }}
          option={{
            tooltip: { trigger: 'item' },
            legend: { bottom: 0 },
            series: [{ type: 'pie', radius: ['45%', '70%'], data: claimData.length ? claimData : [{ name: t('common.empty'), value: 1 }] }],
          }}
        />
      </section>
      <section className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold">{t('llm.rootCauseDistribution')}</h3>
        <ReactECharts
          style={{ height: 300 }}
          option={{
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: rootCauseData.map((item) => item.name), axisLabel: { rotate: 25 } },
            yAxis: { type: 'value' },
            series: [{ type: 'bar', data: rootCauseData.map((item) => item.value), itemStyle: { color: '#0f766e' } }],
          }}
        />
      </section>
      <section className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold">{t('llm.confidenceHistogram')}</h3>
        <ReactECharts
          style={{ height: 300 }}
          option={{
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: dashboard.confidence_histogram.map((item) => item.bucket) },
            yAxis: { type: 'value' },
            series: [{ type: 'bar', data: dashboard.confidence_histogram.map((item) => item.count), itemStyle: { color: '#4f46e5' } }],
          }}
        />
      </section>
      <section className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold">{t('llm.latencyOverTime')}</h3>
        <ReactECharts
          style={{ height: 300 }}
          option={{
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: latencyData.map((item) => item[0]) },
            yAxis: { type: 'value', name: 'ms' },
            series: [{ type: 'line', smooth: true, data: latencyData.map((item) => item[1]), areaStyle: {}, itemStyle: { color: '#dc2626' } }],
          }}
        />
      </section>
      <section className="rounded-lg border bg-white p-4 xl:col-span-2">
        <h3 className="mb-3 font-semibold">{t('llm.judgmentByRetriever')}</h3>
        <ReactECharts
          style={{ height: 320 }}
          option={{
            tooltip: { trigger: 'axis' },
            legend: { top: 0 },
            xAxis: { type: 'category', data: Array.from(new Set(judgmentByRetriever.map((item) => item.retriever_name))) },
            yAxis: { type: 'value' },
            series: Array.from(new Set(judgmentByRetriever.map((item) => item.judgment))).map((judgment) => ({
              name: judgment,
              type: 'bar',
              stack: 'judgment',
              data: Array.from(new Set(judgmentByRetriever.map((item) => item.retriever_name))).map((retriever) => judgmentByRetriever.find((item) => item.retriever_name === retriever && item.judgment === judgment)?.count ?? 0),
            })),
          }}
        />
      </section>
      <section className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold">{t('llm.promptTypeLatency')}</h3>
        <ReactECharts
          style={{ height: 300 }}
          option={{
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: promptTypeLatency.map((item) => item.prompt_type), axisLabel: { rotate: 25 } },
            yAxis: { type: 'value', name: 'ms' },
            series: [{ type: 'bar', data: promptTypeLatency.map((item) => Number(item.average_latency_ms.toFixed(1))), itemStyle: { color: '#0891b2' } }],
          }}
        />
      </section>
      <section className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold">{t('llm.rewriteImprovement')}</h3>
        <ReactECharts
          style={{ height: 320 }}
          option={{
            tooltip: { trigger: 'axis' },
            legend: { top: 0 },
            xAxis: { type: 'category', data: rewriteByKind.map((item) => item.rewrite_kind) },
            yAxis: { type: 'value' },
            series: [
              { name: 'Recall delta', type: 'bar', data: rewriteByKind.map((item) => Number(item.recall_delta.toFixed(3))), itemStyle: { color: '#0d9488' } },
              { name: 'nDCG delta', type: 'bar', data: rewriteByKind.map((item) => Number(item.ndcg_delta.toFixed(3))), itemStyle: { color: '#7c3aed' } },
            ],
          }}
        />
      </section>
    </div>
  );
}
