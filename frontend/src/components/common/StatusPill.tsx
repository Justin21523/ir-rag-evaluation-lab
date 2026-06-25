export function StatusPill({ value }: { value: string }) {
  const tone = value === 'completed' ? 'bg-teal-50 text-teal-800' : value === 'failed' ? 'bg-red-50 text-red-800' : value === 'cancelled' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800';
  return <span className={`rounded px-2 py-1 text-xs font-medium ${tone}`}>{value}</span>;
}
