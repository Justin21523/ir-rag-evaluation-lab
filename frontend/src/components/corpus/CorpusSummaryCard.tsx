import { MetricCard } from '../common/MetricCard';
import { useTranslation } from 'react-i18next';

export function CorpusSummaryCard({ documents, queries }: { documents: number; queries: number }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MetricCard label={t('corpus.documents')} value={documents} />
      <MetricCard label={t('corpus.queries')} value={queries} />
    </div>
  );
}
