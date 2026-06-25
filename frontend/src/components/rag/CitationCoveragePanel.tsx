import { useTranslation } from 'react-i18next';
import { MetricCard } from '../common/MetricCard';

export function CitationCoveragePanel({ value }: { value: number }) {
  const { t } = useTranslation();
  return <MetricCard label={t('metrics.citationCoverage')} value={`${Math.round(value * 100)}%`} />;
}
