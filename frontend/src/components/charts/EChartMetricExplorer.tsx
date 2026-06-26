import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CorrelationData } from '../../api/types';

export function EChartMetricExplorer({ data, onQueryClick }: { data?: CorrelationData; onQueryClick?: (queryId: string) => void }) {
  const { t } = useTranslation();
  const [metric, setMetric] = useState<'recall_latency' | 'query_length_failure' | 'label_count_recall'>('recall_latency');
  const rows = data?.[metric] ?? [];
  const option = useMemo(() => {
    const config = {
      recall_latency: { x: 'latency_ms', y: 'recall', title: t('analytics.latencyRecall') },
      query_length_failure: { x: 'query_length', y: 'failed', title: t('analytics.queryLengthFailure') },
      label_count_recall: { x: 'label_count', y: 'recall', title: t('analytics.labelRecall') },
    }[metric];
    const groups = Array.from(new Set(rows.map((row) => String(row.retriever_name ?? 'dataset'))));
    return {
      animationDuration: 450,
      tooltip: { trigger: 'item' },
      brush: { toolbox: ['rect', 'clear'] },
      grid: { left: 48, right: 24, top: 36, bottom: 48 },
      xAxis: { name: config.x, type: 'value' },
      yAxis: { name: config.y, type: 'value' },
      legend: { top: 0 },
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18 }],
      series: groups.map((group) => ({
        type: 'scatter',
        name: group,
        symbolSize: 9,
        emphasis: { focus: 'series' },
        data: rows
          .filter((row) => String(row.retriever_name ?? 'dataset') === group)
          .map((row) => {
            const record = row as Record<string, string | number | undefined>;
            return { value: [Number(record[config.x] ?? 0), Number(record[config.y] ?? 0)], query_id: record.query_id };
          }),
      })),
    };
  }, [metric, rows, t]);
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{t('analytics.metricExplorer')}</h3>
        <div className="flex flex-wrap gap-2">
          {(['recall_latency', 'query_length_failure', 'label_count_recall'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setMetric(item)} className={`rounded border px-3 py-1 text-xs ${metric === item ? 'bg-slate-900 text-white' : 'bg-white'}`}>{t(`analytics.metric.${item}`)}</button>
          ))}
        </div>
      </div>
      <ReactECharts
        option={option}
        style={{ height: 360 }}
        onEvents={{ click: (params: { data?: { query_id?: string } }) => params.data?.query_id && onQueryClick?.(params.data.query_id) }}
      />
    </section>
  );
}
