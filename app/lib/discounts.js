import {
  CATEGORY_DISCOUNTS_ENABLED,
  DISCOUNT_SLOTS,
  DISCOUNT_STACK_MODE,
  MAX_LINE_DISCOUNT,
} from '~/lib/const.js';

/**
 * Cadena de descuentos de una línea de presupuesto.
 *
 * En mayorista el precio final casi nunca sale de un solo descuento: el
 * cliente tiene el suyo por acuerdo comercial (a veces dos, negociados en
 * momentos distintos), encima hay descuentos por categoría de producto, y
 * arriba de todo el vendedor puede conceder algo puntual para cerrar el
 * pedido.
 *
 * Por eso el descuento se modela como una **lista con origen**, no como un
 * número. Un número no se puede explicar, y en B2B el comprador pregunta de
 * dónde sale cada punto — sobre todo cuando el total no coincide con el que
 * tenía anotado.
 *
 * **Cuántos son y cómo se llaman es configuración de tienda**: sale de
 * `DISCOUNT_SLOTS` en `app/lib/const.js`. Este módulo no conoce ningún
 * descuento en particular, solo recorre la lista.
 *
 * Nota útil: en modo cascada el **orden no cambia el resultado** —es una
 * multiplicación, y la multiplicación es conmutativa—. El orden de la cadena
 * es una decisión de LECTURA, no de cálculo. En modo aditivo tampoco cambia.
 */

/** @typedef {{id: string, labelKey?: string, label?: string, percent: number, source: string}} Discount */

/**
 * @typedef {{customerDiscounts: Record<string, number>,
 *   categoryDiscounts: Record<string, {percent: number, label?: string, labelKey?: string}>,
 *   source: string}} DiscountContext
 */

/**
 * Contexto vacío: **sin descuentos**.
 *
 * Es el default de todas las funciones que reciben contexto, a propósito. Si un
 * llamador se olvida de pasarlo no se aplica ningún descuento — un olvido tiene
 * que costar de menos, nunca de más. Y es también lo que hay que devolver ante
 * cualquier fallo al resolverlo: **fail-closed, nunca un descuento inventado**.
 */
export const EMPTY_DISCOUNT_CONTEXT = Object.freeze({
  customerDiscounts: Object.freeze({}),
  categoryDiscounts: Object.freeze({}),
  source: 'none',
});

/**
 * Normaliza un porcentaje suelto.
 *
 * Se valida en un solo lugar porque el mismo número viaja del input al total,
 * del total al draft order y de ahí a Shopify: si cada capa lo interpreta a su
 * manera, el presupuesto que ve el cliente y la orden que ve el comercial
 * dejan de coincidir.
 *
 * @param {unknown} value
 */
export function clampDiscount(value) {
  const percent = Math.round(Number(value) || 0);
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.min(percent, MAX_LINE_DISCOUNT);
}

/**
 * Descuento efectivo de una cadena, en %.
 *
 * El modo lo define el negocio (`DISCOUNT_STACK_MODE`) porque cambia lo que se
 * cobra: dos del 10% dan 19% en cascada y 20% sumados.
 *
 * @param {Array<Discount>} chain
 * @returns {number} porcentaje efectivo, redondeado a 2 decimales
 */
export function getEffectiveDiscount(chain = []) {
  const percents = chain
    .map((discount) => clampDiscount(discount?.percent))
    .filter(Boolean);

  if (!percents.length) return 0;

  if (DISCOUNT_STACK_MODE === 'additive') {
    return Math.min(
      100,
      Number(percents.reduce((total, p) => total + p, 0).toFixed(2)),
    );
  }

  const remaining = percents.reduce((factor, p) => factor * (1 - p / 100), 1);
  return Number(((1 - remaining) * 100).toFixed(2));
}

/**
 * Aplica la cadena sobre un precio unitario.
 *
 * @param {number} unit
 * @param {Array<Discount>} chain
 */
export function applyDiscountChain(unit, chain = []) {
  const effective = getEffectiveDiscount(chain);
  return effective ? unit * (1 - effective / 100) : unit;
}

/**
 * Slots que puede editar un rol desde la pantalla de presupuesto.
 *
 * @param {string} [roleId] id del estado de cuenta (`sales_rep`, …)
 */
export function getEditableSlots(roleId) {
  if (!roleId) return [];
  return DISCOUNT_SLOTS.filter((slot) => slot.editableBy === roleId);
}

/**
 * Resuelve la cadena de descuentos que le corresponde a una línea.
 *
 * Recorre `DISCOUNT_SLOTS` en orden: el negocio decide cuántos hay y cómo se
 * llaman, este módulo solo los junta.
 *
 * Los de `customer` y `category` salen del **contexto resuelto en el servidor**,
 * no del ítem: son del acuerdo y del catálogo, no del pedido. Por eso llegan por
 * parámetro y no viajan en la cookie — si se congelaran ahí, un cambio de
 * acuerdo no se reflejaría en un presupuesto ya armado.
 *
 * ⚠️ Este contexto alimenta **solo el presupuesto**. Aplicarlo a los precios del
 * carrito haría que el total mostrado no coincida con el que cobra el checkout:
 * el carrito lo liquida Shopify con SUS precios. Ver `docs/arquitectura.md` §4.
 *
 * @param {object} item línea del presupuesto (`item.discounts` = {slotId: %})
 * @param {DiscountContext} [context]
 * @returns {Array<Discount>}
 */
export function resolveLineDiscounts(item, context = EMPTY_DISCOUNT_CONTEXT) {
  const chain = [];

  for (const slot of DISCOUNT_SLOTS) {
    const percent = clampDiscount(
      slot.source === 'quote'
        ? item?.discounts?.[slot.id]
        : context.customerDiscounts?.[slot.id],
    );

    if (percent) {
      chain.push({
        id: slot.id,
        labelKey: slot.labelKey,
        percent,
        source: slot.source,
      });
    }
  }

  // Por CLAVE, no recorriendo una lista: la línea sabe a qué categoría
  // pertenece (`categoryKey`) y el contexto sabe cuánto descuenta cada una.
  if (CATEGORY_DISCOUNTS_ENABLED && item?.categoryKey) {
    const discount = context.categoryDiscounts?.[item.categoryKey];
    const percent = clampDiscount(discount?.percent);

    if (percent) {
      chain.push({
        id: `category-${item.categoryKey}`,
        labelKey: discount.labelKey ?? 'discounts.category',
        label: discount.label,
        percent,
        source: 'category',
      });
    }
  }

  return chain;
}
