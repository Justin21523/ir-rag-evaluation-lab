import { useTranslation } from 'react-i18next';

export function LoadingState() {
  const { t } = useTranslation();
  return <div className="animate-pulse rounded border bg-white p-4 text-sm text-slate-600">{t('common.loading')}</div>;
}
