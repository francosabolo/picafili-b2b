import {
  applyDiscountChain,
  EMPTY_DISCOUNT_CONTEXT,
  resolveLineDiscounts,
} from '~/lib/discounts.js';
import {
  CATEGORY_KEY_SOURCE,
  ESTIMATED_TAX_RATE,
  MINIMUM_ORDER_AMOUNT,
  STORE_CURRENCY,
} from '~/lib/const.js';

/**
 * Reduce una variante a la línea mínima que necesita el presupuesto.
 *
 * El presupuesto vive en una cookie y las cookies mueren a los 4 KB. Guardando
 * la variante entera (con `quantityPriceBreaks`, `compareAtPrice`,
 * `selectedOptions`, dimensiones de imagen…) cada línea pesaba ~650 bytes: a
 * partir de la séptima el navegador descartaba la cookie **en silencio** y el
 * comprador perdía el pedido completo. Justo el escenario B2B.
 *
 * Solo se guarda lo que consumen el drawer, los totales y el draft order.
 *
 * @param {object} variant
 * @param {number} quantity
 */
export function toQuoteLine(variant, quantity = 1) {
  return {
    id: variant?.id,
    sku: variant?.sku,
    quantity,
    price: variant?.price
      ? {
          amount: variant.price.amount,
          currencyCode: variant.price.currencyCode,
        }
      : null,
    availableForSale: variant?.availableForSale,
    currentlyNotInStock: variant?.currentlyNotInStock,
    // Solo los dos campos que usa el stepper, no la regla entera.
    quantityRule: variant?.quantityRule
      ? {
          minimum: variant.quantityRule.minimum,
          increment: variant.quantityRule.increment,
          maximum: variant.quantityRule.maximum,
        }
      : null,
    // Los quiebres se guardan compactos porque el total depende de ellos. Sin
    // catálogos B2B configurados el array viene vacío y no ocupa nada.
    quantityPriceBreaks: (variant?.quantityPriceBreaks?.nodes ?? []).map(
      (tier) => ({
        minimumQuantity: tier.minimumQuantity,
        price: {amount: tier.price?.amount},
      }),
    ),
    // Descuentos cargados EN el presupuesto, por slot: {'discount-3': 15}.
    // Es un mapa y no un numero porque cuantos hay lo decide la tienda
    // (DISCOUNT_SLOTS). Los de acuerdo y categoria NO se guardan acá: se
    // resuelven al vuelo, porque son del acuerdo y del catalogo, no del
    // pedido. Congelarlos en la cookie haria que un cambio de acuerdo no se
    // reflejara en un presupuesto ya armado.
    discounts: {},
    // La CLAVE de categoría, no el porcentaje. La clave es un hecho del
    // catálogo —no cambia al renegociar un acuerdo— y ocupa unos bytes; el
    // porcentaje se resuelve al vuelo contra el contexto del servidor. Al
    // revés, un cambio de acuerdo no se reflejaría en un presupuesto ya armado.
    categoryKey: getCategoryKey(variant),
    image: variant?.image?.url
      ? {url: variant.image.url, altText: variant.image.altText ?? null}
      : null,
    product: {title: variant?.product?.title ?? null},
  };
}

/**
 * Precio unitario que corresponde a una línea según su cantidad.
 *
 * Con tier prices configurados el unitario depende de cuánto se lleva: usar
 * siempre el precio base hacía que el total del presupuesto no coincidiera con
 * lo que después cobra Shopify. Sin quiebres devuelve el precio de siempre.
 *
 * @param {{price?: object, quantity?: number, quantityPriceBreaks?: Array}} item
 */
/**
 * Clave de categoría de una variante, según lo que la tienda haya configurado.
 *
 * @param {object} variant
 * @returns {string|null}
 */
export function getCategoryKey(variant) {
  if (CATEGORY_KEY_SOURCE === 'productType') {
    return variant?.product?.productType || null;
  }
  return variant?.product?.collections?.nodes?.[0]?.handle ?? null;
}

/**
 * @param {object} item
 * @param {object} [discountContext]
 */
export function getLineUnitPrice(
  item,
  discountContext = EMPTY_DISCOUNT_CONTEXT,
) {
  const base = Number(item?.price?.amount ?? 0);
  const breaks = item?.quantityPriceBreaks ?? [];

  if (!breaks.length) return applyLineDiscount(base, item, discountContext);

  const quantity = Number(item?.quantity ?? 0);

  // El tramo vigente es el de mayor mínimo que la cantidad ya alcanzó.
  const tier = breaks
    .filter((entry) => quantity >= Number(entry?.minimumQuantity ?? 0))
    .sort((a, b) => b.minimumQuantity - a.minimumQuantity)[0];

  return applyLineDiscount(
    tier ? Number(tier.price?.amount ?? base) : base,
    item,
  );
}

