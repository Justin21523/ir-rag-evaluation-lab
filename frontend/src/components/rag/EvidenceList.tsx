export function EvidenceList({ evidence }: { evidence: Array<{ doc_id: string; title: string; snippet: string }> }) {
  return (
    <div className="grid gap-2">
      {evidence.map((item) => (
        <details key={item.doc_id} className="rounded border bg-white p-3" open>
          <summary className="cursor-pointer font-medium">{item.title}</summary>
          <p className="mt-2 text-sm text-slate-700">{item.snippet}</p>
          <p className="mt-1 text-xs text-slate-500">{item.doc_id}</p>
        </details>
      ))}
    </div>
  );
}
