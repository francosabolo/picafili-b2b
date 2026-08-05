import {allProductMetafields} from '~/data/metafields.js';

/**
 * Specs de producto para las listas: lo que deja comparar sin abrir la ficha.
 *
 * **Por qué existe.** Un comprador mayorista no descubre, repone: entra sabiendo
 * qué necesita y compara media docena de variantes del mismo artículo. Con
 * tarjetas que solo muestran foto, nombre y precio hay que abrir cada ficha y
 * volver — y en un catálogo de reposición eso es la diferencia entre pedir en
 * dos minutos y pedir en veinte.
 *
 * **Por qué no hay ninguna key hardcodeada acá.** La lista canónica es
 * `app/data/metafields.js` (ver AGENTS.md). Este módulo solo sabe *cómo* se
 * muestra un metafield, nunca *cuál*: apuntar el `.env` a otra tienda y ajustar
 * esa lista tiene que alcanzar. Una tienda sin metafields no rompe, simplemente
 * no muestra specs.
 */

/**
 * Tipos que se pueden mostrar tal cual, sin resolver referencias.
 *
 * Quedan afuera a propósito `list.*` y `*_reference`: se serializan como gids
 * (`gid://shopify/Metaobject/123`) y necesitan una query aparte para volverse
 * texto. Mostrarlos crudos sería peor que no mostrarlos. El caso concreto en la
 * tienda de demo es `shopify.color-pattern`, que además ya está cubierto por el
 * filtro de Color.
 */
const TEXT_TYPES = new Set([
  'single_line_text_field',
  'multi_line_text_field',
  'number_integer',
  'number_decimal',
]);

/** Tipos que Shopify serializa como JSON con valor y unidad. */
const MEASURE_TYPES = new Set(['dimension', 'weight', 'volume']);

/**
 * Convierte un metafield en el texto que va en pantalla.
 *
 * Devuelve `null` cuando no se puede mostrar, y el llamador lo descarta: es
 * preferible una columna menos a una celda con un gid adentro.
 *
 * @param {{type?: string, value?: string}} metafield
 * @returns {string|null}
 */
export function formatSpecValue(metafield) {
  const {type, value} = metafield ?? {};
  if (!value) return null;

  if (TEXT_TYPES.has(type)) return value.trim() || null;

  if (type === 'boolean') return value === 'true' ? '✓' : '—';

  if (MEASURE_TYPES.has(type)) {
    try {
      const parsed = JSON.parse(value);
      if (parsed?.value == null) return null;
      return `${parsed.value}${parsed.unit ? ` ${parsed.unit}` : ''}`;
    } catch (error) {
      // Dato inesperado: mejor sin spec que con un JSON crudo en la tabla.
      return null;
    }
  }

  return null;
}

/**
 * Etiqueta de una spec.
 *
 * Busca primero en el diccionario (`metafields.<key>`), que es donde el negocio
 * elige cómo se llama cada cosa en cada idioma. Si no está, humaniza la key en
 * vez de no mostrar nada: una tienda nueva ve "Material" sin tocar i18n, y
 * traducirlo queda como mejora, no como requisito.
 *
 * `t()` devuelve string vacío cuando la key anidada no existe, así que el
 * chequeo es contra vacío y no contra la key.
 *
 * @param {{key: string}} metafield
 * @param {(key: string) => string} t
 */
export function getSpecLabel(metafield, t) {
  const translated = t(`metafields.${metafield.key}`);
  if (translated && translated !== `metafields.${metafield.key}`) {
    return translated;
  }
  return humanizeKey(metafield.key);
}

/**
 * `color_pattern` / `color-pattern` → `Color pattern`.
 *
 * @param {string} key
 */
function humanizeKey(key) {
  const words = String(key ?? '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

/**
 * Specs mostrables de un producto, en el orden de `allProductMetafields`.
 *
 * El orden sale de la lista canónica y no del orden en que Shopify devolvió los
 * metafields: así la columna "Material" cae siempre en el mismo lugar, producto
 * a producto y página a página. Una tabla cuyas columnas se mueven no sirve para
 * comparar, que es justamente para lo que existe.
 *
 * @param {{metafields?: Array<{namespace?: string, key?: string, type?: string, value?: string}>}} product
 * @param {(key: string) => string} t
 * @returns {Array<{id: string, key: string, label: string, value: string}>}
 */
export function getProductSpecs(product, t) {
  const present = new Map();

  for (const metafield of product?.metafields ?? []) {
    // La Storefront API devuelve null en la posición de cada identifier que la
    // tienda no tiene definido: es el caso normal en una plantilla, no un error.
    if (!metafield?.key) continue;
    present.set(`${metafield.namespace}.${metafield.key}`, metafield);
  }

  const specs = [];

  for (const {namespace, key} of allProductMetafields) {
    const metafield = present.get(`${namespace}.${key}`);
    if (!metafield) continue;

    const value = formatSpecValue(metafield);
    if (!value) continue;

    specs.push({
      id: `${namespace}.${key}`,
      key,
      label: getSpecLabel(metafield, t),
      value,
    });
  }

  return specs;
}

/**
 * Columnas de la tabla comparativa: la unión de las specs presentes en ESTA
 * página de resultados.
 *
 * Se calcula sobre los productos que se están mostrando y no sobre el catálogo
 * entero, porque una columna vacía para los doce productos de la página es ruido
 * que empuja al scroll horizontal sin aportar nada.
 *
 * @param {Array<object>} products
 * @param {(key: string) => string} t
 * @returns {Array<{id: string, label: string}>}
 */
export function getSpecColumns(products, t) {
  const columns = new Map();

  for (const product of products ?? []) {
    for (const spec of getProductSpecs(product, t)) {
      if (!columns.has(spec.id)) {
        columns.set(spec.id, {id: spec.id, label: spec.label});
      }
    }
  }

  return [...columns.values()];
}
