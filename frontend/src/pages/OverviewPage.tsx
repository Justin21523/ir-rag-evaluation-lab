import { useTranslation } from 'react-i18next';
import { useCorpusOverview } from '../hooks/useCorpus';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { MetricCard } from '../components/common/MetricCard';
import { useDatasetSelection } from '../hooks/useDatasetSelection';
import { LlmStatusPanel } from '../components/llm/LlmStatusPanel';
import { useAnalyticsOverview } from '../hooks/useAnalytics';
import { Link } from 'react-router-dom';

export function OverviewPage() {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const overview = useCorpusOverview(datasetId);
  const analytics = useAnalyticsOverview(datasetId);
  if (overview.isLoading) return <LoadingState />;
  if (overview.isError) return <ErrorState />;
  const data = overview.data;
  const best = analytics.data?.leaderboard[0];
  return (
    <div className="grid gap-5">
      <section data-tour-id="overview-command-center" className="rounded-xl border bg-slate-950 p-5 text-white shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-sm text-teal-300">{t('navigation.overview')}</p>
            <h2 className="mt-2 text-2xl font-semibold">Evaluation Command Center</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{datasetId} · {data?.available_retrievers.join(' / ')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/experiment-workflow" className="rounded bg-teal-500 px-4 py-2 text-sm font-medium text-white">{t('workflow.runAndCompare')}</Link>
              <Link to="/analytics" className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-100">{t('navigation.analytics')}</Link>
            </div>
          </div>
          <div className="grid gap-2 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">{t('analytics.summary')}</span><span>{best?.retriever_name ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">{t('overview.bestRecall10')}</span><span>{best ? `${(best['recall@10'] * 100).toFixed(1)}%` : '-'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">{t('metrics.zeroResultRate')}</span><span>{best ? `${(best.zero_result_rate * 100).toFixed(1)}%` : '-'}</span></div>
          </div>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t('corpus.documents')} value={data?.document_count ?? 0} />
        <MetricCard label={t('corpus.queries')} value={data?.query_count ?? 0} />
        <MetricCard label={t('datasets.qrels')} value={data?.qrels_count ?? 0} />
        <MetricCard label={t('overview.bestRecall10')} value={best ? `${(best['recall@10'] * 100).toFixed(1)}%` : '-'} />
        <MetricCard label={t('overview.bestNdcg10')} value={best ? `${(best['ndcg@10'] * 100).toFixed(1)}%` : '-'} />
        <MetricCard label={t('metrics.zeroResultRate')} value={best ? `${(best.zero_result_rate * 100).toFixed(1)}%` : '-'} />
        <MetricCard label={t('metrics.citationCoverage')} value="67%" />
        <MetricCard label={t('overview.latestExperiment')} value={best?.experiment_id ?? '-'} />
        <MetricCard label={t('retrieval.retrievedDocument')} value={data?.available_retrievers.join(', ') ?? ''} />
        </div>
        <LlmStatusPanel />
      </section>
    </div>
  );
}
