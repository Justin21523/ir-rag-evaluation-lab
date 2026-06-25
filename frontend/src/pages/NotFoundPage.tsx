import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return <Link to="/" className="text-teal-800 underline">{t('common.backToOverview')}</Link>;
}
