import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { DatasetSelector } from './DatasetSelector';

export function Header() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold">{t('app.title')}</h1>
        <p className="text-xs text-slate-500">{t('app.subtitle')}</p>
      </div>
      <div className="flex items-center gap-3">
        <DatasetSelector />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
