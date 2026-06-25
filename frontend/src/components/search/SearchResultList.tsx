import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SearchResponse } from '../../api/types';
import { EmptyState } from '../common/EmptyState';
import { SearchResultCard } from './SearchResultCard';

export function SearchResultList({ response }: { response?: SearchResponse }) {
  const { t } = useTranslation();
  if (!response) return <EmptyState />;
  if (!response.results.length) return <EmptyState />;
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{t('metrics.latency')}: {response.latency_ms.toFixed(1)} ms</p>
        <button
          type="button"
          className="flex items-center gap-1 rounded border bg-white px-2 py-1 text-xs"
          onClick={() => navigator.clipboard?.writeText(JSON.stringify(response, null, 2))}
        >
          <Copy size={14} aria-hidden />
          JSON
        </button>
      </div>
      {response.results.map((result) => (
        <SearchResultCard key={result.doc_id} result={result} relevant={response.relevant_doc_ids.includes(result.doc_id)} />
      ))}
    </section>
  );
}
