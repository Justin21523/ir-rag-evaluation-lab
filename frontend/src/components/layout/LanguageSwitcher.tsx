import { Languages } from 'lucide-react';
import { useLocale } from '../../hooks/useLocale';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <label className="flex items-center gap-2 text-sm">
      <Languages size={18} aria-hidden />
      <select
        aria-label="Language"
        value={locale}
        onChange={(event) => setLocale(event.target.value as 'zh-TW' | 'en-US')}
        className="rounded border px-2 py-1"
      >
        <option value="zh-TW">繁中</option>
        <option value="en-US">English</option>
      </select>
    </label>
  );
}
