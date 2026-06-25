import { useTranslation } from 'react-i18next';

export function useLocale() {
  const { i18n } = useTranslation();
  const setLocale = (locale: 'zh-TW' | 'en-US') => i18n.changeLanguage(locale);
  return { locale: i18n.language, setLocale };
}
