import {useMatches} from '@remix-run/react';
import {STORE_COUNTRY, STORE_CURRENCY, STORE_LANGUAGES} from '~/lib/const.js';

/**
 * Locale por defecto de la tienda, para cuando el del root no llegó.
 *
 * Misma forma que devuelve `getLocaleFromRequest` — se arma acá y no se
 * importa de `app/lib/i18n.js` porque esa función necesita una `Request` y
 * esto corre en el navegador.
 */
const FALLBACK_LOCALE = {
  country: STORE_COUNTRY,
  currency: STORE_CURRENCY,
  language: STORE_LANGUAGES[0],
  pathPrefix: `/${STORE_LANGUAGES[0].toLowerCase()}`,
  isDefault: true,
};

/**
 * El locale activo, leído de los datos del root.
 *
 * ⚠️ **Antes esto lanzaba** cuando `root.data.i18n` no estaba, y el resultado
 * era peor que el problema que denunciaba: lo usa `<Price>`, así que cualquier
 * página con un importe se caía entera con "i18n was not returned from the root
 * layout loader" — un mensaje que apunta a la configuración del proyecto cuando
 * la causa real estaba en otro lado (una redirección del gate que el cliente de
 * Remix no podía seguir, por ejemplo). El error verdadero quedaba tapado por
 * este.
 *
 * Ahora cae al locale por defecto de la tienda: se pierde el idioma elegido en
 * esa pantalla —el peor caso es un precio formateado en castellano para alguien
 * que navegaba en inglés— y el error de fondo queda visible en la consola en
 * vez de convertirse en una pantalla en blanco.
 */
export function useLocale() {
  const [root] = useMatches();

  if (!root?.data?.i18n) {
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        '[i18n] El root no devolvió i18n; se usa el locale por defecto de la tienda. Suele ser síntoma de que el árbol se está renderizando sin los datos del root.',
      );
    }

    return FALLBACK_LOCALE;
  }

  return root.data.i18n;
}
