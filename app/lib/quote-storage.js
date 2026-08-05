import Cookies from 'js-cookie';

/**
 * Dónde vive el presupuesto en borrador.
 *
 * **El problema que resuelve.** Antes vivía entero en la cookie `quoteItems`, y
 * las cookies mueren a los 4 KB. Medido: ~460 bytes por línea, o sea que a
 * partir de la novena el navegador **descartaba la cookie en silencio** y el
 * comprador perdía el pedido completo. Sin error en pantalla ni en consola. Un
 * pedido mayorista real tiene 20 o 30 líneas: el techo no era un caso borde,
 * era el caso normal.
 *
 * **La solución, y por qué no es solo "usar localStorage".** El presupuesto se
 * renderiza en el servidor —la barra inferior y el contador del header salen en
 * el HTML— y el servidor no puede leer localStorage. Mover todo ahí traía de
 * vuelta el hydration mismatch que ya se arregló dos veces en este proyecto.
 *
 * Por eso el almacenamiento está partido, y cada mitad guarda lo que la otra no
 * puede:
 *
 * - **localStorage** guarda las líneas completas. Tiene ~5 MB: el techo deja de
 *   existir para cualquier pedido realista.
 * - **Una cookie chica** (`quoteSummary`) guarda solo `{count, total}`. Es lo
 *   único que el servidor necesita para pintar la barra y el contador sin
 *   divergir del cliente. Pesa ~40 bytes y no crece con el pedido.
 *
 * Las dos se escriben juntas y siempre en el mismo orden, así no se
 * desincronizan.
 */

const LINES_KEY = 'quoteItems';
const SUMMARY_COOKIE = 'quoteSummary';

/** La cookie vieja, que guardaba el pedido entero. Se migra y se borra. */
const LEGACY_COOKIE = 'quoteItems';

/**
 * El resumen que viaja en la cookie.
 *
 * Lleva el IMPORTE además del conteo. Con solo el conteo, el servidor pintaba
 * "24 artículos" sin precio y el total aparecía recién al hidratar: un
 * parpadeo en el elemento más visible de la pantalla, y justo la clase de
 * divergencia servidor/cliente que este diseño venía a evitar.
 *
 * @param {Array} items
 * @param {{amount: string, currencyCode: string}|null} total
 */
function summarize(items, total) {
  return {
    count: items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0),
    lines: items.length,
    amount: total?.amount ?? null,
    currencyCode: total?.currencyCode ?? null,
  };
}

/**
 * Guarda el presupuesto. Escribe las dos mitades.
 *
 * @param {Array} items
 */
export function saveQuoteItems(items, total) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LINES_KEY, JSON.stringify(items));
  } catch (error) {
    // localStorage lleno o bloqueado (modo privado). El pedido sigue en
    // memoria durante la sesión; se pierde al recargar, pero no se rompe nada.
  }

  Cookies.set(SUMMARY_COOKIE, JSON.stringify(summarize(items, total)), {
    expires: 7,
  });
}

/**
 * Lee el presupuesto guardado. Solo tiene sentido en el cliente.
 *
 * Migra desde la cookie vieja si es lo único que hay: un comprador con un
 * presupuesto a medio armar no tiene por qué perderlo porque cambiamos dónde
 * lo guardamos.
 *
 * @returns {Array}
 */
export function loadQuoteItems() {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(LINES_KEY);
    if (stored) return JSON.parse(stored) ?? [];

    const legacy = Cookies.get(LEGACY_COOKIE);
    if (legacy) {
      const items = JSON.parse(legacy) ?? [];
      saveQuoteItems(items);
      Cookies.remove(LEGACY_COOKIE);
      return items;
    }
  } catch (error) {
    // Dato corrupto: mejor un presupuesto vacío que una pantalla rota.
  }

  return [];
}

export function clearQuoteStorage() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(LINES_KEY);
  } catch (error) {
    // Ver arriba.
  }

  Cookies.remove(SUMMARY_COOKIE);
  Cookies.remove(LEGACY_COOKIE);
}

/** @typedef {{count: number, lines: number, amount: string|null, currencyCode: string|null}} QuoteSummary */

const EMPTY_SUMMARY = {count: 0, lines: 0, amount: null, currencyCode: null};

/**
 * Resumen leído en el servidor, para pintar la barra y el contador en el HTML.
 *
 * @param {string|null} cookieValue
 * @returns {QuoteSummary}
 */
export function parseQuoteSummary(cookieValue) {
  if (!cookieValue) return EMPTY_SUMMARY;

  try {
    const parsed = JSON.parse(cookieValue);
    return {
      count: Number(parsed?.count) || 0,
      lines: Number(parsed?.lines) || 0,
      amount: parsed?.amount ?? null,
      currencyCode: parsed?.currencyCode ?? null,
    };
  } catch (error) {
    return EMPTY_SUMMARY;
  }
}
