import { useTranslation } from 'react-i18next';
import { useCorpusOverview } from '../hooks/useCorpus';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { MetricCard } from '../components/common/MetricCard';
import { useDatasetSelection } from '../hooks/useDatasetSelection';

export function OverviewPage() {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const overview = useCorpusOverview(datasetId);
  if (overview.isLoading) return <LoadingState />;
  if (overview.isError) return <ErrorState />;
  const data = overview.data;
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">{t('navigation.overview')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t('corpus.documents')} value={data?.document_count ?? 0} />
        <MetricCard label={t('corpus.queries')} value={data?.query_count ?? 0} />
        <MetricCard label={t('datasets.qrels')} value={data?.qrels_count ?? 0} />
        <MetricCard label={t('overview.bestRecall10')} value="0.80" />
        <MetricCard label={t('overview.bestNdcg10')} value="0.78" />
        <MetricCard label={t('metrics.zeroResultRate')} value="0%" />
        <MetricCard label={t('metrics.citationCoverage')} value="67%" />
        <MetricCard label={t('overview.latestExperiment')} value="sample" />
        <MetricCard label={t('retrieval.retrievedDocument')} value={data?.available_retrievers.join(', ') ?? ''} />
      </div>
    </div>
  );
}
