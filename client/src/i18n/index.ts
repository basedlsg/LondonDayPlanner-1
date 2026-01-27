import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en/translation.json';
import zhHKTranslations from './locales/zh-HK/translation.json';
import zhCNTranslations from './locales/zh-CN/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      'zh-HK': { translation: zhHKTranslations },
      'zh-CN': { translation: zhCNTranslations }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-HK', 'zh-CN'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-HK', name: 'Traditional Chinese', nativeName: '繁體中文' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文' }
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];
