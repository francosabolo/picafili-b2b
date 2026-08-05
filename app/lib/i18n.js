import {STORE_COUNTRY, STORE_CURRENCY, STORE_LANGUAGES} from '~/lib/const.js';

/**
 * Locale activo a partir del prefijo de la URL (`/es`, `/en`, `/fr`).
 *
 * Antes había un bloque `if` por idioma, y los tres devolvían `country: 'ES'`
 * con `currency: 'EUR'` — herencia del fork de la tienda española. Con eso
 * todas las queries salían con `@inContext(country: ES)`: una tienda argentina
 * pidiéndole precios al mercado España. El país y la moneda son de la TIENDA,
 * no del idioma en que se la lee, así que ahora salen de `STORE_COUNTRY` /
 * `STORE_CURRENCY` y el prefijo solo elige el idioma.
 *
 * Agregar un idioma es agregarlo a `STORE_LANGUAGES` y poner su JSON en
 * `app/i18n/translations/` — este archivo no se toca.
 *
 * @param {Request} request
 */
export function getLocaleFromRequest(request) {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.substring(1).split('/')[0].toUpperCase();

  const defaultLanguage = STORE_LANGUAGES[0];
  const language = STORE_LANGUAGES.includes(firstPathPart)
    ? firstPathPart
    : defaultLanguage;

  const isDefault = language === defaultLanguage;

  return {
    country: STORE_COUNTRY,
    currency: STORE_CURRENCY,
    language,
    pathPrefix: `/${language.toLowerCase()}`,
    // El idioma por defecto igual conserva su prefijo: las rutas del proyecto
    // son `($locale)` y el resto de la app arma links con `pathPrefix`.
    ...(isDefault ? {isDefault: true} : {}),
  };
}

/**
 * @typedef {Object} I18nLocale
 * @property {string} pathPrefix
 */

/** @typedef {import('@shopify/hydrogen').I18nBase} I18nBase */
