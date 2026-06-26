import { Network, Play, Share2, Sigma, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AssociationRuleTable, CollocationBarChart, CooccurrenceHeatmap, CooccurrenceNetworkWorkbench, TermTreemap, TextMiningSankeyChart } from '../components/charts/TextMiningCharts';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { MetricCard } from '../components/common/MetricCard';
import { useDatasetSelection } from '../hooks/useDatasetSelection';
import { useRunTextMining, useTextAssociationRules, useTextCollocations, useTextCooccurrence, useTextMiningSummary, useTextNetwork, useTextSankey, useTextTerms } from '../hooks/useTextMining';

export function TextMiningPage() {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const summary = useTextMiningSummary(datasetId);
  const runTextMining = useRunTextMining(datasetId);
  const runId = summary.data?.run_id ?? undefined;
  const terms = useTextTerms(datasetId, runId);
  const network = useTextNetwork(datasetId, runId);
  const cooccurrence = useTextCooccurrence(datasetId, runId);
  const collocations = useTextCollocations(datasetId, runId);
  const rules = useTextAssociationRules(datasetId, runId);
  const sankey = useTextSankey(datasetId, runId);
  const isLoading = summary.isLoading || terms.isLoading || network.isLoading || cooccurrence.isLoading || collocations.isLoading || rules.isLoading || sankey.isLoading;
  const isError = summary.isError || terms.isError || network.isError || cooccurrence.isError || collocations.isError || rules.isError || sankey.isError;

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;

  if (!summary.data?.available) {
    return (
      <div className="grid gap-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-semibold">{t('textMining.title')}</h2>
            <p className="text-sm text-slate-500">{datasetId}</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => runTextMining.mutate()} disabled={runTextMining.isPending}>
            <Play size={16} />{t('textMining.run')}
          </button>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-semibold">{t('textMining.title')}</h2>
          <p className="text-sm text-slate-500">{datasetId} · {runId}</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => runTextMining.mutate()} disabled={runTextMining.isPending}>
          <Play size={16} />{runTextMining.isPending ? t('common.loading') : t('textMining.run')}
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('textMining.documents')} value={summary.data.document_count ?? 0} delta={t('textMining.corpusAnalyzed')} />
        <MetricCard label={t('textMining.terms')} value={summary.data.term_count ?? 0} delta={summary.data.summary?.top_terms?.slice(0, 3).join(', ')} />
        <MetricCard label={t('textMining.edges')} value={summary.data.edge_count ?? 0} delta={t('textMining.cooccurrence')} />
        <MetricCard label={t('textMining.rules')} value={summary.data.rule_count ?? 0} delta={t('textMining.basketAnalysis')} />
      </section>

      <section className="grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-4">
        <div className="flex items-center gap-3"><Network className="text-teal-700" size={20} /><div><p className="text-xs text-slate-500">{t('textMining.communities')}</p><p className="font-semibold">{summary.data.summary?.communities ?? 0}</p></div></div>
        <div className="flex items-center gap-3"><Sigma className="text-teal-700" size={20} /><div><p className="text-xs text-slate-500">{t('textMining.collocations')}</p><p className="font-semibold">{summary.data.summary?.collocations ?? 0}</p></div></div>
        <div className="flex items-center gap-3"><Share2 className="text-teal-700" size={20} /><div><p className="text-xs text-slate-500">{t('textMining.sankeyLinks')}</p><p className="font-semibold">{summary.data.summary?.sankey_links ?? 0}</p></div></div>
        <div className="flex items-center gap-3"><Workflow className="text-teal-700" size={20} /><div><p className="text-xs text-slate-500">{t('textMining.finishedAt')}</p><p className="font-mono text-xs">{summary.data.finished_at ?? '-'}</p></div></div>
      </section>

      <div data-tour-id="text-mining-network">
        <CooccurrenceNetworkWorkbench network={network.data} terms={terms.data} collocations={collocations.data} rules={rules.data} />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <TextMiningSankeyChart data={sankey.data} />
        <CooccurrenceHeatmap data={cooccurrence.data} />
        <TermTreemap data={terms.data} />
        <CollocationBarChart data={collocations.data} />
        <AssociationRuleTable data={rules.data} />
      </section>
    </div>
  );
}
