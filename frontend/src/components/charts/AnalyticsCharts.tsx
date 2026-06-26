import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, Treemap, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { AnalyticsLeaderboardRow, AnalyticsPoint, DatasetProfile } from '../../api/types';

const palette = ['#0f766e', '#2563eb', '#7c3aed', '#d97706', '#be123c', '#475569'];

function ChartFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
      <div className="h-72">{children}</div>
    </section>
  );
}

function pivotCurve(points: AnalyticsPoint[]) {
  const rows = new Map<number, Record<string, number | string>>();
  for (const point of points) {
    const row = rows.get(point.k) ?? { k: point.k };
    row[point.retriever_name] = Number(point.value.toFixed(4));
    rows.set(point.k, row);
  }
  return Array.from(rows.values()).sort((a, b) => Number(a.k) - Number(b.k));
}

function retrievers(points: AnalyticsPoint[]) {
  return Array.from(new Set(points.map((point) => point.retriever_name)));
}

export function MetricLeaderboardChart({ data }: { data: AnalyticsLeaderboardRow[] }) {
  const { t } = useTranslation();
  return (
    <ChartFrame title={t('analytics.leaderboard')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="retriever_name" />
          <YAxis domain={[0, 1]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="recall@10" fill={palette[0]} name={t('metrics.recallAtK')} />
          <Bar dataKey="ndcg@10" fill={palette[1]} name={t('metrics.ndcgAtK')} />
          <Bar dataKey="mrr" fill={palette[2]} name={t('metrics.mrr')} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function MetricCurveChart({ title, data }: { title: string; data: AnalyticsPoint[] }) {
  const rows = pivotCurve(data);
  const names = retrievers(data);
  return (
    <ChartFrame title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="k" />
          <YAxis domain={[0, 1]} />
          <Tooltip />
          <Legend />
          {names.map((name, idx) => (
            <Line key={name} dataKey={name} stroke={palette[idx % palette.length]} strokeWidth={2} dot />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function LatencyRecallScatter({ data }: { data: Array<{ retriever_name: string; query_id: string; latency_ms: number; recall: number }> }) {
  const { t } = useTranslation();
  const names = Array.from(new Set(data.map((point) => point.retriever_name)));
  return (
    <ChartFrame title={t('analytics.latencyRecall')}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="latency_ms" name={t('metrics.latency')} />
          <YAxis dataKey="recall" name={t('metrics.recallAtK')} domain={[0, 1]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          {names.map((name, idx) => (
            <Scatter key={name} name={name} data={data.filter((point) => point.retriever_name === name)} fill={palette[idx % palette.length]} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function QueryScatterChart({
  title,
  data,
  xKey,
  yKey,
  xLabel,
  yLabel,
  onQueryClick,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  xLabel: string;
  yLabel: string;
  onQueryClick?: (queryId: string) => void;
}) {
  const groups = Array.from(new Set(data.map((point) => String(point.retriever_name ?? 'dataset'))));
  return (
    <ChartFrame title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} name={xLabel} />
          <YAxis dataKey={yKey} name={yLabel} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          {groups.map((name, idx) => (
            <Scatter
              key={name}
              name={name}
              data={data.filter((point) => String(point.retriever_name ?? 'dataset') === name)}
              fill={palette[idx % palette.length]}
              onClick={(point) => {
                const queryId = (point as { query_id?: string }).query_id;
                if (queryId) onQueryClick?.(queryId);
              }}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function DistributionBarChart({ title, data, xKey, yKey }: { title: string; data: Array<Record<string, string | number>>; xKey: string; yKey: string }) {
  return (
    <ChartFrame title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey={yKey} fill={palette[0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function QueryDifficultyDonut({ data }: { data: Array<{ difficulty_label: string; query_count: number }> }) {
  const { t } = useTranslation();
  return (
    <ChartFrame title={t('analytics.queryDifficulty')}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="query_count" nameKey="difficulty_label" innerRadius={62} outerRadius={96} paddingAngle={3} label>
            {data.map((item, idx) => (
              <Cell key={item.difficulty_label} fill={palette[idx % palette.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function DatasetTreemap({ data }: { data: DatasetProfile['metadata_treemap'] }) {
  const { t } = useTranslation();
  return (
    <ChartFrame title={t('analytics.datasetProfile')}>
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={data} dataKey="value" nameKey="name" stroke="#fff" fill={palette[1]} />
      </ResponsiveContainer>
    </ChartFrame>
  );
}
