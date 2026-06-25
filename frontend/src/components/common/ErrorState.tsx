import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ErrorState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertTriangle size={18} aria-hidden />
      <span>{message || t('errors.apiUnavailable')}</span>
    </div>
  );
}
