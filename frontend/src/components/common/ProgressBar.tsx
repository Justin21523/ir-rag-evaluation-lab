export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded bg-slate-100">
      <div className="h-2 rounded bg-accent" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
