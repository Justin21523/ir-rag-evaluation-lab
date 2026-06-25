import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTW from './locales/zh-TW.json';
import enUS from './locales/en-US.json';

const savedLanguage = localStorage.getItem('ir-rag-locale') || 'zh-TW';

i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    'en-US': { translation: enUS },
  },
  lng: savedLanguage,
  fallbackLng: 'zh-TW',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('ir-rag-locale', lng);
  document.documentElement.lang = lng;
});

document.documentElement.lang = savedLanguage;

export default i18n;