/**
 * Aplica la cadena de descuentos sobre un unitario ya resuelto.
 *
 * Va DESPUES del tramo por cantidad, no en vez de: el quiebre es el precio de
 * catalogo para esa cantidad y los descuentos son concesiones sobre ese
 * precio. Al reves, un 10% sobre el precio de lista podria terminar dando MAS
 * caro que el tramo que le correspondia por volumen.
 *
 * @param {number} unit
 * @param {object} item
 */
function applyLineDiscount(unit, item, discountContext) {
  return applyDiscountChain(unit, resolveLineDiscounts(item, discountContext));
}

/**
 * Total de la nota de pedido a partir de los ítems cargados.
 *
 * @param {Array<{price?: {amount: string|number, currencyCode: string}, quantity: number}>} quoteItems
 * @returns {{amount: string, currencyCode: string}|null}
 */
export function getQuoteTotal(
  quoteItems = [],
  discountContext = EMPTY_DISCOUNT_CONTEXT,
) {
  if (!quoteItems.length) return null;

  const amount = quoteItems.reduce((total, item) => {
    const unit = getLineUnitPrice(item, discountContext);
    const quantity = Number(item?.quantity ?? 0);
    return total + unit * quantity;
  }, 0);

  return {
    amount: amount.toFixed(2),
    currencyCode: quoteItems[0]?.price?.currencyCode ?? STORE_CURRENCY,
  };
}

/**
 * Estado del pedido mínimo.
 *
 * Modo AVISO por decisión de negocio (E13 del backlog): informa cuánto falta
 * pero NO bloquea el envío — el equipo comercial resuelve los pedidos chicos.
 * Si algún día pasa a bloquear, este es el único lugar donde cambia la regla.
 *
 * @param {{amount: string, currencyCode: string}|null} total
 * @returns {{meetsMinimum: boolean, missing: {amount: string, currencyCode: string}|null,
 *   minimum: {amount: string, currencyCode: string}}|null}
 */
export function getMinimumOrderStatus(total) {
  if (!MINIMUM_ORDER_AMOUNT) return null;

  const currencyCode = total?.currencyCode ?? STORE_CURRENCY;
  const minimum = {
    amount: MINIMUM_ORDER_AMOUNT.toFixed(2),
    currencyCode,
  };

  const current = Number(total?.amount ?? 0);
  const missingAmount = MINIMUM_ORDER_AMOUNT - current;

  if (missingAmount <= 0) {
    return {meetsMinimum: true, missing: null, minimum};
  }

  return {
    meetsMinimum: false,
    missing: {amount: missingAmount.toFixed(2), currencyCode},
    minimum,
  };
}

/**
 * Unidades totales del presupuesto (no líneas).
 *
 * En mayorista el dato que importa es "88 u.", no "4 productos": el comprador
 * razona en unidades y bultos.
 *
 * @param {Array<{quantity?: number}>} quoteItems
 */
export function getQuoteUnits(quoteItems = []) {
  return quoteItems.reduce(
    (total, item) => total + Number(item?.quantity ?? 0),
    0,
  );
}

/**
 * Desglose del presupuesto: subtotal, impuesto estimado y total.
 *
 * El impuesto solo aparece si `ESTIMATED_TAX_RATE` está configurado. Está en
 * `null` a propósito mientras nadie confirme si los precios de Shopify ya
 * incluyen IVA: sumarlo sobre un precio que ya lo tiene infla el total 21%.
 *
 * @param {Array} quoteItems
 * @returns {{subtotal: object|null, tax: object|null, total: object|null,
 *   units: number, taxRate: number|null}}
 */
export function getQuoteTotals(
  quoteItems = [],
  discountContext = EMPTY_DISCOUNT_CONTEXT,
) {
  const subtotal = getQuoteTotal(quoteItems, discountContext);
  const units = getQuoteUnits(quoteItems);

  if (!subtotal || !ESTIMATED_TAX_RATE) {
    return {subtotal, tax: null, total: subtotal, units, taxRate: null};
  }

  const base = Number(subtotal.amount);
  const taxAmount = base * ESTIMATED_TAX_RATE;

  return {
    subtotal,
    tax: {amount: taxAmount.toFixed(2), currencyCode: subtotal.currencyCode},
    total: {
      amount: (base + taxAmount).toFixed(2),
      currencyCode: subtotal.currencyCode,
    },
    units,
    taxRate: ESTIMATED_TAX_RATE,
  };
}

/**
 * Cómo se vende la variante, para mostrarlo junto al SKU ("caja x6 u.").
 *
 * Sale de `quantityRule.increment`: si la tienda no configuró bultos el
 * incremento es 1 y no hay nada que decir, así que devuelve null en vez de
 * ensuciar la fila con "caja x1 u.".
 *
 * @param {{quantityRule?: {increment?: number}}} item
 */
export function getPackagingLabel(item) {
  const increment = Number(item?.quantityRule?.increment ?? 1);
  return increment > 1 ? increment : null;
}
