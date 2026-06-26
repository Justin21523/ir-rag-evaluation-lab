import { Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RetrievalMode } from '../../api/types';
import { useDatasetSelection } from '../../hooks/useDatasetSelection';
import { useQueryRewrite } from '../../hooks/useLlm';

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function QueryRewriteSandbox({ query, mode, k, alpha }: { query: string; mode: RetrievalMode; k: number; alpha: number }) {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const rewrite = useQueryRewrite();
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold"><Wand2 size={17} />{t('llm.queryRewrite')}</h3>
          <p className="text-xs text-slate-500">{t('llm.assistiveNotice')}</p>
        </div>
        <button type="button" className="rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => rewrite.mutate({ dataset_id: datasetId, query, mode, k, alpha })}>
          {t('llm.runRewrite')}
        </button>
      </div>
      {rewrite.data && (
        <div className="mt-4 grid gap-3">
          {rewrite.data.variants.map((variant) => (
            <div key={variant.kind} className="rounded border bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{variant.kind}</p>
                <div className="flex gap-2 text-xs">
                  <span className="rounded bg-white px-2 py-1">Recall {pct(variant.metrics.recall)}</span>
                  <span className="rounded bg-white px-2 py-1">nDCG {pct(variant.metrics.ndcg)}</span>
                  <span className="rounded bg-white px-2 py-1">FRR {variant.metrics.first_relevant_rank ?? '-'}</span>
                </div>
              </div>
              <p className="mt-2 text-sm">{variant.query}</p>
              <p className="mt-1 text-xs text-slate-500">{variant.rationale}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
