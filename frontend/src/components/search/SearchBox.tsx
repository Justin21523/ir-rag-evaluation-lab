import { Copy, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SearchBox({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2">
      <input
        value={value}
        placeholder={t('query.placeholder')}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit();
        }}
        className="min-w-0 flex-1 rounded border px-3 py-2"
      />
      <button type="button" onClick={() => navigator.clipboard?.writeText(value)} className="rounded border bg-white px-3" aria-label={t('common.copy')}>
        <Copy size={18} aria-hidden />
      </button>
      <button type="button" onClick={onSubmit} className="flex items-center gap-2 rounded bg-accent px-4 py-2 text-white">
        <Search size={18} aria-hidden />
        {t('common.search')}
      </button>
    </div>
  );
}
