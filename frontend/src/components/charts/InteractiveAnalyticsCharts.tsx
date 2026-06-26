import ReactECharts from 'echarts-for-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { FailureHeatmap, MetricMatrix, RankMovement, RetrieverBattle } from '../../api/types';

function frame(title: string, child: ReactNode) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {child}
    </section>
  );
}

export function MetricMatrixHeatmap({ data }: { data?: MetricMatrix }) {
  const { t } = useTranslation();
  const retrievers = Array.from(new Set((data?.rows ?? []).map((row) => row.retriever_name)));
  const metricKeys = (data?.metrics?.length ? data.metrics : Array.from(new Set((data?.rows ?? []).flatMap((row) => (row.metric ? [row.metric] : Object.keys(row).filter((key) => !['experiment_id', 'retriever_name', 'name'].includes(key)))))));
  const values = (data?.rows ?? []).flatMap((row) => metricKeys.map((metric) => {
    const rawValue = row.metric === metric ? row.value : row[metric];
    return [metricKeys.indexOf(metric), retrievers.indexOf(row.retriever_name), Number(Number(rawValue ?? 0).toFixed(4))];
  }));
  return frame(t('analytics.metricMatrix'), (
    <ReactECharts
      style={{ height: 360 }}
      option={{
        tooltip: { position: 'top' },
        grid: { left: 92, right: 32, top: 24, bottom: 72 },
        xAxis: { type: 'category', data: metricKeys, axisLabel: { rotate: 35 } },
        yAxis: { type: 'category', data: retrievers },
        visualMap: { min: 0, max: 1, orient: 'horizontal', left: 'center', bottom: 0 },
        series: [{ type: 'heatmap', data: values, label: { show: true, formatter: ({ value }: { value: number[] }) => String(value[2]) } }],
      }}
    />
  ));
}

export function FailureHeatmapChart({ data, onQueryClick }: { data?: FailureHeatmap; onQueryClick?: (queryId: string) => void }) {
  const { t } = useTranslation();
  const queries = Array.from(new Set((data?.rows ?? []).map((row) => row.query_id))).slice(0, 40);
  const retrievers = Array.from(new Set((data?.rows ?? []).map((row) => row.retriever_name)));
  const values = (data?.rows ?? [])
    .filter((row) => queries.includes(row.query_id))
    .map((row) => ({
      value: [retrievers.indexOf(row.retriever_name), queries.indexOf(row.query_id), Number((1 - row.recall).toFixed(3))],
      query_id: row.query_id,
      query: row.query,
      bad_case_type: row.bad_case_type,
    }));
  return frame(t('analytics.failureHeatmap'), (
    <ReactECharts
      style={{ height: 520 }}
      option={{
        tooltip: { formatter: (params: { data: { query_id: string; query: string; bad_case_type: string; value: number[] } }) => `${params.data.query_id}<br/>${params.data.query}<br/>failure ${params.data.value[2]}<br/>${params.data.bad_case_type || 'ok'}` },
        grid: { left: 112, right: 24, top: 32, bottom: 72 },
        xAxis: { type: 'category', data: retrievers },
        yAxis: { type: 'category', data: queries },
        visualMap: { min: 0, max: 1, orient: 'horizontal', left: 'center', bottom: 0 },
        series: [{ type: 'heatmap', data: values, emphasis: { itemStyle: { borderColor: '#111827', borderWidth: 2 } } }],
      }}
      onEvents={{ click: (params: { data?: { query_id?: string } }) => params.data?.query_id && onQueryClick?.(params.data.query_id) }}
    />
  ));
}

export function RankMovementChart({ data, onQueryClick }: { data?: RankMovement; onQueryClick?: (queryId: string) => void }) {
  const { t } = useTranslation();
  const retrievers = Array.from(new Set((data?.rows ?? []).map((row) => row.retriever_name)));
  const queryIds = Array.from(new Set((data?.rows ?? []).map((row) => row.query_id))).slice(0, 16);
  const series = queryIds.map((queryId) => ({
    name: queryId,
    type: 'line',
    smooth: true,
    data: retrievers.map((retriever) => {
      const row = data?.rows.find((item) => item.query_id === queryId && item.retriever_name === retriever);
      return row ? row.first_relevant_rank : null;
    }),
    query_id: queryId,
    emphasis: { focus: 'series' },
  }));
  return frame(t('analytics.rankMovement'), (
    <ReactECharts
      style={{ height: 380 }}
      option={{
        tooltip: { trigger: 'axis' },
        dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18 }],
        xAxis: { type: 'category', data: retrievers },
        yAxis: { type: 'value', inverse: true, name: 'first relevant rank' },
        series,
      }}
      onEvents={{ click: (params: { seriesName?: string }) => params.seriesName && onQueryClick?.(params.seriesName) }}
    />
  ));
}

export function RetrieverBattleChart({ data, onPairClick }: { data?: RetrieverBattle; onPairClick?: (leftExperimentId: string, rightExperimentId: string) => void }) {
  const { t } = useTranslation();
  const rows = data?.pairs ?? [];
  const labels = rows.map((row) => `${row.left_retriever} vs ${row.right_retriever}`);
  return frame(t('analytics.retrieverBattle'), (
    <ReactECharts
      style={{ height: 380 }}
      option={{
        tooltip: { trigger: 'axis' },
        legend: { top: 0 },
        grid: { left: 48, right: 24, top: 48, bottom: 96 },
        xAxis: { type: 'category', data: labels, axisLabel: { rotate: 25 } },
        yAxis: { type: 'value' },
        series: [
          { name: t('analytics.wins'), type: 'bar', stack: 'battle', data: rows.map((row) => row.wins), itemStyle: { color: '#0f766e' } },
          { name: t('analytics.losses'), type: 'bar', stack: 'battle', data: rows.map((row) => row.losses), itemStyle: { color: '#be123c' } },
          { name: t('analytics.ties'), type: 'bar', stack: 'battle', data: rows.map((row) => row.ties), itemStyle: { color: '#64748b' } },
        ],
      }}
      onEvents={{ click: (params: { dataIndex?: number }) => {
        const row = typeof params.dataIndex === 'number' ? rows[params.dataIndex] : undefined;
        if (row) onPairClick?.(row.left_experiment_id, row.right_experiment_id);
      } }}
    />
  ));
}
