import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { irApi } from '../api/irApi';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';

export function MetricGlossaryPage() {
  const { t } = useTranslation();
  const definitions = useQuery({ queryKey: ['metric-definitions'], queryFn: irApi.metricsDefinitions });
  if (definitions.isLoading) return <LoadingState />;
  if (definitions.isError) return <ErrorState />;
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">{t('navigation.metricGlossary')}</h2>
      <div className="grid gap-3">
        {Object.entries(definitions.data ?? {}).map(([name, definition]) => (
          <section key={name} className="rounded-lg border bg-white p-4">
            <h3 className="font-semibold">{name}</h3>
            <p className="mt-2 text-sm text-slate-700">{definition}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
