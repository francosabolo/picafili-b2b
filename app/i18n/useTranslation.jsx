import {useTranslationsDictionary} from '~/i18n/useTranslationsDictionary.jsx';
import {useMatches} from '@remix-run/react';

export function useTranslation() {
  const [root] = useMatches();
  const selectedLocale = root?.data?.i18n;
  const language = selectedLocale?.language.toLowerCase();

  const dictionary = useTranslationsDictionary(language);
  if (!dictionary) {
    return {t: (key) => key, dictionary: null};
  }

  function t(key, interpolations = {}) {
    const keys = key?.split('.') ?? [];
    if (typeof dictionary === 'undefined') {
      return key ?? '';
    }

    if (keys.length === 1) {
      if (keys[0] in dictionary) {
        const segmentIsString = typeof dictionary[keys[0]] === 'string';
        if (segmentIsString) {
          return interpolate(dictionary[keys[0]], interpolations);
        } else {
          return '';
        }
      } else {
        return key ?? '';
      }
    } else if (keys.length > 1) {
      const value = getValue(dictionary, key) ?? '';
      if (typeof value === 'string') {
        return interpolate(value, interpolations);
      }
      return key;
    } else {
      return key ?? '';
    }
  }

  return {t, translation: dictionary};
}

function interpolate(string, interpolations) {
  return string.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return interpolations[key] ?? match;
  });
}

function getValue(obj, key) {
  if (!key) {
    return null;
  }
  const keys = key.split('.');
  let value = obj;
  for (let i = 0; i < keys.length; i++) {
    value = value[keys[i]];
    if (!value) {
      break;
    }
  }
  return value;
}
