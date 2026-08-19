import {RETAIL_PRICES_QUERY} from '~/graphql/products/retailPrices.js';

/**
 * El precio **de retail** de cada variante, para poder mostrar contra qué
 * ahorra el comprador mayorista.
 *
 * ## Por qué hace falta pedirlo aparte
 *
 * El catálogo "Precios Mayoristas" es una lista por **porcentaje** (−25%), y
 * Shopify aplica ese ajuste a todo: al precio y también al `compareAtPrice`.
 * Con buyer context, entonces, el tachado que llega no es el precio público:
 * es el precio tachado del producto con el mismo 25% descontado. En pantalla se
 * ve un ahorro de −8% que no existe y que no tiene nada que ver con el acuerdo.
 *
 * El precio público hay que ir a buscarlo **sin** buyer context, que es
 * exactamente lo que hace este módulo.
 *
 * ## Por qué esta query sí se cachea
 *
 * La invariante del proyecto es "toda query con precios va sin caché", y sigue
 * en pie: lo que no se puede cachear es el precio **de una company**, porque
 * una entrada compartida sería la lista de precios de un cliente servida a
 * otro. Esta query no lleva buyer: devuelve el precio público, que es el mismo
 * para todo el mundo. Es la única forma de precio que se puede compartir.
 *
 * ## Alternativa descartada
 *
 * Cargar el precio de retail como `compareAtPrice` fijo del catálogo
 * (`npm run precios:compare-at`). No aplica acá: en una lista por porcentaje,
 * escribir precios fijos **congela** el catálogo — a partir de ahí un cambio de
 * precio en el producto deja de reflejarse. Sirve para listas de precios fijos.
 */

/** Solo variantes: los demás nodos no tienen precio que comparar. */
const VARIANT_GID = 'gid://shopify/ProductVariant/';

/**
 * Junta los ids de variante que aparecen en cualquier parte del payload.
 *
 * Camina la estructura en vez de conocer la forma de cada query, por la misma
 * razón que `stripPrices`: los precios aparecen en el listado, en la ficha, en
 * la compra rápida y en los destacados, y cada query nueva sería un lugar más
 * donde olvidarse.
 *
 * @param {unknown} value
 * @param {Set<string>} [found]
 */
function collectVariantIds(value, found = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectVariantIds(item, found);
    return found;
  }

  if (value && typeof value === 'object') {
    if (typeof value.id === 'string' && value.id.startsWith(VARIANT_GID)) {
      // Sin precio no hay nada que comparar (por ejemplo, una variante que
      // vino solo como referencia).
      if (value.price) found.add(value.id);
    }

    for (const child of Object.values(value)) collectVariantIds(child, found);
  }

  return found;
}

/**
 * Devuelve una copia del payload con `compareAtPrice` = precio de retail.
 *
 * Pisa el `compareAtPrice` que trajo Shopify a propósito: ese venía con el
 * ajuste del catálogo aplicado y anunciaba un ahorro inventado. Solo se escribe
 * cuando el retail es **mayor** que el precio pagado; si no, no hay ahorro que
 * mostrar y dejarlo en `null` es lo honesto.
 *
 * @template T
 * @param {T} value
 * @param {Map<string, {amount: string, currencyCode: string}>} retail
 * @returns {T}
 */
function applyRetail(value, retail) {
  if (Array.isArray(value))
    return value.map((item) => applyRetail(item, retail));

  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = applyRetail(child, retail);
    }

    if (typeof out.id === 'string' && retail.has(out.id) && out.price) {
      const publicPrice = retail.get(out.id);
      const saves = Number(publicPrice?.amount) > Number(out.price.amount);

      out.compareAtPrice = saves ? publicPrice : null;
    }

    return out;
  }

  return value;
}

/**
 * Enriquece el payload de un loader con el precio público de cada variante.
 *
 * **Nunca lanza y nunca bloquea la página**: si la query falla, devuelve el
 * dato como vino. Un tachado que no aparece es un detalle; un listado que no
 * carga porque falló una consulta decorativa, no.
 *
 * @template T
 * @param {import('@shopify/remix-oxygen').AppLoadContext} context
 * @param {T} data
 * @returns {Promise<T>}
 */
export async function withRetailCompareAt(context, data) {
  // Sin buyer context los precios que se muestran YA son los públicos: tachar
  // el mismo número contra sí mismo no dice nada.
  if (!context?.b2b?.buyer) return data;

  try {
    const ids = [...collectVariantIds(data)];
    if (!ids.length) return data;

    const {storefront} = context;

    const result = await storefront.query(RETAIL_PRICES_QUERY, {
      // Sin `buyer` — ese es el punto — y por eso se puede cachear.
      cache: storefront.CacheLong(),
      variables: {ids},
    });

    const retail = new Map();
    for (const node of result?.nodes ?? []) {
      if (node?.id && node?.price) retail.set(node.id, node.price);
    }

    if (!retail.size) return data;

    return applyRetail(data, retail);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('withRetailCompareAt:', error);
    return data;
  }
}
