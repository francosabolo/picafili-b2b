import {REQUIRE_CUSTOMER_TAGS} from '~/lib/const.js';

/**
 * Aprobación mayorista por **tag de cliente** — la chapuza, en un solo lugar.
 *
 * ## Qué es
 *
 * El alta mayorista de esta tienda termina con una persona poniéndole tags al
 * cliente en el admin (`mayorista`, `mayorista-aprobado`). Este archivo es lo
 * que convierte esos tags en permiso de entrada al portal.
 *
 * ## Qué NO es
 *
 * **No es un precio.** Un tag no le dice a Shopify qué catálogo mostrarle a
 * este comprador: los catálogos B2B cuelgan de la *company location*, y sin
 * company la Storefront API devuelve el mercado por defecto. Quien entra por
 * tag entra al portal, pero el precio sigue viniendo de donde venía. La
 * decisión de qué ve de precios la toma `price-gating.server.js`, no esto.
 *
 * ## De dónde salen los tags
 *
 * De `customer.tags` de la **Customer Account API** — sí, los expone, no hace
 * falta pasar por Admin API. Viajan en la misma query que ya pedía la company
 * (`CUSTOMER_COMPANY_QUERY`), así que el chequeo no agrega ni una llamada.
 *
 * Como esa query corre **una vez por request**, sacarle el tag a alguien en el
 * admin lo deja afuera en su próxima navegación: no hay nada cacheado que
 * haya que invalidar, y tampoco hay que esperar a que caduque la sesión.
 */

/**
 * Normaliza como Shopify al deduplicar: sin distinguir mayúsculas y sin
 * espacios en los bordes. El admin conserva cómo se escribió el tag pero trata
 * `Mayorista` y `mayorista` como el mismo, así que el gate no puede opinar
 * distinto — si opinara, alguien con el tag puesto se quedaría afuera sin que
 * la ficha del cliente muestre nada raro.
 *
 * @param {unknown} tag
 */
function normalize(tag) {
  return String(tag ?? '')
    .trim()
    .toLowerCase();
}

/**
 * ¿Este cliente tiene **todos** los tags que pide el portal?
 *
 * Es un AND, no un OR: `mayorista` marca al que pidió el alta y
 * `mayorista-aprobado` al que además fue aprobado. Con OR alcanzaría con el
 * primero —que se lo pone el propio formulario de solicitud— y la aprobación
 * dejaría de existir como paso.
 *
 * Lista vacía en `REQUIRE_CUSTOMER_TAGS` = chequeo apagado, que es lo que hay
 * que dejar el día que la aprobación vuelva a ser la company.
 *
 * @param {string[]|null|undefined} tags tal como los devuelve `customer.tags`
 * @returns {boolean}
 */
export function hasRequiredCustomerTags(tags) {
  if (REQUIRE_CUSTOMER_TAGS.length === 0) return true;

  const owned = new Set((tags ?? []).map(normalize));

  return REQUIRE_CUSTOMER_TAGS.every((required) =>
    owned.has(normalize(required)),
  );
}
