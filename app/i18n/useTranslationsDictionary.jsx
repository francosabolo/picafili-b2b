import {locales} from '~/i18n/locales.jsx';
import enTranslations from '~/i18n/translations/en.json';
import frTranslations from '~/i18n/translations/fr.json';
import esTranslations from '~/i18n/translations/es.json';

const translations = {
  en: enTranslations,
  fr: frTranslations,
  es: esTranslations,
};

export function getLocaleDictionary(locale) {
  const localeId = locales.find((site) => site.path === locale)?.id ?? 'en';
  return translations[localeId] || {};
}

export function useTranslationsDictionary(locale) {
  return getLocaleDictionary(locale);
}
