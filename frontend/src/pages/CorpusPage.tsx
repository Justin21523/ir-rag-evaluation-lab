import { useTranslation } from 'react-i18next';
import { CorpusSummaryCard } from '../components/corpus/CorpusSummaryCard';
import { DocumentPreview } from '../components/corpus/DocumentPreview';
import { QueryList } from '../components/corpus/QueryList';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { useCorpusOverview, useDatasetImports, useDatasetQuality, useDocuments, useQueries } from '../hooks/useCorpus';
import { useDatasetSelection } from '../hooks/useDatasetSelection';
import { ImportJobPanel } from '../components/datasets/ImportJobPanel';
import { DatasetTreemap, DistributionBarChart } from '../components/charts/AnalyticsCharts';
import { useDatasetProfile } from '../hooks/useAnalytics';

export function CorpusPage() {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const overview = useCorpusOverview(datasetId);
  const docs = useDocuments(datasetId);
  const queries = useQueries(datasetId);
  const quality = useDatasetQuality(datasetId);
  const imports = useDatasetImports(datasetId);
  const profile = useDatasetProfile(datasetId);
  if (docs.isLoading || queries.isLoading || overview.isLoading) return <LoadingState />;
  if (docs.isError || queries.isError || overview.isError) return <ErrorState />;
  const dataset = overview.data?.dataset;
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-xl font-semibold">{t('datasets.management')}</h2>
        <p className="text-sm text-slate-500">{dataset?.name ?? datasetId}</p>
      </div>
      <CorpusSummaryCard documents={overview.data?.document_count ?? 0} queries={overview.data?.query_count ?? 0} />
      <section className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3">
        <div><p className="text-xs text-slate-500">{t('datasets.version')}</p><p className="font-medium">{dataset?.version ?? '-'}</p></div>
        <div><p className="text-xs text-slate-500">{t('datasets.license')}</p><p className="font-medium">{dataset?.license ?? '-'}</p></div>
        <div><p className="text-xs text-slate-500">{t('datasets.qrels')}</p><p className="font-medium">{overview.data?.qrels_count ?? 0}</p></div>
        <div className="md:col-span-3"><p className="text-xs text-slate-500">{t('datasets.sourcePath')}</p><p className="font-mono text-sm">{dataset?.source_path ?? '-'}</p></div>
      </section>
      <section data-tour-id="corpus-quality" className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-semibold">{t('datasets.qualityChecks')}</h3>
          <div className="grid gap-2 text-sm">
            {(quality.data ?? []).map((check) => (
              <div key={check.check_name} className="flex justify-between rounded bg-slate-50 px-3 py-2">
                <span>{check.check_name}</span>
                <span className={check.severity === 'ok' ? 'text-teal-700' : 'text-amber-700'}>{check.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <h3 className="mb-3 font-semibold">{t('datasets.importHistory')}</h3>
          <div className="grid gap-2 text-sm">
            {(imports.data ?? []).slice(0, 6).map((item) => (
              <div key={item.import_id} className="rounded bg-slate-50 px-3 py-2">
                <div className="flex justify-between"><span>{item.status}</span><span>{item.imported_count}</span></div>
                <p className="mt-1 truncate text-xs text-slate-500">{item.input_path}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <DatasetTreemap data={profile.data?.metadata_treemap ?? []} />
        <DistributionBarChart title={t('analytics.documentLength')} data={profile.data?.document_lengths ?? []} xKey="bucket" yKey="count" />
      </section>
      <ImportJobPanel />
      <section>
        <h3 className="mb-3 font-semibold">{t('datasets.sampleBrowser')}</h3>
        <div className="grid gap-3 lg:grid-cols-2">{docs.data?.map((doc) => <DocumentPreview key={doc.doc_id} document={doc} />)}</div>
      </section>
      <section>
        <h3 className="mb-3 font-semibold">{t('corpus.queries')}</h3>
        <QueryList queries={queries.data ?? []} />
      </section>
    </div>
  );
}
