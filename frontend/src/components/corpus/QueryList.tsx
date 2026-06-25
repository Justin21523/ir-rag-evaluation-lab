import type { QueryRecord } from '../../api/types';

export function QueryList({ queries }: { queries: QueryRecord[] }) {
  return (
    <div className="grid gap-2">
      {queries.map((query) => (
        <div key={query.query_id} className="rounded border bg-white p-3 text-sm">
          <div className="font-medium">{query.query}</div>
          <div className="mt-1 text-xs text-slate-500">{query.relevant_doc_ids.join(', ')}</div>
        </div>
      ))}
    </div>
  );
}
