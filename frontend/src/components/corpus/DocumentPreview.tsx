import type { DocumentRecord } from '../../api/types';

export function DocumentPreview({ document }: { document: DocumentRecord }) {
  return (
    <article className="rounded-lg border bg-white p-4">
      <h3 className="font-semibold">{document.title}</h3>
      <p className="mt-2 text-sm text-slate-700">{document.text}</p>
      <p className="mt-3 text-xs text-slate-500">{document.doc_id}</p>
    </article>
  );
}
