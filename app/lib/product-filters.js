/**
 * Lee los filtros de la URL y devuelve solo los que la Storefront API acepta.
 *
 * **El problema que resuelve.** Los filtros viajan en la URL como
 * `?filter.<campo>=<json>`, y hasta ahora el loader de colección los pasaba tal
 * cual a Shopify. Dos formas de romper la página, las dos alcanzables con un
 * link viejo o editado a mano:
 *
 * 1. **JSON inválido** → `JSON.parse` lanza dentro del loader.
 * 2. **JSON válido con un campo que no existe en `ProductFilter`** → Shopify
 *    responde `Field is not defined on ProductFilter` y **la colección entera
 *    devuelve 404**. Verificado: un `?filter.p.m.custom.material=…` —que es el
 *    *id* del filtro y no su input— tumbaba la página completa.
 *
 * El segundo es fácil de producir sin querer, porque el id del filtro que
 * devuelve Shopify (`filter.p.m.custom.material`) se parece mucho al nombre del
 * parámetro correcto (`filter.productMetafield`).
 *
 * **El criterio: un filtro que no se entiende se ignora, no rompe.** Un
 * comprador que llega con un link raro tiene que ver el catálogo, no un 404.
 */

/**
 * Campos de `ProductFilter` en la Storefront API.
 *
 * Sale del schema (`@shopify/hydrogen/storefront-api-types`), no de memoria. Si
 * Shopify agrega uno nuevo hay que sumarlo acá — y el síntoma de haberlo
 * olvidado es un filtro que no hace nada, no una página caída.
 */
const VALID_FILTER_FIELDS = new Set([
  'available',
  'price',
  'productMetafield',
  'productType',
  'productVendor',
  'tag',
  'variantMetafield',
  'variantOption',
]);

const FILTER_URL_PREFIX = 'filter.';

/**
 * @param {URLSearchParams} searchParams
 * @returns {Array<object>} filtros listos para la query
 */
export function parseProductFilters(searchParams) {
  const filters = [];

  for (const [key, value] of searchParams.entries()) {
    if (!key.startsWith(FILTER_URL_PREFIX)) continue;

    const field = key.substring(FILTER_URL_PREFIX.length);
    if (!VALID_FILTER_FIELDS.has(field)) continue;

    try {
      filters.push({[field]: JSON.parse(value)});
    } catch (error) {
      // Un filtro con JSON roto en la URL no puede tumbar el catálogo entero.
    }
  }

  return filters;
}
