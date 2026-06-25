import { useTranslation } from 'react-i18next';

export function FaithfulnessChecklist({ items }: { items: Array<{ id: string; passed: boolean; label: string }> }) {
  const { t } = useTranslation();
  return (
    <section className="rounded-lg border bg-white p-4">
      <h3 className="font-semibold">{t('rag.faithfulnessChecklist')}</h3>
      <ul className="mt-3 grid gap-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className={item.passed ? 'text-teal-800' : 'text-warning'}>{item.passed ? 'OK' : 'WARN'} - {item.label}</li>
        ))}
      </ul>
    </section>
  );
}
