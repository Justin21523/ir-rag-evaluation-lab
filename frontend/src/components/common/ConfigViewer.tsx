export function ConfigViewer({ value }: { value: unknown }) {
  return <pre className="max-h-56 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(value, null, 2)}</pre>;
}
