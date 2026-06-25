import { useTranslation } from 'react-i18next';

export function RagAnswerPanel({ answer, citations }: { answer: string; citations: string[] }) {
  const { t } = useTranslation();
  return (
    <section className="rounded-lg border bg-white p-4">
      <h3 className="font-semibold">{t('rag.answer')}</h3>
      <p className="mt-2 text-sm text-slate-700">{answer}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {citations.map((docId) => <span key={docId} className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">{docId}</span>)}
      </div>
    </section>
  );
}
