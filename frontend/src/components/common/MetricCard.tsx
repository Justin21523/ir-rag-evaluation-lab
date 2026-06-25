export function MetricCard({ label, value, delta }: { label: string; value: string | number; delta?: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {delta && <span className="rounded bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">{delta}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded bg-slate-100">
        <div className="h-full w-2/3 rounded bg-accent" />
      </div>
    </section>
  );
}
