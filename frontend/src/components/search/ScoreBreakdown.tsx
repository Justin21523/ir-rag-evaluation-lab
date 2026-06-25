import { useTranslation } from 'react-i18next';

export function ScoreBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  const { t } = useTranslation();
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-medium text-slate-600">{t('retrieval.scoreBreakdown')}</summary>
      <dl className="mt-2 grid gap-1 text-xs">
        {Object.entries(breakdown).map(([key, value]) => (
          <div key={key} className="flex justify-between rounded bg-slate-50 px-2 py-1">
            <dt>{key}</dt>
            <dd>{value.toFixed(4)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
