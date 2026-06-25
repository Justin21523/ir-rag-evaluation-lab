import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';

export function MetricsComparisonChart({ data }: { data: Array<Record<string, string | number>> }) {
  const { t } = useTranslation();
  return (
    <div className="h-72 rounded-lg border bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="metric" label={{ value: t('charts.metric'), position: 'insideBottom', offset: -4 }} />
          <YAxis label={{ value: t('charts.value'), angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Bar dataKey="value" fill="#0f766e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
