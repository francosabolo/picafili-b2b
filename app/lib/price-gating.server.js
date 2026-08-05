/**
 * Gating de precios **en el servidor**.
 *
 * El portal promete que los precios mayoristas son solo para cuentas
 * aprobadas, pero hasta acá esa promesa la cumplía únicamente la UI: el
 * componente mostraba "🔒 Precio para clientes aprobados" mientras los precios
 * viajaban igual en el payload de Remix. Medido en `/collections/all` como
 * invitado: **320 importes en el HTML**, a la vista de cualquiera que abra el
 * código fuente. Para un catálogo mayorista eso es la lista de precios
 * completa publicada.
 *
 * Un gate que corre después de mandar el dato no es un gate. Estas funciones
 * lo mueven al loader: si el visitante no puede ver precios, los precios no
 * salen del servidor.
 */

import {EMPTY_DISCOUNT_CONTEXT} from '~/lib/discounts.js';

const DEMO_STATE_COOKIE = 'demoAccountState';

/** Estados del switcher de demo que sí ven precios. */
const STATES_WITH_PRICES = new Set(['approved', 'sales_rep']);

/**
 * Claves que llevan importes. Se anulan enteras: dejar el objeto con la
 * moneda y sin monto rompía a `<Price>`, que espera `{amount, currencyCode}`
 * o nada.
 */
const PRICE_KEYS = new Set([
  'price',
  'compareAtPrice',
  'priceRange',
  'compareAtPriceRange',
  'priceV2',
  'quantityPriceBreaks',
]);

/**
 * ¿Este visitante puede ver precios?
 *
 * La company real manda sobre el switcher, igual que en el cliente: el
 * switcher es una herramienta de demo y deja de gobernar apenas hay B2B.
 *
 * @param {Request} request
 * @param {{companyId?: string}|null} b2b
 */
export function canSeePricesOnServer(request, b2b) {
  if (b2b?.companyId) return true;

  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${DEMO_STATE_COOKIE}=([^;]+)`),
  );
  const state = match ? decodeURIComponent(match[1]) : null;

  return STATES_WITH_PRICES.has(state);
}

/**
 * Devuelve una copia del dato sin ningún importe.
 *
 * Camina la estructura completa en vez de conocer la forma de cada query: los
 * precios aparecen en `product.priceRange`, en `variants.nodes[].price`, en
 * los quiebres por cantidad… y cada query nueva agregaría un lugar más donde
 * olvidarse. Caminar el árbol falla del lado seguro.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function stripPrices(value) {
  if (Array.isArray(value)) return value.map(stripPrices);

  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = PRICE_KEYS.has(key) ? null : stripPrices(child);
    }
    return out;
  }

  return value;
}

/**
 * Atajo para loaders: filtra solo si corresponde.
 *
 * @template T
 * @param {T} data
 * @param {boolean} canSeePrices
 * @returns {T}
 */
export function gatePrices(data, canSeePrices) {
  return canSeePrices ? data : stripPrices(data);
}

/**
 * Filtra los descuentos con el mismo criterio que los precios.
 *
 * Un porcentaje de descuento combinado con el precio público **es** el precio
 * mayorista. Mandarle "Descuento 1: 10%" a un invitado publica el acuerdo
 * comercial igual que publicar la lista. Va en este archivo, y no en otro, para
 * que sea UNA decisión y no dos que se desincronizan.
 *
 * @template T
 * @param {T} discountContext
 * @param {boolean} canSeePrices
 */
export function gateDiscounts(discountContext, canSeePrices) {
  return canSeePrices ? discountContext : EMPTY_DISCOUNT_CONTEXT;
}
