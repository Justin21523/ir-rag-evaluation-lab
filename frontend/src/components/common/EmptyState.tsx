import { useTranslation } from 'react-i18next';

export function EmptyState() {
  const { t } = useTranslation();
  return <div className="rounded border border-dashed bg-white p-6 text-sm text-slate-600">{t('common.empty')}</div>;
}
